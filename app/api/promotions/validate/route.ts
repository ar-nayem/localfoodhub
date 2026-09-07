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

  const discountAmount =
    promo.type === "PERCENT" ? Math.round((subtotal * promo.value) / 100) : Math.min(promo.value, subtotal);

  return NextResponse.json({ code: promo.code, type: promo.type, value: promo.value, discountAmount });
}
