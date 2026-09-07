import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole, isStaffRole } from "@/lib/auth";

// Toggle a QR code's status (enable/disable/revoke) — spec Section 4 & 54 (a disabled QR
// must fail the scan, not silently keep working).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (!isStaffRole(session.role) && !isAdminRole(session.role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qr = await prisma.qRCode.findUnique({ where: { id: params.id } });
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (qr.shopId && !isAdminRole(session.role) && !session.shopIds.includes(qr.shopId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const status: string | undefined = body?.status;
  if (!status || !["ACTIVE", "INACTIVE", "REVOKED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.qRCode.update({ where: { id: qr.id }, data: { status } });
  return NextResponse.json(updated);
}
