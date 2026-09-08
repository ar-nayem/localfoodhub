import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRICE_BUCKETS } from "@/lib/constants";
import { safeJsonParse } from "@/lib/utils";
import { haversineKm } from "@/lib/location/distance";

// Explore's recommendation engine (spec Section 108-111, 120-126). Builds the full
// eligible pool from the quiz answers, then does a rating-weighted random pick from
// whatever hasn't been shown yet this session — small/new shops still get real odds
// (weight is 1 + a mild rating bonus, never rating alone), matching the "fair vendor
// exposure" requirement rather than always surfacing the top-rated shop. When the
// customer's coordinates are available, distance folds into that same weight as a mild
// bonus (closer = more likely), not a hard filter — Explore stays a surprise, it just
// leans toward what's actually nearby.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const budgetKey = params.get("budget"); // "budget" | "mid" | "premium" | null (any)
  const mode = params.get("mode"); // delivery | pickup | dine-in | null
  const locationId = params.get("location");
  const moods = (params.get("moods") || "").split(",").filter(Boolean);
  const exclude = new Set((params.get("exclude") || "").split(",").filter(Boolean));
  const lat = params.get("lat") ? Number(params.get("lat")) : null;
  const lng = params.get("lng") ? Number(params.get("lng")) : null;
  const hasOrigin = lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng);

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

  const weights = remaining.map((p) => {
    let w = 1 + p.shop.rating * 0.5 + Math.random() * 2;
    if (hasOrigin && p.shop.latitude != null && p.shop.longitude != null) {
      const km = haversineKm(lat!, lng!, p.shop.latitude, p.shop.longitude);
      // A shop across town still has real odds — this is a lean, not a cutoff. 3km ≈ the
      // point the nearness bonus has mostly faded out.
      w += Math.max(0, 2 - km / 1.5);
    }
    return w;
  });
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

  const pickedDistanceKm =
    hasOrigin && picked.shop.latitude != null && picked.shop.longitude != null
      ? haversineKm(lat!, lng!, picked.shop.latitude, picked.shop.longitude)
      : null;

  const whyPicked: string[] = [];
  if (bucket) whyPicked.push("Fits your budget");
  if (moods.length > 0) whyPicked.push("Matches what you're feeling like");
  if (picked.discountPrice) whyPicked.push("Discounted right now");
  if (pickedDistanceKm !== null && pickedDistanceKm < 1) whyPicked.push("Just around the corner");
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
      distanceKm: pickedDistanceKm,
      supportsDelivery: picked.shop.supportsDelivery,
      supportsPickup: picked.shop.supportsPickup,
      supportsDineIn: picked.shop.supportsDineIn,
    },
    whyPicked,
    remainingInPool: remaining.length - 1,
  });
}
