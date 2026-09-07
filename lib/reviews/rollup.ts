import { prisma } from "../prisma";

/** Recomputes a shop's public rating from its published reviews (spec Section 242).
 * Called after any review create/edit/delete. Shops with zero real reviews keep
 * whatever rating they were seeded with — only shops that actually have reviews get
 * recomputed, so the transition from "seeded placeholder" to "real average" is
 * one-directional and never reverts a shop to 0 just because it has no reviews yet. */
export async function recalculateShopRating(shopId: string): Promise<void> {
  const agg = await prisma.review.aggregate({
    where: { shopId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: true,
  });
  if (agg._count === 0) return;
  await prisma.shop.update({
    where: { id: shopId },
    data: {
      rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      ratingCount: agg._count,
    },
  });
}
