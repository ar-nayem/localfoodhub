import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Saved locations (spec: Home/Work/Family/...) — reuses the Address model, which already
// carries everything this needs (label, place, recipient identity) rather than a
// parallel table. Signed-in customers only: a guest has no account to save these against.
const upsertLocationSchema = z.object({
  label: z.string().min(1).max(40),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
  recipientName: z.string().max(100).optional(),
  recipientPhone: z.string().max(30).optional(),
});

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
