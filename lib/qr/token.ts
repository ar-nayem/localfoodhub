import { randomBytes } from "crypto";

/** Secure random token for a QR code's public URL (`/q/<token>`). Never an internal ID,
 * never PII — spec Section 36. 22 base64url chars ≈ 132 bits of entropy. */
export function generateQrToken(): string {
  return randomBytes(16).toString("base64url");
}

/** The app's own public origin. Deliberately NOT derived from a request's `req.url` —
 * behind a reverse proxy (nginx → `next start` on a bare port), Next.js has no way to
 * know the externally-visible host/protocol from the request object alone, and building
 * a redirect target from it silently resolves to the app's internal bind address (e.g.
 * `https://localhost:7600`) instead of the real domain. This is the single source of
 * truth for the public origin everywhere an absolute URL is needed. */
export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4410";
}

export function qrPublicUrl(token: string): string {
  return `${appBaseUrl()}/q/${token}`;
}
