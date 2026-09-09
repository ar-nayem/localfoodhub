import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleAuthConfigured,
  googleAuthorizeUrl,
  GOOGLE_STATE_COOKIE,
  GOOGLE_RETURN_COOKIE,
} from "@/lib/auth/google";
import { appBaseUrl } from "@/lib/qr/token";

// Starts the sign-in: mint a state value, stash it in an httpOnly cookie, and hand the
// browser to Google. The callback only proceeds if the state comes back matching, which is
// what stops an attacker from feeding someone else's authorization code into this app.
export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", base));
  }

  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(googleAuthorizeUrl(state));

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
  const next = req.nextUrl.searchParams.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    response.cookies.set(GOOGLE_RETURN_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 600,
    });
  }

  return response;
}
