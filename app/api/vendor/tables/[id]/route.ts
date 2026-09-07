import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { TABLE_STATUSES } from "@/lib/constants";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const table = await prisma.table.findUnique({ where: { id: params.id } });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(table.shopId);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const status: string | undefined = body?.status;
  if (status && !TABLE_STATUSES.includes(status as (typeof TABLE_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.table.update({
    where: { id: params.id },
    data: { ...(status ? { status } : {}) },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const table = await prisma.table.findUnique({ where: { id: params.id } });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(table.shopId);
  if ("error" in auth) return auth.error;

  await prisma.table.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
