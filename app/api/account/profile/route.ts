import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const profileSchema = z.object({
  // Date-only string; anything unparseable is rejected rather than silently stored as an
  // Invalid Date, which would then poison every age bracket it landed in.
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, phone: true, dateOfBirth: true },
  });
  return NextResponse.json({
    ...user,
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  let dateOfBirth: Date | null = null;
  if (parsed.data.dateOfBirth) {
    dateOfBirth = new Date(`${parsed.data.dateOfBirth}T00:00:00Z`);
    const year = dateOfBirth.getUTCFullYear();
    if (Number.isNaN(dateOfBirth.getTime()) || year < 1900 || dateOfBirth > new Date()) {
      return NextResponse.json({ error: "Enter a real date of birth" }, { status: 400 });
    }
  }

  await prisma.user.update({ where: { id: session.userId }, data: { dateOfBirth } });
  return NextResponse.json({ ok: true });
}
