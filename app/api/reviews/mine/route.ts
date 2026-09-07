import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Lets the order-confirmation/tracking page know which items the current customer has
// already reviewed, so it can show "Edit your review" instead of "Rate this item".
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ reviews: [] });

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const reviews = await prisma.review.findMany({
    where: { orderId, userId: session.userId },
    include: { media: true },
  });
  return NextResponse.json({ reviews });
}
