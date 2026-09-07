import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public shop discovery — spec Section 8. Supports the filter set the Explore page needs;
// unrecognized filters are ignored rather than erroring (keeps this endpoint forgiving).
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const locationId = params.get("location") || undefined;
  const mode = params.get("mode"); // delivery | pickup | dine-in
  const category = params.get("category") || undefined;
  // "Offers" — shops running a live promo code or holding a discounted item right now.
  const deals = params.get("deals") === "1";
  const now = new Date();

  const shops = await prisma.shop.findMany({
    where: {
      status: "ACTIVE",
      ...(locationId ? { locationId } : {}),
      ...(category ? { category } : {}),
      ...(mode === "delivery" ? { supportsDelivery: true } : {}),
      ...(mode === "pickup" ? { supportsPickup: true } : {}),
      ...(mode === "dine-in" ? { supportsDineIn: true } : {}),
      // Each filter is its own AND clause — two bare `OR` keys would overwrite each
      // other, silently dropping whichever filter was written first.
      AND: [
        ...(deals
          ? [
              {
                OR: [
                  {
                    promotions: {
                      some: {
                        active: true,
                        AND: [
                          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
                        ],
                      },
                    },
                  },
                  { products: { some: { status: "AVAILABLE", discountPrice: { not: null } } } },
                ],
              },
            ]
          : []),
        ...(q
          ? [
              {
                OR: [
                  { name: { contains: q } },
                  { category: { contains: q } },
                  { description: { contains: q } },
                  { products: { some: { name: { contains: q }, status: "AVAILABLE" } } },
                ],
              },
            ]
          : []),
      ],
    },
    include: { location: true, _count: { select: { products: true } } },
    orderBy: { rating: "desc" },
  });

  return NextResponse.json(shops);
}
