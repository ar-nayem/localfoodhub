// Provider-independent payment abstraction (spec Section 32/83). Checkout and the
// /api/payments/* routes only ever call this interface — swapping in a real gateway
// (SSLCommerz/ShurjoPay/Stripe/whatever) later means writing one new class here, nothing
// in the UI or order logic changes.

export interface PaymentIntentResult {
  paymentId: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED";
  transactionReference?: string;
}

export interface PaymentService {
  createPaymentIntent(orderId: string, amount: number): Promise<PaymentIntentResult>;
  confirmPayment(paymentId: string): Promise<PaymentIntentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentIntentResult["status"]>;
  refundPayment(paymentId: string, amount: number, reason?: string): Promise<{ refunded: boolean }>;
}
