import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { registerSchema } from "@/lib/validation/schemas";
import type { Role } from "@/lib/constants";

// Public customer registration. Guest checkout means this is optional, not required
// before ordering (spec Section 43) — offered after checkout or from /register directly.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, email, password, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password), role: "CUSTOMER" },
  });

  const token = await signSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    shopIds: [],
  });

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
