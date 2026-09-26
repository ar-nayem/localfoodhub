import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { BUSINESS_ORIGIN, CUSTOMER_ORIGIN, isBusinessHost } from "@/lib/hosts";

// Edge-runtime gate for two things: which hostname may serve which part of the site, and
// the role guards on /vendor/* and /admin/* (spec Section 30/9 — customers must never reach
// vendor/admin functionality). Uses `jose` directly rather than lib/auth.ts's getSession()
// because middleware can't call next/headers' cookies() helper the same way route handlers
// can, and `jose` (unlike bcryptjs) is Edge-safe.
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-insecure-secret");
const STAFF_ROLES = ["SHOP_OWNER", "SHOP_STAFF", "KITCHEN_STAFF"];
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

/** Pages the Business hostname serves itself. Everything else is customer or admin
 * territory and is sent to the customer site rather than rendered here, so the Business
 * app stays a shop-owner app instead of a second copy of the whole marketplace.
 * `/q` stays local so scanning an order QR inside the Business app is verified against the
 * shop's own session. Static assets and /api never reach this function (see `matcher`). */
const BUSINESS_HOST_PATHS = ["/vendor", "/q", "/privacy", "/terms", "/delete-account"];

/** Vendor pages that work without a session — the app's own sign-in and sign-up. */
const VENDOR_PUBLIC_PATHS = ["/vendor/login", "/vendor/apply"];

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** Redirect to a path on the host the browser is already on, or to an absolute URL on
 * another host. Paths resolve against `req.url`, which behind the production proxy is the
 * app's internal bind address (see the note on appBaseUrl()) — Next rewrites any Location
 * on that internal origin into a relative one, so the browser stays on its own hostname. */
function redirectTo(req: NextRequest, location: string): NextResponse {
  return NextResponse.redirect(new URL(location, req.url), 307);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host");

  // ---- Hostname split (only when a Business hostname is configured) ----
  if (BUSINESS_ORIGIN) {
    if (isBusinessHost(host)) {
      if (pathname === "/") return redirectTo(req, "/vendor");
      if (pathname === "/login") return redirectTo(req, `/vendor/login${search}`);
      if (pathname === "/apply") return redirectTo(req, `/vendor/apply${search}`);
      // Skipped when the customer origin IS the internal one (only in local dev, where the
      // customer site is http://localhost:<port>): Next would turn that Location into a
      // relative path, which lands back on this host — a redirect loop. Serving the page
      // here is the harmless fallback.
      const customerReachable = CUSTOMER_ORIGIN && CUSTOMER_ORIGIN !== req.nextUrl.origin;
      if (customerReachable && !BUSINESS_HOST_PATHS.some((base) => under(pathname, base))) {
        return redirectTo(req, `${CUSTOMER_ORIGIN}${pathname}${search}`);
      }
    } else {
      // Customer hostname: shop-owner pages live on the Business hostname now. Old
      // bookmarks and links (including the shop-signup link on the login page and on
      // registration QR codes) keep working by following this redirect.
      if (under(pathname, "/vendor")) return redirectTo(req, `${BUSINESS_ORIGIN}${pathname}${search}`);
      if (pathname === "/apply") return redirectTo(req, `${BUSINESS_ORIGIN}/vendor/apply${search}`);
    }
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
    // Shop owners have their own sign-in inside the Business app; /login is the customers'.
    const loginPath = isVendor ? "/vendor/login" : "/login";
    return redirectTo(req, `${loginPath}?next=${encodeURIComponent(pathname)}`);
  }
  return NextResponse.next();
}

// Page routes only. Excluded: Next internals, /api (each handler authorises itself), public
// asset folders, and anything with a file extension (manifest, sw.js, offline.html,
// assetlinks.json — the last two need to answer on both hostnames untouched).
export const config = {
  matcher: ["/((?!_next/|api/|icons/|uploads/|.*\\..*).*)"],
};
