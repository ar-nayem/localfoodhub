import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrderForConversation, resolveConversationViewer } from "@/lib/messaging/access";

// Marks every message from the *other* side as read — called when a thread is opened.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await getOrderForConversation(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const viewer = await resolveConversationViewer(order);
  if (!viewer) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const conversation = await prisma.conversation.findUnique({ where: { orderId: order.id } });
  if (!conversation) return NextResponse.json({ ok: true });

  const otherRole = viewer.viewerRole === "CUSTOMER" ? "VENDOR" : "CUSTOMER";
  await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderRole: otherRole, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
