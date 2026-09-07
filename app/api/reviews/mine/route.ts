import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canActOnOrder } from "@/lib/orders/access";

// Lets the order-confirmation/tracking page know which items the current customer has
// already reviewed, so it can show "Edit your review" instead of "Rate this item".
export async function GET(req: NextRequest) {
  const session = await getSession();

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { customerId: true },
  });
  if (!order || !canActOnOrder(order, session)) return NextResponse.json({ reviews: [] });

  // Scoped to the order, which the requester has already proved access to — a guest's
  // reviews on their own order have no userId to filter by.
  const reviews = await prisma.review.findMany({
    where: { orderId },
    include: { media: true },
  });
  return NextResponse.json({ reviews });
}
