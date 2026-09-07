import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const shop = await prisma.shop.findUnique({
    where: { slug: params.slug },
    include: {
      location: true,
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            where: { status: { not: "HIDDEN" } },
            orderBy: { sortOrder: "asc" },
            include: { options: { include: { values: true } }, addons: true },
          },
        },
      },
    },
  });

  if (!shop || shop.status !== "ACTIVE") {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  return NextResponse.json(shop);
}
