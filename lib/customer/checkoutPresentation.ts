import type { OrderMode } from "@/lib/cart/store";

export type CheckoutJourneyStep = {
  label: string;
  detail: string;
};

const PICKUP_JOURNEY: CheckoutJourneyStep[] = [
  { label: "Order confirmed", detail: "The shop receives your order immediately." },
  { label: "Kitchen prepares it", detail: "You will see the preparation status in your orders." },
  { label: "Ready for pickup", detail: "Show your pickup code when you arrive." },
];

const DELIVERY_JOURNEY: CheckoutJourneyStep[] = [
  ...PICKUP_JOURNEY.slice(0, 2),
  { label: "On the way", detail: "Track the delivery status from your order." },
];

export function checkoutJourneyFor(mode: OrderMode | null): CheckoutJourneyStep[] {
  return mode === "DELIVERY" ? DELIVERY_JOURNEY : PICKUP_JOURNEY;
}
