import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveQrToken } from "@/lib/qr/resolve";

// The load-bearing route: every physical/printed QR in the platform encodes
// `${BASE_URL}/q/<token>` and nothing else (spec Section 36). This resolves it
// server-side and redirects to the right destination — see lib/qr/resolve.ts for the
// full per-type behavior and the invalid/expired/disabled error handling (Section 54).
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await getSession();
  const result = await resolveQrToken(params.token, session);

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/qr-error?reason=${result.reason}`, req.url));
  }
  if (result.kind === "staff_verify") {
    return NextResponse.redirect(new URL(`/orders/${result.orderId}?verify=1`, req.url));
  }
  return NextResponse.redirect(new URL(result.to, req.url));
}
