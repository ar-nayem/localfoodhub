import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentService } from "@/lib/payment/MockPaymentProvider";

// Public: starts payment for an order that's still PENDING. Wraps lib/payment's
// provider-independent interface — see that file's TODO for swapping in a real gateway.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const orderId: string | undefined = body?.orderId;
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "Order already paid" }, { status: 409 });
  }

  const intent = await paymentService.createPaymentIntent(order.id, order.total);
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PROCESSING" } });

  return NextResponse.json(intent);
}
