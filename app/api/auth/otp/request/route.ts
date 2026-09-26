import { NextRequest, NextResponse } from "next/server";
import { resolveIdentifier, requestOtp } from "@/lib/otp/service";
import { otpProvider } from "@/lib/otp/provider";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.identifier === "string" ? body.identifier : "";

  const id = resolveIdentifier(raw);
  if (!id) {
    return NextResponse.json({ error: "Enter a valid email address or phone number" }, { status: 400 });
  }

  if (!otpProvider.canDeliver(id.channel)) {
    return NextResponse.json(
      {
        error:
          id.channel === "PHONE"
            ? "Codes by text message aren't available yet. Enter your email address instead."
            : "Sign-in codes can't be sent right now. Use your password instead.",
      },
      { status: 400 }
    );
  }

  const result = await requestOtp(id);
  if (!result.ok) {
    if (result.reason === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "Too many codes requested. Wait a few minutes and try again." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "We couldn't send your code right now. Please try again shortly." },
      { status: 502 }
    );
  }

  // Says nothing about whether an account exists — the same response either way, so this
  // endpoint can't be used to test which emails or numbers are registered. Whether it's a
  // sign-in or a sign-up is settled at verify time.
  return NextResponse.json({ ok: true, channel: id.channel, destination: id.destination });
}
