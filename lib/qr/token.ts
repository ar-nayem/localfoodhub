import { randomBytes } from "crypto";

/** Secure random token for a QR code's public URL (`/q/<token>`). Never an internal ID,
 * never PII — spec Section 36. 22 base64url chars ≈ 132 bits of entropy. */
export function generateQrToken(): string {
  return randomBytes(16).toString("base64url");
}

export function qrPublicUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4410";
  return `${base}/q/${token}`;
}
