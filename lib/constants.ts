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
