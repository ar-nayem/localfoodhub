import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { upsertLocationSchema } from "@/lib/validation/schemas";
import { clearOtherDefaults } from "@/lib/account/addresses";

// Signed-in customers only: a guest has no account to save these against.

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = upsertLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid location" }, { status: 400 });
  }

  // The very first saved address becomes the default automatically — there's nothing to
  // choose between yet, and requiring a separate "set as default" tap for address #1 would
  // just be friction with an obvious answer.
  const existingCount = await prisma.address.count({ where: { userId: session.userId } });
  const makeDefault = parsed.data.isDefault === true || existingCount === 0;

  if (makeDefault) await clearOtherDefaults(session.userId);
  const row = await prisma.address.create({
    data: { ...parsed.data, isDefault: makeDefault, userId: session.userId },
  });
  return NextResponse.json(row, { status: 201 });
}
