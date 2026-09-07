import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().max(30).optional(),
});

export const vendorApplySchema = z.object({
  shopName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().max(30),
  address: z.string().min(3).max(300),
  category: z.string().min(2).max(60),
  description: z.string().max(1000).default(""),
});

const cartLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  selectedOptions: z
    .array(z.object({ optionName: z.string(), valueLabel: z.string(), priceDelta: z.number() }))
    .default([]),
  selectedAddons: z.array(z.object({ name: z.string(), price: z.number() })).default([]),
  notes: z.string().max(300).optional(),
});

export const createOrderSchema = z.object({
  idempotencyKey: z.string().uuid(),
  shopId: z.string().min(1),
  orderType: z.enum(["DELIVERY", "PICKUP", "DINE_IN"]),
  items: z.array(cartLineSchema).min(1),
  // Dine-in: table is NEVER trusted from the client directly — a `tableQrToken` is
  // required and re-resolved server-side (see lib/qr/resolve.ts resolveTableFromToken).
  tableQrToken: z.string().optional(),
  // Any QR token that led the customer here (SHOP/MENU/PRODUCT scans) — purely for scan
  // -to-order conversion stats in the QR center, never trusted for pricing/table identity.
  entryQrToken: z.string().optional(),
  // Delivery
  deliveryAddress: z
    .object({ line1: z.string().min(3), line2: z.string().optional(), city: z.string().min(1) })
    .optional(),
  // Pickup
  pickupTime: z.enum(["ASAP"]).or(z.string().datetime()).optional(),
  scheduledFor: z.string().datetime().optional(),
  promoCode: z.string().optional(),
  guestName: z.string().min(1).max(100).optional(),
  guestPhone: z.string().min(3).max(30).optional(),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
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
  ]),
});

export const upsertProductSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).default(""),
  price: z.number().min(0),
  discountPrice: z.number().min(0).nullable().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["AVAILABLE", "SOLD_OUT", "HIDDEN"]).default("AVAILABLE"),
  prepTimeMinutes: z.number().int().min(0).default(10),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
});

export const upsertCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
});

export const upsertTableSchema = z.object({
  area: z.string().min(1).max(60).default("Main"),
  label: z.string().min(1).max(20),
});

export const generateQrSchema = z.object({
  type: z.enum([
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
  ]),
  shopId: z.string().optional(),
  tableId: z.string().optional(),
  productId: z.string().optional(),
  locationId: z.string().optional(),
  label: z.string().max(80).optional(),
});
