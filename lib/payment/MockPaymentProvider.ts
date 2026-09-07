import { prisma } from "../prisma";
import type { PaymentIntentResult, PaymentService } from "./PaymentService";

// TODO(real payment integration): implement this same PaymentService interface against
// SSLCommerz or ShurjoPay (Bangladesh aggregators bundling bKash/Nagad/Rocket/cards) or
// any other provider, then swap the export at the bottom of this file. createPaymentIntent
// would create a real gateway session and return its redirect URL instead of simulating
// PAID locally; confirmPayment would verify via the provider's webhook/callback instead
// of a timer.
class MockPaymentProvider implements PaymentService {
  async createPaymentIntent(orderId: string, amount: number): Promise<PaymentIntentResult> {
    const payment = await prisma.payment.upsert({
      where: { orderId },
      update: { amount, status: "PENDING" },
      create: { orderId, amount, status: "PENDING", provider: "mock" },
    });
    await prisma.transaction.create({
      data: { paymentId: payment.id, type: "CHARGE", amount, status: "PENDING" },
    });
    return { paymentId: payment.id, status: "PENDING" };
  }

  async confirmPayment(paymentId: string): Promise<PaymentIntentResult> {
    // Simulate a real gateway's round-trip latency.
    await new Promise((resolve) => setTimeout(resolve, 900));

    const transactionReference = `MOCK-${paymentId.slice(0, 8)}-${Date.now()}`;
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", transactionReference },
    });
    const latestTx = await prisma.transaction.findFirst({
      where: { paymentId, type: "CHARGE" },
      orderBy: { createdAt: "desc" },
    });
    if (latestTx) {
      await prisma.transaction.update({
        where: { id: latestTx.id },
        data: { status: "PAID", providerRef: transactionReference },
      });
    }
    return { paymentId: payment.id, status: "PAID", transactionReference };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentIntentResult["status"]> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    return (payment?.status as PaymentIntentResult["status"]) ?? "FAILED";
  }

  async refundPayment(paymentId: string, amount: number, reason?: string) {
    await prisma.refund.create({ data: { paymentId, amount, reason, status: "COMPLETED" } });
    await prisma.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
    return { refunded: true };
  }
}

export const paymentService: PaymentService = new MockPaymentProvider();
