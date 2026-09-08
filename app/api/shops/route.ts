import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineKm } from "@/lib/location/distance";

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

  // Customer coordinates, when the caller has them (Explore map, "near me" sort). Shops
  // without their own coordinates just fall out of distance sort/radius filtering rather
  // than crashing the request — not every seeded shop has been geo-tagged yet.
  const lat = params.get("lat") ? Number(params.get("lat")) : null;
  const lng = params.get("lng") ? Number(params.get("lng")) : null;
  const radiusKm = params.get("radiusKm") ? Number(params.get("radiusKm")) : null;
  const hasOrigin = lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng);

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

  if (!hasOrigin) {
    return NextResponse.json(shops.map((s) => ({ ...s, distanceKm: null })));
  }

  const withDistance = shops
    .map((s) => ({
      ...s,
      distanceKm: s.latitude != null && s.longitude != null ? haversineKm(lat!, lng!, s.latitude, s.longitude) : null,
    }))
    .filter((s) => radiusKm === null || s.distanceKm === null || s.distanceKm <= radiusKm)
    // Shops without coordinates keep whatever rating-based position they had — they
    // don't get hidden, just pushed after everything we can actually measure.
    .sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

  return NextResponse.json(withDistance);
}
