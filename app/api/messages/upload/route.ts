import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/media/save";
import { getOrderForConversation, resolveConversationViewer } from "@/lib/messaging/access";

// Same two-step pattern as review photo uploads (app/api/reviews/media/route.ts): upload
// first, get back a URL, then send it as a normal message — chat never needs its own
// storage/validation logic, it's the same saveUploadedFile everything else already uses.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const orderId = form?.get("orderId");
  const file = form?.get("file");
  if (typeof orderId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file or orderId" }, { status: 400 });
  }

  const order = await getOrderForConversation(orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const viewer = await resolveConversationViewer(order);
  if (!viewer) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  try {
    const saved = await saveUploadedFile(file, `chat/${order.id}`, "image");
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed. Please try again." },
      { status: 400 }
    );
  }
}
