// Centralized status/type constants (spec Section 78). SQLite can't enforce Prisma enums,
// so these arrays + the zod enums below are the single source of truth for every status
// field in the schema — validate against these before writing any status column.

export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SHOP_OWNER",
  "SHOP_STAFF",
  "KITCHEN_STAFF",
  "DELIVERY_STAFF",
  "CUSTOMER",
] as const;
export type Role = (typeof ROLES)[number];

export const SHOP_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

export const PRODUCT_STATUSES = ["AVAILABLE", "SOLD_OUT", "HIDDEN"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const TABLE_STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "ORDERING",
  "PREPARING",
  "READY",
  "CLEANING",
] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export const QR_TYPES = [
  "SHOP",
  "MENU",
  "TABLE",
  "COUNTER",
  "PRODUCT",
  "ORDER",
  "PICKUP",
  "DELIVERY",
  "PROMOTION",
  "LOCATION",
  "REGISTRATION",
] as const;
export type QRType = (typeof QR_TYPES)[number];

export const QR_STATUSES = ["ACTIVE", "INACTIVE", "EXPIRED", "REVOKED"] as const;
export type QRStatus = (typeof QR_STATUSES)[number];

export const ORDER_TYPES = ["DELIVERY", "PICKUP", "DINE_IN"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

/**
 * Launch feature flags.
 *
 * Delivery is off for this launch. The flag hides it from every customer- and
 * vendor-facing surface while leaving the schema, order type, status flow, courier model
 * and existing delivery orders completely intact — flip this back to `true` to restore it
 * without a migration or a rebuild.
 */
export const FEATURES = {
  delivery: false,
} as const;

/** Order types currently offered to customers. */
export const ACTIVE_ORDER_TYPES = ORDER_TYPES.filter(
  (t) => t !== "DELIVERY" || FEATURES.delivery
);

export function isOrderTypeActive(type: string): boolean {
  return type !== "DELIVERY" || FEATURES.delivery;
}

// Ordered progression per order type — used to render tracking timelines and to
// validate a vendor's "move forward" action never skips or reverses illegally.
export const ORDER_STATUS_FLOW: Record<OrderType, string[]> = {
  DELIVERY: [
    "PENDING",
    "CONFIRMED",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "ASSIGNED",
    "PICKED_UP",
    "ON_THE_WAY",
    "DELIVERED",
    "COMPLETED",
  ],
  PICKUP: ["PENDING", "CONFIRMED", "ACCEPTED", "PREPARING", "READY", "COMPLETED"],
  DINE_IN: ["PENDING", "CONFIRMED", "ACCEPTED", "PREPARING", "READY", "COMPLETED"],
};

export const ORDER_STATUSES = [
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// A customer may cancel only until the shop accepts: PENDING (placed, unpaid) and
// CONFIRMED (paid, still awaiting the shop). Authoritative for both the API guard and
// the UI — the button and the server rule must never drift apart.
export const CANCELLABLE_ORDER_STATUSES = ["PENDING", "PAYMENT_PENDING", "CONFIRMED"] as const;

export function isCancellable(orderStatus: string): boolean {
  return (CANCELLABLE_ORDER_STATUSES as readonly string[]).includes(orderStatus);
}

export const CANCELLATION_REASONS = [
  "Ordered by mistake",
  "Changed my mind",
  "Taking too long",
  "Found another option",
  "Payment issue",
  "Other",
] as const;

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Order placed",
  PAYMENT_PENDING: "Awaiting payment",
  CONFIRMED: "Payment confirmed",
  ACCEPTED: "Shop accepted",
  PREPARING: "Preparing your food",
  READY: "Ready",
  ASSIGNED: "Courier assigned",
  PICKED_UP: "Picked up",
  ON_THE_WAY: "On the way",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/** The staff action that advances an order exactly one step forward through its own
 * status flow — shared by the vendor Kanban board and the QR staff-verification panel
 * so scanning an order's QR moves it to "Shop accepted" like any other acceptance, never
 * straight to Completed. Absent from this map = no forward action offered (order is
 * already at a terminal or unreachable-from-here status). */
export const NEXT_ORDER_ACTION: Record<string, { next: string; label: string }> = {
  PENDING: { next: "ACCEPTED", label: "Accept Order" },
  CONFIRMED: { next: "ACCEPTED", label: "Accept Order" },
  ACCEPTED: { next: "PREPARING", label: "Start Preparing" },
  PREPARING: { next: "READY", label: "Mark Ready" },
  READY: { next: "COMPLETED", label: "Mark Collected" },
};

export const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "AT_SHOP",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "FAILED",
] as const;

export const PROMOTION_TYPES = ["PERCENT", "FIXED", "BOGO", "FREE_ITEM"] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const CURRENCY = "BDT";
export const CURRENCY_SYMBOL = "৳";

// Discovery mood filter — matched against Product.dietaryTags plus a couple of
// category-name heuristics (see app/api/discover/route.ts). "Any" = no filter.
export const MOOD_TAGS = [
  "spicy",
  "sweet",
  "healthy",
  "vegetarian",
  "halal",
  "dessert",
  "drinks",
] as const;

export interface PriceBucket {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_BUCKETS: PriceBucket[] = [
  { key: "budget", label: "Budget", max: 150 },
  { key: "mid", label: "Mid-range", min: 150, max: 350 },
  { key: "premium", label: "Premium", min: 350 },
];

// Quick review tags (spec Section 209) — positive and negative, all optional.
export const REVIEW_TAGS = [
  { key: "delicious", label: "Delicious", sentiment: "positive" },
  { key: "fresh", label: "Fresh", sentiment: "positive" },
  { key: "great_portion", label: "Great portion", sentiment: "positive" },
  { key: "good_value", label: "Good value", sentiment: "positive" },
  { key: "perfect_spice", label: "Perfect spice", sentiment: "positive" },
  { key: "would_order_again", label: "Would order again", sentiment: "positive" },
  { key: "too_salty", label: "Too salty", sentiment: "negative" },
  { key: "too_spicy", label: "Too spicy", sentiment: "negative" },
  { key: "small_portion", label: "Small portion", sentiment: "negative" },
  { key: "cold", label: "Cold", sentiment: "negative" },
  { key: "slow_prep", label: "Slow preparation", sentiment: "negative" },
] as const;
