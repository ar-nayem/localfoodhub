import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/auth";
import { SHOP_STATUSES } from "@/lib/constants";
import { generateQrToken } from "@/lib/qr/token";

// Admin-only: approve/reject/suspend a shop (spec Section 29). Approving auto-generates
// the shop's permanent SHOP QR (spec Section 4 type 1) so the owner has something to
// print the moment they're live.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const status: string | undefined = body?.status;
  if (!status || !SHOP_STATUSES.includes(status as (typeof SHOP_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const before = await prisma.shop.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shop = await prisma.shop.update({ where: { id: params.id }, data: { status } });

  if (status === "ACTIVE" && before.status !== "ACTIVE") {
    const hasShopQr = await prisma.qRCode.findFirst({ where: { shopId: shop.id, type: "SHOP" } });
    if (!hasShopQr) {
      await prisma.qRCode.create({
        data: { token: generateQrToken(), type: "SHOP", shopId: shop.id, label: `${shop.name} — Shop QR` },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: `SHOP_${status}`,
      entity: "Shop",
      entityId: shop.id,
      before: JSON.stringify({ status: before.status }),
      after: JSON.stringify({ status }),
    },
  });

  return NextResponse.json(shop);
}
