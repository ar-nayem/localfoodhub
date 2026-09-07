import { prisma } from "../prisma";
import { generateOrderNumber } from "../utils";
import { resolveTableFromToken, markQrScanConverted } from "../qr/resolve";
import type { z } from "zod";
import type { createOrderSchema } from "../validation/schemas";

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export class OrderCreationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * The single place an order gets created. Everything money- or table-related is
 * recomputed from the DB here — the client's cart only supplies productId/quantity/
 * selected option & addon labels, never prices, and dine-in orders only ever supply a
 * table QR *token*, never a tableId (spec Rule 4). Idempotent on `idempotencyKey` (Rule
 * 10 / Section 50): a retried submission returns the original order instead of creating
 * a second one.
 */
export async function createOrder(
  input: CreateOrderInput,
  customerId: string | null
) {
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { items: true },
  });
  if (existing) return { order: existing, alreadyExisted: true };

  const shop = await prisma.shop.findUnique({ where: { id: input.shopId } });
  if (!shop || shop.status !== "ACTIVE") {
    throw new OrderCreationError("This shop isn't available right now.", 404);
  }
  if (input.orderType === "DELIVERY" && !shop.supportsDelivery) {
    throw new OrderCreationError("This shop doesn't offer delivery.");
  }
  if (input.orderType === "PICKUP" && !shop.supportsPickup) {
    throw new OrderCreationError("This shop doesn't offer pickup.");
  }
  if (input.orderType === "DINE_IN" && !shop.supportsDineIn) {
    throw new OrderCreationError("This shop doesn't offer dine-in ordering.");
  }

  // Guest info required for delivery/pickup so the shop/courier can reach the customer;
  // dine-in intentionally asks for the least (spec Section 43).
  if (!customerId && input.orderType !== "DINE_IN") {
    if (!input.guestName || !input.guestPhone) {
      throw new OrderCreationError("Name and phone are required to place this order.");
    }
  }

  let tableId: string | null = null;
  if (input.orderType === "DINE_IN") {
    if (!input.tableQrToken) {
      throw new OrderCreationError("Scan the table QR code to order dine-in.");
    }
    const resolved = await resolveTableFromToken(input.tableQrToken);
    if (!resolved || resolved.shopId !== shop.id) {
      throw new OrderCreationError("This table QR code isn't valid for this shop.", 422);
    }
    tableId = resolved.tableId;
  }

  // Recompute every price server-side from the current product/option/addon rows —
  // never trust a client-submitted price (spec Rule 7 covers availability; this is the
  // price-tampering equivalent).
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, shopId: shop.id },
    include: { options: { include: { values: true } }, addons: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const orderItemsData = input.items.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) throw new OrderCreationError("One of the items isn't available.", 422);
    if (product.status !== "AVAILABLE") {
      throw new OrderCreationError(`${product.name} is no longer available.`, 422);
    }

    const basePrice = product.discountPrice ?? product.price;
    let unitPrice = basePrice;
    const resolvedOptions = line.selectedOptions.map((sel) => {
      const option = product.options.find((o) => o.name === sel.optionName);
      const value = option?.values.find((v) => v.label === sel.valueLabel);
      const delta = value?.priceDelta ?? 0;
      unitPrice += delta;
      return { optionName: sel.optionName, valueLabel: sel.valueLabel, priceDelta: delta };
    });
    const resolvedAddons = line.selectedAddons.map((sel) => {
      const addon = product.addons.find((a) => a.name === sel.name);
      const price = addon?.price ?? 0;
      unitPrice += price;
      return { name: sel.name, price };
    });

    return {
      productId: product.id,
      name: product.name,
      price: unitPrice,
      quantity: line.quantity,
      selectedOptions: JSON.stringify(resolvedOptions),
      selectedAddons: JSON.stringify(resolvedAddons),
      notes: line.notes,
    };
  });

  const subtotal = orderItemsData.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (shop.minOrder > 0 && subtotal < shop.minOrder && input.orderType === "DELIVERY") {
    throw new OrderCreationError(`Minimum order for delivery is ৳${shop.minOrder}.`);
  }

  let discount = 0;
  let promotionId: string | null = null;
  if (input.promoCode) {
    const promo = await prisma.promotion.findFirst({
      where: { shopId: shop.id, code: input.promoCode, active: true },
    });
    const now = new Date();
    const promoValid =
      promo &&
      (!promo.startsAt || now >= promo.startsAt) &&
      (!promo.endsAt || now <= promo.endsAt) &&
      (promo.usageLimit === null || promo.usedCount < promo.usageLimit) &&
      subtotal >= promo.minOrder;
    if (promoValid) {
      discount =
        promo.type === "PERCENT"
          ? Math.round((subtotal * promo.value) / 100)
          : Math.min(promo.value, subtotal);
      promotionId = promo.id;
    }
  }

  const deliveryFee = input.orderType === "DELIVERY" ? shop.deliveryFee : 0;
  const total = subtotal - discount + deliveryFee;

  let deliveryAddressId: string | null = null;
  if (input.orderType === "DELIVERY") {
    if (!input.deliveryAddress) {
      throw new OrderCreationError("A delivery address is required.");
    }
    const address = await prisma.address.create({
      data: {
        userId: customerId ?? undefined,
        line1: input.deliveryAddress.line1,
        line2: input.deliveryAddress.line2,
        city: input.deliveryAddress.city,
      },
    });
    deliveryAddressId = address.id;
  }

  let orderNumber = generateOrderNumber();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.order.findUnique({ where: { orderNumber } });
    if (!clash) break;
    orderNumber = generateOrderNumber();
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        idempotencyKey: input.idempotencyKey,
        customerId,
        guestName: customerId ? null : input.guestName,
        guestPhone: customerId ? null : input.guestPhone,
        shopId: shop.id,
        orderType: input.orderType,
        tableId,
        deliveryAddressId,
        pickupTime:
          input.pickupTime && input.pickupTime !== "ASAP" ? new Date(input.pickupTime) : null,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        subtotal,
        discount,
        deliveryFee,
        serviceFee: 0,
        tax: 0,
        total,
        promotionId,
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
        notes: input.notes,
        items: { create: orderItemsData },
        statusEvents: { create: { status: "PENDING" } },
      },
      include: { items: true, shop: true, table: true },
    });

    if (tableId) {
      await tx.table.update({ where: { id: tableId }, data: { status: "ORDERING" } });
    }
    if (promotionId) {
      await tx.promotion.update({ where: { id: promotionId }, data: { usedCount: { increment: 1 } } });
    }

    return created;
  });

  const conversionToken = input.entryQrToken ?? input.tableQrToken;
  if (conversionToken) {
    await markQrScanConverted(conversionToken).catch(() => undefined);
  }

  return { order, alreadyExisted: false };
}
