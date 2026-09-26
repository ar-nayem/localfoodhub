import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, sessionCookieOptions, isStaffRole, SESSION_COOKIE_NAME } from "@/lib/auth";
import { resolveIdentifier, verifyOtp } from "@/lib/otp/service";
import type { Role } from "@/lib/constants";

/** Something to show in the UI before the customer has told us their name. */
function fallbackName(destination: string, channel: "EMAIL" | "PHONE"): string {
  if (channel === "EMAIL") return destination.split("@")[0] || "Customer";
  return `Customer ${destination.slice(-4)}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const raw = typeof body?.identifier === "string" ? body.identifier : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const providedName = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";

  const id = resolveIdentifier(raw);
  if (!id || !code) {
    return NextResponse.json({ error: "Enter the code we sent you" }, { status: 400 });
  }

  const result = await verifyOtp(id, code);
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === "EXPIRED"
            ? "That code has expired. Request a new one."
            : "That code isn't right.",
      },
      { status: 401 }
    );
  }

  const where = id.channel === "EMAIL" ? { email: id.destination } : { phone: id.destination };
  let user = await prisma.user.findUnique({
    where,
    include: { shopStaff: { select: { shopId: true } } },
  });

  // The Business app (`app: "business"`) is sign-in only: a code must never mint a new
  // account there, and only shop accounts may use it. Like the password route, the flag can
  // only tighten the rules. Reaching this point means the caller proved control of the
  // contact, so saying "no shop account" reveals nothing about anyone else's.
  if (body?.app === "business" && (!user || !isStaffRole(user.role as Role))) {
    return NextResponse.json(
      { error: "No shop account uses that email or phone number. Apply to join first, then sign in." },
      { status: 403 }
    );
  }

  if (!user) {
    // First sign-in with this contact creates the account. Role is hardcoded, never taken
    // from the request — otherwise anyone could mint themselves an admin.
    user = await prisma.user.create({
      data: {
        ...(id.channel === "EMAIL" ? { email: id.destination } : { phone: id.destination }),
        name: providedName || fallbackName(id.destination, id.channel),
        role: "CUSTOMER",
      },
      include: { shopStaff: { select: { shopId: true } } },
    });
  } else if (providedName && !user.name) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name: providedName },
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

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
