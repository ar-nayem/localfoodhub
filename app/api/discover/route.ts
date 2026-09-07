import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRICE_BUCKETS } from "@/lib/constants";
import { safeJsonParse } from "@/lib/utils";

// Explore's recommendation engine (spec Section 108-111, 120-126). Builds the full
// eligible pool from the quiz answers, then does a rating-weighted random pick from
// whatever hasn't been shown yet this session — small/new shops still get real odds
// (weight is 1 + a mild rating bonus, never rating alone), matching the "fair vendor
// exposure" requirement rather than always surfacing the top-rated shop.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const budgetKey = params.get("budget"); // "budget" | "mid" | "premium" | null (any)
  const mode = params.get("mode"); // delivery | pickup | dine-in | null
  const locationId = params.get("location");
  const moods = (params.get("moods") || "").split(",").filter(Boolean);
  const exclude = new Set((params.get("exclude") || "").split(",").filter(Boolean));

  const bucket = PRICE_BUCKETS.find((b) => b.key === budgetKey);

  const products = await prisma.product.findMany({
    where: {
      status: "AVAILABLE",
      discoveryEligible: true,
      shop: {
        status: "ACTIVE",
        discoveryEnabled: true,
        ...(mode === "delivery" ? { supportsDelivery: true } : {}),
        ...(mode === "pickup" ? { supportsPickup: true } : {}),
        ...(mode === "dine-in" ? { supportsDineIn: true } : {}),
        ...(locationId ? { locationId } : {}),
      },
    },
    include: { shop: true, category: true },
  });

  const eligible = products.filter((p) => {
    const price = p.discountPrice ?? p.price;
    if (bucket) {
      if (bucket.min !== undefined && price < bucket.min) return false;
      if (bucket.max !== undefined && price > bucket.max) return false;
    }
    if (moods.length > 0) {
      const tags = safeJsonParse<string[]>(p.dietaryTags, []).map((t) => t.toLowerCase());
      const haystack = `${p.category.name} ${p.name} ${p.description}`.toLowerCase();
      const matches = moods.some((m) => tags.includes(m) || haystack.includes(m));
      if (!matches) return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return NextResponse.json({ empty: true, reason: "no_matches" });
  }

  const remaining = eligible.filter((p) => !exclude.has(p.id));
  if (remaining.length === 0) {
    return NextResponse.json({ empty: true, reason: "exhausted", totalSeen: exclude.size });
  }

  const weights = remaining.map((p) => 1 + p.shop.rating * 0.5 + Math.random() * 2);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * totalWeight;
  let picked = remaining[0];
  for (let i = 0; i < remaining.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      picked = remaining[i];
      break;
    }
  }

  await prisma.discoveryEvent.create({
    data: { productId: picked.id, shopId: picked.shopId, action: "SHOWN" },
  });

  const whyPicked: string[] = [];
  if (bucket) whyPicked.push("Fits your budget");
  if (moods.length > 0) whyPicked.push("Matches what you're feeling like");
  if (picked.discountPrice) whyPicked.push("Discounted right now");
  if (picked.shop.rating >= 4.5) whyPicked.push("Highly rated nearby");
  if (whyPicked.length === 0) whyPicked.push("Available right now");

  return NextResponse.json({
    empty: false,
    product: {
      id: picked.id,
      name: picked.name,
      description: picked.description,
      price: picked.price,
      discountPrice: picked.discountPrice,
      imageUrl: picked.imageUrl,
      prepTimeMinutes: picked.prepTimeMinutes,
    },
    shop: {
      id: picked.shop.id,
      slug: picked.shop.slug,
      name: picked.shop.name,
      rating: picked.shop.rating,
      supportsDelivery: picked.shop.supportsDelivery,
      supportsPickup: picked.shop.supportsPickup,
      supportsDineIn: picked.shop.supportsDineIn,
    },
    whyPicked,
    remainingInPool: remaining.length - 1,
  });
}
