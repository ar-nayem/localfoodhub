import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/schemas";
import type { Role } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { shopStaff: { select: { shopId: true } } },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    shopIds: user.shopStaff.map((s) => s.shopId),
  });

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
