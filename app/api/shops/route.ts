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

  const shops = await prisma.shop.findMany({
    where: {
      status: "ACTIVE",
      ...(locationId ? { locationId } : {}),
      ...(category ? { category } : {}),
      ...(mode === "delivery" ? { supportsDelivery: true } : {}),
      ...(mode === "pickup" ? { supportsPickup: true } : {}),
      ...(mode === "dine-in" ? { supportsDineIn: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { category: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    include: { location: true, _count: { select: { products: true } } },
    orderBy: { rating: "desc" },
  });

  return NextResponse.json(shops);
}
