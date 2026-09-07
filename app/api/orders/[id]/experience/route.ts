import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { experienceReviewSchema } from "@/lib/validation/schemas";

// Overall order experience — separate from per-item food reviews (spec Section 205-208):
// delivery orders can rate delivery, pickup orders pickup, dine-in orders service.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order || order.customerId !== session.userId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.orderStatus !== "COMPLETED") {
    return NextResponse.json({ error: "You can only review completed orders." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = experienceReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      experienceRating: parsed.data.experienceRating,
      serviceRating: parsed.data.serviceRating,
      experienceComment: parsed.data.experienceComment,
      experienceReviewedAt: new Date(),
    },
  });
  return NextResponse.json(updated);
}
