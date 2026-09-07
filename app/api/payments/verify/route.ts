import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentService } from "@/lib/payment/MockPaymentProvider";
import { notificationService } from "@/lib/notifications/ConsoleProvider";
import { generateQrToken } from "@/lib/qr/token";

// Public: confirms/verifies a payment and — only on success — moves the order from
// PENDING to CONFIRMED (Rule 2: an order is never "confirmed" on an unpaid/failed
// payment). On failure the order stays exactly where it was; nothing here silently
// advances order state.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const orderId: string | undefined = body?.orderId;
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order || !order.payment) {
    return NextResponse.json({ error: "No payment found for this order" }, { status: 404 });
  }

  const result = await paymentService.confirmPayment(order.payment.id);

  if (result.status !== "PAID") {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    return NextResponse.json({ status: result.status }, { status: 402 });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", orderStatus: "CONFIRMED" },
  });

  // Every confirmed order gets its own ORDER QR (spec Section 14/57) — customer shows it
  // at pickup/collection, staff scans it to verify (Section 58).
  const existingQr = await prisma.qRCode.findUnique({ where: { orderId: updated.id } });
  if (!existingQr) {
    await prisma.qRCode.create({
      data: {
        token: generateQrToken(),
        type: "ORDER",
        shopId: updated.shopId,
        orderId: updated.id,
        label: `Order #${updated.orderNumber}`,
      },
    });
  }

  if (updated.customerId) {
    await notificationService.send({
      userId: updated.customerId,
      type: "PAYMENT_SUCCESS",
      title: "Payment successful",
      body: `Order #${updated.orderNumber} is confirmed and on its way to the kitchen.`,
      orderId: updated.id,
      shopId: updated.shopId,
    });
  }

  return NextResponse.json({ status: "PAID", order: updated });
}
