import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Toggle a helpful vote — the unique constraint on (reviewId, userId) is what actually
// enforces "one vote per customer per review" (spec Section 218), this route just
// creates or removes that row and keeps the denormalized counter in sync.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });

  const review = await prisma.review.findUnique({ where: { id: params.id } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.reviewHelpfulVote.findUnique({
    where: { reviewId_userId: { reviewId: params.id, userId: session.userId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.reviewHelpfulVote.delete({ where: { id: existing.id } }),
      prisma.review.update({ where: { id: params.id }, data: { helpfulCount: { decrement: 1 } } }),
    ]);
    return NextResponse.json({ voted: false });
  }

  await prisma.$transaction([
    prisma.reviewHelpfulVote.create({ data: { reviewId: params.id, userId: session.userId } }),
    prisma.review.update({ where: { id: params.id }, data: { helpfulCount: { increment: 1 } } }),
  ]);
  return NextResponse.json({ voted: true });
}
