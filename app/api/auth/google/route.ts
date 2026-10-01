import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleAuthConfigured,
  googleAuthorizeUrl,
  googleAuthOrigin,
  safeGoogleReturnPath,
  GOOGLE_STATE_COOKIE,
  GOOGLE_RETURN_COOKIE,
} from "@/lib/auth/google";
import { isBusinessHost } from "@/lib/hosts";

// Starts the sign-in: mint a state value, stash it in an httpOnly cookie, and hand the
// browser to Google. The callback only proceeds if the state comes back matching, which is
// what stops an attacker from feeding someone else's authorization code into this app.
export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const base = googleAuthOrigin(host);
  if (isBusinessHost(host)) return NextResponse.redirect(new URL("/vendor/login", base));
  // Canonicalize aliases before setting a host-only state cookie.
  if (host?.toLowerCase() !== new URL(base).host.toLowerCase()) {
    return NextResponse.redirect(new URL(`/api/auth/google${req.nextUrl.search}`, base));
  }
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", base));
  }

  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(googleAuthorizeUrl(state, base));

  const secure = base.startsWith("https://");
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600,
  });

  // Where to land afterwards. Only ever a path on this app — an absolute URL here would
  // turn sign-in into an open redirect.
  const next = safeGoogleReturnPath(req.nextUrl.searchParams.get("next"));
  if (next) {
    response.cookies.set(GOOGLE_RETURN_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 600,
    });
  } else response.cookies.delete(GOOGLE_RETURN_COOKIE);

  return response;
}
