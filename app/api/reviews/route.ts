import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createReviewSchema } from "@/lib/validation/schemas";
import { recalculateShopRating } from "@/lib/reviews/rollup";
import { notificationService } from "@/lib/notifications/ConsoleProvider";

// Public: reviews for a product or a shop, newest first by default (spec Section 228 —
// full sort/filter set is deferred, "newest" and "highest/lowest" cover the common case).
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  const shopId = req.nextUrl.searchParams.get("shopId");
  const sort = req.nextUrl.searchParams.get("sort") ?? "newest";
  if (!productId && !shopId) {
    return NextResponse.json({ error: "productId or shopId required" }, { status: 400 });
  }

  const orderBy =
    sort === "highest"
      ? { rating: "desc" as const }
      : sort === "lowest"
        ? { rating: "asc" as const }
        : { createdAt: "desc" as const };

  const reviews = await prisma.review.findMany({
    where: {
      status: "PUBLISHED",
      ...(productId ? { productId } : {}),
      ...(shopId ? { shopId } : {}),
    },
    include: { user: { select: { name: true } }, media: true, product: { select: { name: true } } },
    orderBy,
    take: 50,
  });

  const agg = await prisma.review.aggregate({
    where: { status: "PUBLISHED", ...(productId ? { productId } : {}), ...(shopId ? { shopId } : {}) },
    _avg: { rating: true },
    _count: true,
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      tags: r.tags,
      helpfulCount: r.helpfulCount,
      vendorResponse: r.vendorResponse,
      vendorRespondedAt: r.vendorRespondedAt,
      createdAt: r.createdAt,
      customerName: displayName(r.user.name),
      productName: r.product.name,
      media: r.media,
    })),
    averageRating: agg._avg.rating ?? 0,
    totalReviews: agg._count,
  });
}

// Verified-purchase gated (spec Section 192/243): only the customer on a COMPLETED order
// containing this order item can review it, and only once — a second submission for the
// same orderItemId edits the existing review instead of creating a duplicate (Section 216/241).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review" }, { status: 400 });
  }
  const d = parsed.data;

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: d.orderItemId },
    include: { order: true },
  });
  if (!orderItem || orderItem.order.customerId !== session.userId) {
    return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  }
  if (orderItem.order.orderStatus !== "COMPLETED") {
    return NextResponse.json({ error: "You can only review completed orders." }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({ where: { orderItemId: d.orderItemId } });

  const review = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.review.update({
          where: { id: existing.id },
          data: { rating: d.rating, comment: d.comment, tags: JSON.stringify(d.tags) },
        })
      : await tx.review.create({
          data: {
            orderItemId: d.orderItemId,
            orderId: orderItem.orderId,
            productId: orderItem.productId,
            shopId: orderItem.order.shopId,
            userId: session.userId,
            rating: d.rating,
            comment: d.comment,
            tags: JSON.stringify(d.tags),
          },
        });

    if (existing) {
      await tx.reviewMedia.deleteMany({ where: { reviewId: saved.id } });
    }
    if (d.media.length > 0) {
      await tx.reviewMedia.createMany({
        data: d.media.map((m, i) => ({
          reviewId: saved.id,
          type: m.type,
          url: m.url,
          mimeType: m.mimeType,
          fileSize: m.fileSize,
          sortOrder: i,
        })),
      });
    }
    return saved;
  });

  await recalculateShopRating(orderItem.order.shopId);

  if (!existing) {
    const owner = await prisma.shopStaff.findFirst({
      where: { shopId: orderItem.order.shopId, role: "SHOP_OWNER" },
    });
    if (owner) {
      await notificationService.send({
        userId: owner.userId,
        type: "NEW_REVIEW",
        title: "New review",
        body: `${d.rating}★ review on order #${orderItem.order.orderNumber}`,
        orderId: orderItem.orderId,
        shopId: orderItem.order.shopId,
        productId: orderItem.productId,
      });
    }
  }

  return NextResponse.json(review, { status: existing ? 200 : 201 });
}

function displayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
