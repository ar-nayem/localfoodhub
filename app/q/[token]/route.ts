import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveQrToken } from "@/lib/qr/resolve";
import { appBaseUrl } from "@/lib/qr/token";
import { BUSINESS_ORIGIN, isBusinessHost } from "@/lib/hosts";

// The load-bearing route: every physical/printed QR in the platform encodes
// `${BASE_URL}/q/<token>` and nothing else (spec Section 36). This resolves it
// server-side and redirects to the right destination — see lib/qr/resolve.ts for the
// full per-type behavior and the invalid/expired/disabled error handling (Section 54).
//
// Redirect targets are built from appBaseUrl(), never from this request's own `req.url` —
// behind the reverse proxy this app runs behind in production, `req.url` reflects the
// app's internal bind address, not the public domain, and using it here sent every scan
// to an unreachable `localhost` address instead of the real site.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await getSession();
  const result = await resolveQrToken(params.token, session);
  const base = appBaseUrl();

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/qr-error?reason=${result.reason}`, base));
  }
  if (result.kind === "staff_verify") {
    // Scanned inside the Business app: verify on the Business host, where this staff
    // member's session actually lives. Scanned anywhere else (a phone camera opening the
    // printed customer link) it stays on the customer site, as before.
    if (BUSINESS_ORIGIN && isBusinessHost(req.headers.get("host"))) {
      return NextResponse.redirect(new URL(`/vendor/verify/${result.orderId}`, BUSINESS_ORIGIN));
    }
    return NextResponse.redirect(new URL(`/orders/${result.orderId}?verify=1`, base));
  }
  return NextResponse.redirect(new URL(result.to, base));
}
