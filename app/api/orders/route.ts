import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaffRole } from "@/lib/auth";
import { createOrderSchema } from "@/lib/validation/schemas";
import { createOrder, OrderCreationError } from "@/lib/orders/createOrder";

// Public: order history for the logged-in customer, or (for staff) their shop's orders.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = req.nextUrl.searchParams.get("shopId");
  if (shopId && isStaffRole(session.role)) {
    if (!session.shopIds.includes(shopId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const orders = await prisma.order.findMany({
      where: { shopId },
      include: { items: true, table: true, deliveryAddress: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(orders);
  }

  const orders = await prisma.order.findMany({
    where: { customerId: session.userId },
    include: { items: true, shop: { select: { name: true, slug: true, logoUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

// Public (guest-friendly): place an order for delivery, pickup, or dine-in.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order" }, { status: 400 });
  }

  const session = await getSession();
  const customerId = session && session.role === "CUSTOMER" ? session.userId : null;

  try {
    const { order, alreadyExisted } = await createOrder(parsed.data, customerId);
    return NextResponse.json(order, { status: alreadyExisted ? 200 : 201 });
  } catch (err) {
    if (err instanceof OrderCreationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
