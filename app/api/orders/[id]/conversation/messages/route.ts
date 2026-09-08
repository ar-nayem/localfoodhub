import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrderForConversation, resolveConversationViewer } from "@/lib/messaging/access";
import { sendMessageSchema } from "@/lib/validation/schemas";
import { notificationService } from "@/lib/notifications/ConsoleProvider";

// Sends a message and lazily creates the thread on its first use — most orders never get
// one, so nothing is created just from a customer opening their order page.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const order = await getOrderForConversation(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const viewer = await resolveConversationViewer(order);
  if (!viewer) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
  }

  const conversation = await prisma.conversation.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, shopId: order.shopId, customerId: order.customerId },
    update: {},
  });

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: viewer.session?.userId ?? null,
      senderRole: viewer.viewerRole,
      messageType: parsed.data.mediaUrl ? "IMAGE" : "TEXT",
      text: parsed.data.text,
      mediaUrl: parsed.data.mediaUrl,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
    },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  const preview = parsed.data.text ?? "Sent a photo";
  if (viewer.viewerRole === "CUSTOMER") {
    // Notify every staff member of the shop — any of them may be the one watching Orders.
    const staff = await prisma.shopStaff.findMany({ where: { shopId: order.shopId }, select: { userId: true } });
    await Promise.all(
      staff.map((s) =>
        notificationService.send({
          userId: s.userId,
          type: "NEW_MESSAGE",
          title: `New message · Order #${order.orderNumber}`,
          body: preview,
          orderId: order.id,
          shopId: order.shopId,
        })
      )
    );
  } else if (order.customerId) {
    await notificationService.send({
      userId: order.customerId,
      type: "NEW_MESSAGE",
      title: `${order.shop.name} sent a message`,
      body: preview,
      orderId: order.id,
      shopId: order.shopId,
    });
  }

  return NextResponse.json(
    {
      id: message.id,
      senderRole: message.senderRole,
      messageType: message.messageType,
      text: message.text,
      mediaUrl: message.mediaUrl,
      createdAt: message.createdAt.toISOString(),
      readAt: null,
    },
    { status: 201 }
  );
}
