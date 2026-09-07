import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recalculateShopRating } from "@/lib/reviews/rollup";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const review = await prisma.review.findUnique({ where: { id: params.id } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (review.userId !== session.userId) {
    return NextResponse.json({ error: "You can only edit your own review." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const rating = typeof body?.rating === "number" ? Math.min(5, Math.max(1, body.rating)) : undefined;
  const comment = typeof body?.comment === "string" ? body.comment.slice(0, 2000) : undefined;

  const updated = await prisma.review.update({
    where: { id: params.id },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(comment !== undefined ? { comment } : {}),
    },
  });

  await recalculateShopRating(review.shopId);
  return NextResponse.json(updated);
}

// Customer deletes their own review (spec Section 217) — removed from public display;
// this pass hard-deletes rather than soft-hiding for audit, which is an acceptable
// simplification since there's no moderation queue reading a "deleted but retained" state.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const review = await prisma.review.findUnique({ where: { id: params.id } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (review.userId !== session.userId) {
    return NextResponse.json({ error: "You can only delete your own review." }, { status: 403 });
  }

  await prisma.review.delete({ where: { id: params.id } });
  await recalculateShopRating(review.shopId);
  return NextResponse.json({ ok: true });
}
