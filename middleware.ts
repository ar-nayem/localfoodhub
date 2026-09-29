import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { classifyHost, originFor, type AppSurface } from "@/lib/hosts";
import { canonicalLocation } from "@/lib/hostRouting";

// Edge-runtime gate for two things: which hostname may serve which part of the site, and
// the role guards on /vendor/* and /admin/* (spec Section 30/9 — customers must never reach
// vendor/admin functionality). Uses `jose` directly rather than lib/auth.ts's getSession()
// because middleware can't call next/headers' cookies() helper the same way route handlers
// can, and `jose` (unlike bcryptjs) is Edge-safe.
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-insecure-secret");
const STAFF_ROLES = ["SHOP_OWNER", "SHOP_STAFF", "KITCHEN_STAFF"];
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

/** Vendor pages that work without a session — the app's own sign-in and sign-up. */
const VENDOR_PUBLIC_PATHS = ["/vendor/login", "/vendor/apply"];

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** Use the configured public origin for local paths; req.url can be the proxy bind URL.
 * An unconfigured host retains the existing request-relative single-host fallback. */
function redirectTo(req: NextRequest, location: string, surface: AppSurface): NextResponse {
  return NextResponse.redirect(new URL(location, originFor(surface) ?? req.url), 307);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const surface = classifyHost(req.headers.get("host"));

  // ---- Canonical hostname routing ----
  const location = canonicalLocation(surface, pathname, search);
  if (location) {
    // In local/proxy configurations a different surface's public URL can be the bind
    // origin. Next makes that Location relative, returning to the original public host
    // forever. Preserve the local fallback while still applying the role gates below.
    const collapsesToCurrentHost = !location.startsWith("/") && new URL(location).origin === req.nextUrl.origin;
    if (!collapsesToCurrentHost) return redirectTo(req, location, surface);
  }

  // ---- Role guards ----
  const isVendor = under(pathname, "/vendor") && !VENDOR_PUBLIC_PATHS.some((p) => under(pathname, p));
  const isAdmin = under(pathname, "/admin");
  if (!isVendor && !isAdmin) return NextResponse.next();

  // Every prior cookie name, for the same reason as lib/auth.ts: a rename must not sign
  // anyone out. Keep this list in sync with LEGACY_SESSION_COOKIES there by hand — this
  // file can't import it (Edge runtime, no Prisma-importing module in its graph).
  const token =
    req.cookies.get("shokherkhabar_session")?.value ??
    req.cookies.get("foodivo_session")?.value ??
    req.cookies.get("lfh_session")?.value;
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
    // Shop owners have their own sign-in; admins use /login on the admin hostname.
    const loginPath = isVendor ? "/vendor/login" : "/login";
    return redirectTo(req, `${loginPath}?next=${encodeURIComponent(pathname)}`, surface);
  }
  return NextResponse.next();
}

// Page routes only. Excluded: Next internals, /api (each handler authorises itself), public
// asset folders, and anything with a file extension (manifest, sw.js, offline.html,
// assetlinks.json — the last two need to answer on all three hostnames untouched).
export const config = {
  matcher: ["/((?!_next/|api/|icons/|uploads/|.*\\..*).*)"],
};
