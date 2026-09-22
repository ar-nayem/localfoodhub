// Custom credential auth: bcrypt password hashing + a JWT session cookie signed/verified
// with `jose` (Edge-runtime safe, unlike jsonwebtoken/bcrypt) so middleware.ts can check
// role-gated routes without a Node runtime. This is deliberately NOT NextAuth/Auth.js —
// see the plan's rationale: simpler, no beta-version risk, matches this user's other apps.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "./constants";

const SESSION_COOKIE = "shokherkhabar_session";
/** Every prior session-cookie name, most recent first. Sessions last 30 days, so dropping
 * any of these outright would sign out everyone still carrying it. Read in order as a
 * fallback — new sign-ins always get the current name above. Each entry is safe to remove
 * once 30 days have passed since THAT rename shipped: "foodivo_session" from 2026-09-20,
 * "lfh_session" from the original name before that. */
const LEGACY_SESSION_COOKIES = ["foodivo_session", "lfh_session"];
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-insecure-secret");

export interface SessionPayload {
  userId: string;
  role: Role;
  name: string;
  email: string;
  /** Shop IDs this user has staff access to (owner/staff/kitchen). Empty for customers. */
  shopIds: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const LEGACY_SESSION_COOKIE_NAMES = LEGACY_SESSION_COOKIES;

/** Server Components / Route Handlers: read + verify the session cookie.
 *
 * A valid signature isn't enough on its own: tokens last 30 days and live on every device
 * someone signed in from, so a deleted account would otherwise keep a working session
 * everywhere except the phone it was deleted from. One primary-key lookup closes that.
 * (middleware.ts verifies tokens separately with jose and never imports this file, which
 * is what keeps Prisma out of the Edge bundle.) */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = cookies();
  const token =
    jar.get(SESSION_COOKIE)?.value ?? LEGACY_SESSION_COOKIES.map((name) => jar.get(name)?.value).find(Boolean);
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const exists = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true } });
  return exists ? session : null;
}

export function sessionCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

const STAFF_ROLES: Role[] = ["SHOP_OWNER", "SHOP_STAFF", "KITCHEN_STAFF"];
const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

/** Throws-free guard for use in Server Components/route handlers: returns the session
 * only if it has one of the allowed roles, otherwise null. */
export async function requireRole(allowed: Role[]): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || !allowed.includes(session.role)) return null;
  return session;
}
