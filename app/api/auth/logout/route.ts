import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  // Clearing only the new name would leave the pre-rename cookie behind, and getSession
  // falls back to it — signing the person straight back in.
  response.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
