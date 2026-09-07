import type { SessionPayload } from "../auth";

/**
 * One rule for "may this requester act on this order", shared by cancel, review and
 * review-media upload so they can never drift apart.
 *
 * Two ways to qualify:
 *  - the order belongs to a signed-in customer, and that's who is asking; or
 *  - the order was placed as a guest (customerId null), in which case holding the order's
 *    unguessable id is the credential — exactly the same basis on which guest customers
 *    already view and track their order from the confirmation link. Without this, a guest
 *    could place an order and then be unable to cancel or review it at all.
 */
export function canActOnOrder(
  order: { customerId: string | null },
  session: Pick<SessionPayload, "userId"> | null
): boolean {
  if (order.customerId === null) return true;
  return !!session && session.userId === order.customerId;
}
