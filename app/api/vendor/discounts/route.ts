import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { PROMOTION_TYPES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const promotions = await prisma.promotion.findMany({
    where: { shopId: shopId! },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(promotions);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const { code, title, type, value, minOrder, usageLimit, startsAt, endsAt, imageUrl } = body ?? {};
  if (!title || !PROMOTION_TYPES.includes(type) || typeof value !== "number") {
    return NextResponse.json({ error: "Invalid discount" }, { status: 400 });
  }

  const promotion = await prisma.promotion.create({
    data: {
      shopId: shopId!,
      code: code || null,
      title,
      type,
      value,
      imageUrl: imageUrl || null,
      minOrder: minOrder || 0,
      usageLimit: usageLimit || null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
  return NextResponse.json(promotion, { status: 201 });
}
