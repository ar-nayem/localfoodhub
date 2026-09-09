import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { otpProvider } from "./provider";
import type { OtpChannel } from "./OtpDeliveryService";

const CODE_LENGTH = 6;
const EXPIRY_MINUTES = 5;
/** Wrong guesses allowed against a single code before it's burned. 6 digits with 5 tries
 * leaves a 1-in-200,000 chance per code, and requesting a fresh one is itself rate-limited. */
const MAX_ATTEMPTS = 5;
/** Requests allowed per destination per window — the ceiling on both SMS spend and on
 * using this endpoint to spam somebody else's inbox or handset. */
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_WINDOW_MINUTES = 15;

export interface ResolvedIdentifier {
  channel: OtpChannel;
  destination: string;
}

/** Decides whether an identifier is an email or a phone and canonicalizes it, so the same
 * contact typed two different ways ("+880 171 123 4567" / "+8801711234567") is one row and
 * one rate-limit bucket. Returns null for input that is neither. */
export function resolveIdentifier(raw: string): ResolvedIdentifier | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    // Deliberately loose: real validation is whether the code arrives.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { channel: "EMAIL", destination: email };
  }

  const digits = trimmed.replace(/[\s()\-.]/g, "");
  if (!/^\+?\d{6,15}$/.test(digits)) return null;
  return { channel: "PHONE", destination: digits };
}

export type RequestOtpResult = { ok: true } | { ok: false; reason: "RATE_LIMITED" | "DELIVERY_FAILED" };

/** Issues a code and hands it to the delivery provider. The code is returned to nobody —
 * it exists in memory here, as a bcrypt hash in the row, and in whatever the provider
 * sends. */
export async function requestOtp(id: ResolvedIdentifier): Promise<RequestOtpResult> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000);
  const recentCount = await prisma.otpCode.count({
    where: { destination: id.destination, createdAt: { gte: windowStart } },
  });
  if (recentCount >= MAX_REQUESTS_PER_WINDOW) return { ok: false, reason: "RATE_LIMITED" };

  // Only the newest code should ever work; leaving older ones live would multiply the
  // guesses an attacker gets per rate-limit window.
  await prisma.otpCode.updateMany({
    where: { destination: id.destination, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  // randomInt is CSPRNG-backed — Math.random() is predictable enough to guess codes from.
  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60_000);

  await prisma.otpCode.create({
    data: {
      destination: id.destination,
      channel: id.channel,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt,
    },
  });

  try {
    await otpProvider.send({
      channel: id.channel,
      destination: id.destination,
      code,
      expiresInMinutes: EXPIRY_MINUTES,
    });
  } catch (err) {
    // Telling someone "check your inbox" when the send was rejected leaves them waiting on
    // a code that will never arrive. Burn the code and report the failure instead.
    console.error("[otp] delivery failed:", err);
    await prisma.otpCode.updateMany({
      where: { destination: id.destination, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return { ok: false, reason: "DELIVERY_FAILED" };
  }

  return { ok: true };
}

export type VerifyOtpResult = { ok: true } | { ok: false; reason: "INVALID" | "EXPIRED" };

/** Checks a code and consumes it on success. A given code verifies exactly once. */
export async function verifyOtp(id: ResolvedIdentifier, code: string): Promise<VerifyOtpResult> {
  const record = await prisma.otpCode.findFirst({
    where: { destination: id.destination, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false, reason: "INVALID" };

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    return { ok: false, reason: "EXPIRED" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    return { ok: false, reason: "EXPIRED" };
  }

  if (!(await bcrypt.compare(code.trim(), record.codeHash))) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "INVALID" };
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
