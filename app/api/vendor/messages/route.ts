import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";

// Every conversation across every shop this staff member has access to, newest activity
// first — the vendor-side inbox (a customer's order page is per-order, so it never needed
// an equivalent list).
export async function GET() {
  const auth = await requireShopAccess(null);
  if ("error" in auth) return auth.error;

  const conversations = await prisma.conversation.findMany({
    where: { shopId: { in: auth.session.shopIds } },
    include: {
      order: { select: { orderNumber: true, guestName: true, customer: { select: { name: true } } } },
      shop: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: { where: { senderRole: "CUSTOMER", readAt: null } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    conversations.map((c) => ({
      orderId: c.orderId,
      orderNumber: c.order.orderNumber,
      shopName: c.shop.name,
      customerName: c.order.guestName ?? c.order.customer?.name ?? "Customer",
      lastMessage: c.messages[0]
        ? { text: c.messages[0].text, messageType: c.messages[0].messageType, createdAt: c.messages[0].createdAt.toISOString() }
        : null,
      unreadCount: c._count.messages,
      updatedAt: c.updatedAt.toISOString(),
    }))
  );
}
