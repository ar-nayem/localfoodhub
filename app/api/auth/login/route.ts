import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, sessionCookieOptions, isStaffRole, SESSION_COOKIE_NAME } from "@/lib/auth";
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
  // An account created by OTP has no password at all — it must fail here rather than
  // reach bcrypt with a null hash, and the message stays identical to a wrong password so
  // this doesn't become a way to probe which accounts are OTP-only.
  if (!user || !user.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // The Business app sends `app: "business"`. It is for shop accounts only, so a customer
  // account is turned away here rather than signed in to a app it can't use — which would
  // leave it holding a session that the vendor pages immediately bounce back to sign-in.
  // The flag can only make sign-in stricter, never grant anything, so trusting the client
  // to send it is safe.
  if (body?.app === "business" && !isStaffRole(user.role as Role)) {
    return NextResponse.json(
      { error: "This is a customer account. Use the শখের খাবার app to order, or apply to join with your shop." },
      { status: 403 }
    );
  }

  const token = await signSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email ?? "",
    shopIds: user.shopStaff.map((s) => s.shopId),
  });

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
