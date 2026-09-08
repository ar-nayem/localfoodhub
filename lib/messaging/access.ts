import { prisma } from "../prisma";
import { getSession, isStaffRole, type SessionPayload } from "../auth";
import type { SenderRole } from "../constants";

/**
 * Every conversation is 1:1 with an order, so "who may open this thread" is exactly the
 * same rule as "who may open this order" (lib/orders/access.ts's canActOnOrder, plus the
 * shop-staff side that route never needed) — never a separate, driftable check.
 *
 * Returns the viewer's role in the thread (CUSTOMER or VENDOR) so callers don't have to
 * re-derive it, or null if this requester has no business here at all.
 */
export async function resolveConversationViewer(
  order: { customerId: string | null; shopId: string }
): Promise<{ session: SessionPayload | null; viewerRole: SenderRole } | null> {
  const session = await getSession();

  if (session && isStaffRole(session.role) && session.shopIds.includes(order.shopId)) {
    return { session, viewerRole: "VENDOR" };
  }

  const isCustomerSide = order.customerId === null || session?.userId === order.customerId;
  if (isCustomerSide) {
    return { session, viewerRole: "CUSTOMER" };
  }

  return null;
}

/** Fetches the order (only the fields access-checking and thread-headers need) by id, or
 * null if it doesn't exist — callers 404 either way, same as every other order route. */
export async function getOrderForConversation(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      guestName: true,
      guestPhone: true,
      shopId: true,
      customer: { select: { name: true, phone: true } },
      shop: { select: { name: true, phone: true } },
    },
  });
}
