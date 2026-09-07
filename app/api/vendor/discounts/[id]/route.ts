import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const promo = await prisma.promotion.findUnique({ where: { id: params.id } });
  if (!promo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(promo.shopId);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const updated = await prisma.promotion.update({
    where: { id: params.id },
    data: { ...(typeof body?.active === "boolean" ? { active: body.active } : {}) },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const promo = await prisma.promotion.findUnique({ where: { id: params.id } });
  if (!promo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(promo.shopId);
  if ("error" in auth) return auth.error;

  await prisma.promotion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
