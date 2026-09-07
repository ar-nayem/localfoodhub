import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const code: string | undefined = body?.code?.trim();
  const subtotal: number | undefined = body?.subtotal;

  if (!shopId || !code || typeof subtotal !== "number") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const promo = await prisma.promotion.findFirst({ where: { shopId, code, active: true } });
  if (!promo) {
    return NextResponse.json({ error: "Promo code not found or inactive" }, { status: 404 });
  }
  const now = new Date();
  if (promo.startsAt && now < promo.startsAt) {
    return NextResponse.json({ error: "This promo hasn't started yet" }, { status: 400 });
  }
  if (promo.endsAt && now > promo.endsAt) {
    return NextResponse.json({ error: "This promo has expired" }, { status: 400 });
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return NextResponse.json({ error: "This promo has reached its usage limit" }, { status: 400 });
  }
  if (subtotal < promo.minOrder) {
    return NextResponse.json({ error: `Minimum order for this promo is ৳${promo.minOrder}` }, { status: 400 });
  }

  const discountAmount =
    promo.type === "PERCENT" ? Math.round((subtotal * promo.value) / 100) : Math.min(promo.value, subtotal);

  return NextResponse.json({ code: promo.code, type: promo.type, value: promo.value, discountAmount });
}
