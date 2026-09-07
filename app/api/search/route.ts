import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Global search across shops + food items (spec Section 44).
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ shops: [], products: [] });

  const [shops, products] = await Promise.all([
    prisma.shop.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ name: { contains: q } }, { category: { contains: q } }],
      },
      take: 8,
    }),
    prisma.product.findMany({
      where: {
        status: "AVAILABLE",
        shop: { status: "ACTIVE" },
        OR: [{ name: { contains: q } }, { description: { contains: q } }],
      },
      include: { shop: { select: { slug: true, name: true } } },
      take: 12,
    }),
  ]);

  return NextResponse.json({ shops, products });
}
