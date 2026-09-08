import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrderForConversation, resolveConversationViewer } from "@/lib/messaging/access";

// Read-only: never creates the thread (most orders never need one) — sending the first
// message is what creates it, see ./messages/route.ts. Returns an empty/null thread
// rather than 404 for a real order with no conversation yet, so the UI can render a
// normal "say hello" composer instead of an error state.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await getOrderForConversation(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const viewer = await resolveConversationViewer(order);
  if (!viewer) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const conversation = await prisma.conversation.findUnique({
    where: { orderId: order.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    conversationId: conversation?.id ?? null,
    viewerRole: viewer.viewerRole,
    order: { orderNumber: order.orderNumber },
    shop: { name: order.shop.name, phone: order.shop.phone },
    // The other side's identity — only useful (and only sent) to the vendor, so a
    // customer's chat header never has to guess who's replying.
    counterpart:
      viewer.viewerRole === "VENDOR"
        ? { name: order.guestName ?? order.customer?.name ?? "Customer", phone: order.guestPhone ?? order.customer?.phone ?? null }
        : null,
    messages: (conversation?.messages ?? []).map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      messageType: m.messageType,
      text: m.text,
      mediaUrl: m.mediaUrl,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt?.toISOString() ?? null,
    })),
  });
}
