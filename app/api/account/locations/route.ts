import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { upsertLocationSchema } from "@/lib/validation/schemas";

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

  const row = await prisma.address.create({ data: { ...parsed.data, userId: session.userId } });
  return NextResponse.json(row, { status: 201 });
}
