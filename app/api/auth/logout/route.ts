import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAMES } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  // Clearing only the current name would leave any pre-rename cookie behind, and
  // getSession falls back to those — signing the person straight back in.
  for (const legacyName of LEGACY_SESSION_COOKIE_NAMES) {
    response.cookies.set(legacyName, "", { path: "/", maxAge: 0 });
  }
  return response;
}
