import QRCodeLib from "qrcode";
import { prisma } from "@/lib/prisma";
import { qrPublicUrl } from "@/lib/qr/token";

/** Everything an order detail screen needs, loaded once and shared by the customer's
 * /orders/[orderId] page and the Business app's /vendor/verify/[orderId] page — the two
 * render the same <OrderView>, so the query and the serialisation must not drift apart.
 *
 * Returns null when the order doesn't exist. Authorisation is deliberately NOT done here:
 * who may see an order differs between the two callers (owner-or-staff vs staff-of-shop). */
export async function loadOrderView(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      shop: true,
      table: true,
      deliveryAddress: true,
      payment: true,
      qrCode: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return null;

  const qrImage = order.qrCode
    ? await QRCodeLib.toDataURL(qrPublicUrl(order.qrCode.token), { width: 320, margin: 2 })
    : null;

  return {
    raw: order,
    qrImage,
    view: {
      ...order,
      createdAt: order.createdAt.toISOString(),
      pickupTime: order.pickupTime?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      statusEvents: order.statusEvents.map((e) => ({
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
    },
  };
}
