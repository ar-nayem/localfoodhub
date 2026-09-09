import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { upsertLocationSchema } from "@/lib/validation/schemas";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.address.findUnique({ where: { id: params.id } });
  if (!row || row.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = upsertLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid location" }, { status: 400 });
  }

  const updated = await prisma.address.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.address.findUnique({ where: { id: params.id } });
  if (!row || row.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.address.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
