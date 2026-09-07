import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Edge-runtime route guard for /vendor/* and /admin/* (spec Section 30/9 — customers
// must never reach vendor/admin functionality). Uses `jose` directly rather than
// lib/auth.ts's getSession() because middleware can't call next/headers' cookies()
// helper the same way route handlers can, and `jose` (unlike bcryptjs) is Edge-safe.
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-insecure-secret");
const STAFF_ROLES = ["SHOP_OWNER", "SHOP_STAFF", "KITCHEN_STAFF"];
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isVendor = pathname.startsWith("/vendor");
  const isAdmin = pathname.startsWith("/admin");
  if (!isVendor && !isAdmin) return NextResponse.next();

  const token = req.cookies.get("lfh_session")?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      role = (payload as { role?: string }).role ?? null;
    } catch {
      role = null;
    }
  }

  const allowed = isAdmin ? ADMIN_ROLES : STAFF_ROLES;
  if (!role || !allowed.includes(role)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/vendor/:path*", "/admin/:path*"],
};
