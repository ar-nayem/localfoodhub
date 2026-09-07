import { prisma } from "../prisma";
import { formatMoney } from "../utils";
import { ORDER_STATUS_LABEL } from "../constants";
import type { QrTemplateData } from "./templates/types";

/**
 * Layer 5: gathering the vendor/order values a template may display.
 *
 * Read fresh on every render, which is what lets a printed card stay correct: the QR's
 * token never changes, so re-pricing a dish or moving an order along simply produces
 * different text the next time a card is rendered — no re-issued code, no reprint needed
 * for the destination to keep working.
 */
export async function buildTemplateData(qrCodeId: string): Promise<QrTemplateData> {
  const qr = await prisma.qRCode.findUnique({
    where: { id: qrCodeId },
    include: {
      shop: { select: { name: true, logoUrl: true, category: true, rating: true, ratingCount: true } },
      table: { select: { label: true, area: true } },
      product: { select: { name: true, imageUrl: true, price: true, discountPrice: true } },
      order: { select: { orderNumber: true, orderStatus: true, orderType: true } },
    },
  });
  if (!qr) return {};

  const data: QrTemplateData = {
    shopName: qr.shop?.name,
    shopLogoUrl: qr.shop?.logoUrl,
    shopCategory: qr.shop?.category,
    cta: qr.ctaOverride ?? undefined,
  };

  if (qr.table) {
    data.tableLabel = qr.table.label;
    data.tableArea = qr.table.area;
  }

  if (qr.product) {
    data.productName = qr.product.name;
    data.productImageUrl = qr.product.imageUrl;
    data.price = formatMoney(qr.product.discountPrice ?? qr.product.price);
    if (qr.product.discountPrice != null) data.originalPrice = formatMoney(qr.product.price);
  }

  if (qr.shop && qr.shop.ratingCount > 0) {
    data.rating = qr.shop.rating.toFixed(1);
    data.reviewCount = String(qr.shop.ratingCount);
  }

  if (qr.order) {
    data.orderNumber = qr.order.orderNumber;
    data.orderStatus = ORDER_STATUS_LABEL[qr.order.orderStatus] ?? qr.order.orderStatus;
    data.orderType = qr.order.orderType;
  }

  return data;
}

/** Data for a card that has not been saved yet, so the designer can preview before the
 * vendor commits — same shape, sourced from the chosen reference row. */
export async function buildPreviewData({
  shopId,
  type,
  tableId,
  productId,
  orderId,
  cta,
}: {
  shopId: string;
  type: string;
  tableId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  cta?: string | null;
}): Promise<QrTemplateData> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { name: true, logoUrl: true, category: true, rating: true, ratingCount: true },
  });

  const data: QrTemplateData = {
    shopName: shop?.name,
    shopLogoUrl: shop?.logoUrl,
    shopCategory: shop?.category,
    cta: cta ?? undefined,
  };
  if (shop && shop.ratingCount > 0) {
    data.rating = shop.rating.toFixed(1);
    data.reviewCount = String(shop.ratingCount);
  }

  if (tableId) {
    const table = await prisma.table.findUnique({ where: { id: tableId }, select: { label: true, area: true } });
    if (table) {
      data.tableLabel = table.label;
      data.tableArea = table.area;
    }
  }

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, imageUrl: true, price: true, discountPrice: true },
    });
    if (product) {
      data.productName = product.name;
      data.productImageUrl = product.imageUrl;
      data.price = formatMoney(product.discountPrice ?? product.price);
      if (product.discountPrice != null) data.originalPrice = formatMoney(product.price);
    }
  }

  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, orderStatus: true, orderType: true },
    });
    if (order) {
      data.orderNumber = order.orderNumber;
      data.orderStatus = ORDER_STATUS_LABEL[order.orderStatus] ?? order.orderStatus;
      data.orderType = order.orderType;
    }
  }

  // Sample values so an unsaved preview never renders visibly empty.
  if (type === "TABLE" && !data.tableLabel) data.tableLabel = "07";
  if (type === "PRODUCT" && !data.productName) {
    data.productName = "Your dish";
    data.price = formatMoney(0);
  }
  if ((type === "ORDER" || type === "PICKUP" || type === "DELIVERY") && !data.orderNumber) {
    data.orderNumber = "10482";
    data.orderStatus = "Ready";
  }

  return data;
}
