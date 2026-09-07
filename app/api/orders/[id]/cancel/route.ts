import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { paymentService } from "@/lib/payment/MockPaymentProvider";
import { notificationService } from "@/lib/notifications/ConsoleProvider";
import { CANCELLABLE_ORDER_STATUSES, isCancellable } from "@/lib/constants";
import { canActOnOrder } from "@/lib/orders/access";

/**
 * Customer-initiated cancellation. Only valid while the shop has not accepted the order
 * yet — the check is server-side and atomic, so a manipulated client (or a Cancel tapped
 * at the same moment the vendor taps Accept) can never produce an order that is both
 * ACCEPTED and CANCELLED. The conditional updateMany is the lock: it only matches rows
 * still in a cancellable status, so whichever transition commits first wins and the loser
 * gets a truthful "already accepted" response.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { payment: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!canActOnOrder(order, session)) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.orderStatus === "CANCELLED") {
    return NextResponse.json({ error: "This order is already cancelled." }, { status: 409 });
  }
  if (!isCancellable(order.orderStatus)) {
    return NextResponse.json(
      { error: "The shop has already accepted this order, so it can no longer be cancelled." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 200) : null;

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, orderStatus: { in: [...CANCELLABLE_ORDER_STATUSES] } },
    data: {
      orderStatus: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: "CUSTOMER",
      cancellationReason: reason,
    },
  });

  if (claimed.count > 0) {
    await prisma.orderStatusEvent.create({
      data: { orderId: order.id, status: "CANCELLED", note: reason },
    });
  }

  // Lost the race — the vendor's Accept committed first.
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "The shop has already accepted this order, so it can no longer be cancelled." },
      { status: 409 }
    );
  }

  // Refund only what was actually captured; the payment provider is the source of truth
  // for the resulting state, so the customer is never told "refunded" on a guess.
  let refundState: "NONE" | "REFUNDED" | "PROCESSING" = "NONE";
  if (order.payment && order.payment.status === "PAID") {
    try {
      const result = await paymentService.refundPayment(
        order.payment.id,
        order.total,
        reason ?? "Customer cancelled"
      );
      // Trust the provider's own answer, then confirm against the stored payment row —
      // the customer is never shown "refund completed" on an assumption.
      const settled = await prisma.payment.findUnique({ where: { id: order.payment.id } });
      refundState = result.refunded && settled?.status === "REFUNDED" ? "REFUNDED" : "PROCESSING";
    } catch {
      refundState = "PROCESSING";
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: refundState === "REFUNDED" ? "REFUNDED" : "PROCESSING" },
    });
  }

  if (order.tableId) {
    await prisma.table.update({ where: { id: order.tableId }, data: { status: "AVAILABLE" } });
  }

  // Guest orders have no account to notify — the confirmation page itself shows the
  // cancelled state, which is the only channel a guest has.
  if (order.customerId) {
    await notificationService.send({
      userId: order.customerId,
      type: "ORDER_CANCELLED",
      title: `Order #${order.orderNumber} cancelled`,
      body:
        refundState === "REFUNDED"
          ? "Your order was cancelled and your refund has been completed."
          : refundState === "PROCESSING"
            ? "Your order was cancelled. Your refund is being processed."
            : "Your order was cancelled successfully.",
      orderId: order.id,
      shopId: order.shopId,
    });
  }

  const full = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true, shop: true, table: true, deliveryAddress: true, payment: true, qrCode: true, statusEvents: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ order: full, refundState });
}
