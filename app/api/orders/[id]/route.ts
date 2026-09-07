import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaffRole } from "@/lib/auth";
import { updateOrderStatusSchema } from "@/lib/validation/schemas";
import { ORDER_STATUS_FLOW, type OrderType } from "@/lib/constants";
import { notificationService } from "@/lib/notifications/ConsoleProvider";

// Guest orders (customerId null) stay link-accessible without login — same model as most
// checkout confirmation URLs. An order placed by a signed-in customer is only readable by
// that customer or staff of the order's shop; everyone else gets 404 (spec Rule 11).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      shop: true,
      table: true,
      deliveryAddress: true,
      payment: true,
      qrCode: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.customerId) {
    const session = await getSession();
    const isOwner = session?.userId === order.customerId;
    const isStaff = !!session && isStaffRole(session.role) && session.shopIds.includes(order.shopId);
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
  }

  return NextResponse.json(order);
}

// Staff-only: move an order forward through its workflow (spec Section 22/78).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!session.shopIds.includes(order.shopId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const nextStatus = parsed.data.status;
  if (order.orderStatus === "CANCELLED") {
    return NextResponse.json(
      { error: "This order was cancelled by the customer and can no longer be updated." },
      { status: 409 }
    );
  }
  if (nextStatus !== "CANCELLED") {
    const flow = ORDER_STATUS_FLOW[order.orderType as OrderType];
    const currentIndex = flow.indexOf(order.orderStatus);
    const nextIndex = flow.indexOf(nextStatus);
    if (nextIndex === -1 || nextIndex < currentIndex) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }
  }

  // Optimistic concurrency: only move the order if it is still in the status we validated
  // against. A customer cancelling at the same instant flips that status first, so this
  // update matches nothing and we report the conflict instead of silently clobbering the
  // cancellation (an order must never end up both ACCEPTED and CANCELLED).
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, orderStatus: order.orderStatus },
    data: { orderStatus: nextStatus },
  });
  if (claimed.count === 0) {
    const current = await prisma.order.findUnique({ where: { id: order.id } });
    return NextResponse.json(
      {
        error:
          current?.orderStatus === "CANCELLED"
            ? "This order was just cancelled by the customer."
            : "This order was updated by someone else. Refresh and try again.",
      },
      { status: 409 }
    );
  }
  const updated = (await prisma.order.findUnique({ where: { id: order.id } }))!;

  if (updated.tableId) {
    const tableStatus =
      nextStatus === "PREPARING" ? "PREPARING" : nextStatus === "READY" ? "READY" : undefined;
    if (tableStatus) {
      await prisma.table.update({ where: { id: updated.tableId }, data: { status: tableStatus } });
    }
    if (nextStatus === "COMPLETED") {
      await prisma.table.update({ where: { id: updated.tableId }, data: { status: "CLEANING" } });
    }
  }

  if (updated.customerId) {
    await notificationService.send({
      userId: updated.customerId,
      type: "ORDER_STATUS",
      title: `Order #${updated.orderNumber} updated`,
      body: statusMessage(nextStatus),
      orderId: updated.id,
      shopId: updated.shopId,
    });
  }

  // Return the same shape as GET (with relations) — callers like OrderView poll this
  // endpoint and render order.shop.name/table/items unconditionally, so a bare row here
  // would crash the client on the very next render.
  const full = await prisma.order.findUnique({
    where: { id: updated.id },
    include: { items: true, shop: true, table: true, deliveryAddress: true, payment: true, qrCode: true },
  });
  return NextResponse.json(full);
}

function statusMessage(status: string): string {
  switch (status) {
    case "ACCEPTED":
      return "The shop accepted your order.";
    case "PREPARING":
      return "Your food is being prepared.";
    case "READY":
      return "Your order is ready!";
    case "COMPLETED":
      return "Order complete. Enjoy your meal!";
    case "CANCELLED":
      return "Your order was cancelled.";
    default:
      return `Order status: ${status}`;
  }
}
