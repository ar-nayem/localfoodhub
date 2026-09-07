import { prisma } from "../prisma";
import type { SessionPayload } from "../auth";
import { isStaffRole } from "../auth";

export type QrInvalidReason = "not_found" | "inactive" | "expired" | "revoked";

export type QrResolution =
  | { ok: false; reason: QrInvalidReason }
  | { ok: true; kind: "redirect"; to: string }
  | { ok: true; kind: "staff_verify"; orderId: string };

/**
 * Server-side resolution for a scanned QR token (spec Section 3/36). Looks up the token,
 * validates its status, logs the scan, and decides where the scan should land. This is
 * the ONLY place that turns a QR token into a destination — the printed/rendered QR image
 * never encodes anything but `/q/<token>`, so nothing sensitive ever sits in the code
 * itself and a disabled/expired QR fails closed here rather than in the UI.
 */
export async function resolveQrToken(
  token: string,
  requester: SessionPayload | null
): Promise<QrResolution> {
  const qr = await prisma.qRCode.findUnique({
    where: { token },
    include: { shop: true, table: true, product: true, order: true, location: true, promotion: true },
  });

  if (!qr) return { ok: false, reason: "not_found" };
  if (qr.status === "REVOKED") return { ok: false, reason: "revoked" };
  if (qr.status === "EXPIRED") return { ok: false, reason: "expired" };
  if (qr.status === "INACTIVE") return { ok: false, reason: "inactive" };

  // Log the scan + bump counters. Not awaited-critical for the redirect itself, but we
  // do wait so scanCount is consistent for anyone refreshing the QR center immediately after.
  await prisma.$transaction([
    prisma.qRScan.create({ data: { qrCodeId: qr.id } }),
    prisma.qRCode.update({
      where: { id: qr.id },
      data: { scanCount: { increment: 1 }, lastScannedAt: new Date() },
    }),
  ]);

  switch (qr.type) {
    case "SHOP":
      return { ok: true, kind: "redirect", to: `/s/${qr.shop?.slug}` };
    case "MENU":
      return { ok: true, kind: "redirect", to: `/s/${qr.shop?.slug}?tab=menu` };
    case "COUNTER":
      return { ok: true, kind: "redirect", to: `/s/${qr.shop?.slug}?mode=pickup` };
    case "TABLE":
      return {
        ok: true,
        kind: "redirect",
        to: `/s/${qr.shop?.slug}?mode=dine-in&qr=${token}`,
      };
    case "PRODUCT":
      return {
        ok: true,
        kind: "redirect",
        to: `/s/${qr.shop?.slug}/product/${qr.productId}`,
      };
    case "PROMOTION":
      return {
        ok: true,
        kind: "redirect",
        to: `/s/${qr.shop?.slug}?promo=${qr.promotion?.code ?? ""}`,
      };
    case "LOCATION":
      // spec Section 134/144: a location QR marked "promote discovery" opens Explore
      // pre-scoped to this location instead of the plain browse list.
      return {
        ok: true,
        kind: "redirect",
        to: qr.location?.promoteDiscovery
          ? `/discover?location=${qr.locationId}`
          : `/explore?location=${qr.locationId}`,
      };
    case "REGISTRATION":
      return { ok: true, kind: "redirect", to: `/apply?ref=${token}` };
    case "ORDER":
    case "PICKUP":
    case "DELIVERY": {
      if (!qr.orderId) return { ok: false, reason: "not_found" };
      const isStaffOfShop =
        requester &&
        isStaffRole(requester.role) &&
        requester.shopIds.includes(qr.shopId ?? "");
      if (isStaffOfShop) {
        return { ok: true, kind: "staff_verify", orderId: qr.orderId };
      }
      return { ok: true, kind: "redirect", to: `/orders/${qr.orderId}` };
    }
    default:
      return { ok: false, reason: "not_found" };
  }
}

/**
 * Re-validates a TABLE QR token at order-creation time and returns the shop+table it
 * resolves to server-side — used so a dine-in order's table can NEVER be trusted from a
 * client-submitted tableId (spec Rule 4). Returns null if the token is missing, wrong
 * type, or not ACTIVE.
 */
export async function resolveTableFromToken(
  token: string
): Promise<{ shopId: string; tableId: string } | null> {
  const qr = await prisma.qRCode.findUnique({ where: { token } });
  if (!qr || qr.type !== "TABLE" || qr.status !== "ACTIVE" || !qr.shopId || !qr.tableId) {
    return null;
  }
  return { shopId: qr.shopId, tableId: qr.tableId };
}

export async function markQrScanConverted(token: string) {
  const qr = await prisma.qRCode.findUnique({ where: { token } });
  if (!qr) return;
  await prisma.qRCode.update({ where: { id: qr.id }, data: { orderCount: { increment: 1 } } });
  const lastScan = await prisma.qRScan.findFirst({
    where: { qrCodeId: qr.id },
    orderBy: { scannedAt: "desc" },
  });
  if (lastScan) {
    await prisma.qRScan.update({ where: { id: lastScan.id }, data: { resultedInOrder: true } });
  }
}
