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
  // Set only when the customer placing the order isn't who it's for/who'll collect it.
  // Independent of guestName/guestPhone, which stay the *orderer's* own contact info.
  recipientName: z.string().min(1).max(100).optional(),
  recipientPhone: z.string().min(3).max(30).optional(),
  recipientNote: z.string().max(300).optional(),
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
  // Not z.string().url() — every real value here comes from the local-upload endpoint as
  // an app-relative path (/uploads/<shopId>/<file>), which .url() rejects outright since
  // it requires a scheme+host. That made every product save fail right after a successful
  // image upload. The "advanced: use an image URL" field still accepts absolute URLs fine;
  // this just stops rejecting the normal case.
  imageUrl: z.string().optional().or(z.literal("")),
  status: z.enum(["AVAILABLE", "SOLD_OUT", "HIDDEN"]).default("AVAILABLE"),
  prepTimeMinutes: z.number().int().min(0).default(10),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  featured: z.boolean().optional(),
  discoveryEligible: z.boolean().optional(),
});

export const upsertCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  imageUrl: z.string().optional().nullable(),
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
    "EXPLORE",
  ]),
  shopId: z.string().optional(),
  tableId: z.string().optional(),
  productId: z.string().optional(),
  locationId: z.string().optional(),
  orderId: z.string().optional(),
  label: z.string().max(80).optional(),
  // Presentation only — never affects the token or destination.
  templateId: z.string().max(64).optional(),
  ctaOverride: z.string().max(40).optional(),
});

export const createReviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  tags: z.array(z.string()).max(10).default([]),
  media: z
    .array(
      z.object({
        type: z.enum(["IMAGE", "VIDEO"]),
        url: z.string().min(1),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
      })
    )
    .max(10)
    .default([]),
});

// A message needs text or an image, never neither — an empty bubble isn't a real message.
export const sendMessageSchema = z
  .object({
    text: z.string().min(1).max(2000).optional(),
    mediaUrl: z.string().min(1).optional(),
    mimeType: z.string().optional(),
    fileSize: z.number().optional(),
  })
  .refine((d) => !!d.text || !!d.mediaUrl, { message: "Message needs text or an image" });

export const experienceReviewSchema = z.object({
  experienceRating: z.number().int().min(1).max(5),
  serviceRating: z.number().int().min(1).max(5).optional(),
  experienceComment: z.string().max(2000).optional(),
});

// Saved locations (spec: Home/Work/Family/...) — reuses the Address model, which already
// carries everything this needs (label, place, recipient identity) rather than a
// parallel table. Shared between the create (POST) and edit (PATCH) routes.
export const upsertLocationSchema = z.object({
  label: z.string().min(1).max(40),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  notes: z.string().max(200).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
  recipientName: z.string().max(100).optional(),
  recipientPhone: z.string().max(30).optional(),
  isDefault: z.boolean().optional(),
});
