import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(category.shopId);
  if ("error" in auth) return auth.error;

  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(category.shopId);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const updated = await prisma.category.update({
    where: { id: params.id },
    data: { name: body?.name ?? category.name },
  });
  return NextResponse.json(updated);
}
