import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const [reviews, breakdown, mediaCount] = await Promise.all([
    prisma.review.findMany({
      where: { shopId: shopId!, status: "PUBLISHED" },
      include: { user: { select: { name: true } }, product: { select: { name: true } }, media: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.review.groupBy({ by: ["rating"], where: { shopId: shopId!, status: "PUBLISHED" }, _count: true }),
    prisma.reviewMedia.count({ where: { review: { shopId: shopId! } } }),
  ]);

  const starBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: breakdown.find((b) => b.rating === star)?._count ?? 0,
  }));
  const total = reviews.length;
  const average = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

  return NextResponse.json({
    reviews,
    stats: {
      total,
      average: Math.round(average * 10) / 10,
      starBreakdown,
      withMedia: mediaCount,
      unanswered: reviews.filter((r) => !r.vendorResponse).length,
    },
  });
}
