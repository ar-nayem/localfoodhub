import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  fetchGoogleProfile,
  isGoogleAuthConfigured,
  GOOGLE_STATE_COOKIE,
  GOOGLE_RETURN_COOKIE,
} from "@/lib/auth/google";
import { appBaseUrl } from "@/lib/qr/token";
import type { Role } from "@/lib/constants";

function landingFor(role: string, requested: string | undefined): string {
  if (requested) return requested;
  if (role === "SHOP_OWNER" || role === "SHOP_STAFF" || role === "KITCHEN_STAFF") return "/vendor";
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  return "/";
}

export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, base));

  if (!isGoogleAuthConfigured()) return fail("google_unavailable");

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("google_denied");

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = req.cookies.get(GOOGLE_STATE_COOKIE)?.value;

  // Both must exist and match. A missing or mismatched state means this callback wasn't
  // started by this browser, so the code is not one we should redeem.
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("google_state");
  }

  let profile;
  try {
    profile = await fetchGoogleProfile(code);
  } catch (err) {
    console.error("[google-auth] profile fetch failed:", err);
    return fail("google_failed");
  }

  // Google will hand back unverified addresses in some tenant setups. Trusting one would
  // let somebody claim an account belonging to an email they never proved they own.
  if (!profile.emailVerified) return fail("google_unverified");

  // Match on the Google subject first, then fall back to the verified email so an existing
  // password account gets linked rather than duplicated.
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
    include: { shopStaff: { select: { shopId: true } } },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId: profile.sub,
        email: profile.email,
        name: profile.name,
        imageUrl: profile.picture,
        // Never taken from the request — a self-assigned role would be an instant privilege
        // escalation.
        role: "CUSTOMER",
      },
      include: { shopStaff: { select: { shopId: true } } },
    });
  } else if (!user.googleId) {
    // First Google sign-in for an account that already existed by email/password.
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.sub, imageUrl: user.imageUrl ?? profile.picture },
      include: { shopStaff: { select: { shopId: true } } },
    });
  }

  const token = await signSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email ?? "",
    shopIds: user.shopStaff.map((s) => s.shopId),
  });

  const next = req.cookies.get(GOOGLE_RETURN_COOKIE)?.value;
  const response = NextResponse.redirect(new URL(landingFor(user.role, next), base));
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  response.cookies.delete(GOOGLE_RETURN_COOKIE);
  return response;
}
