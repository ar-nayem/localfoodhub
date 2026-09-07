import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/media/save";

// Public within an authenticated session: uploads a review photo/video ahead of
// submitting the review itself (spec Section 197/199) — gated the same way review
// creation is: the requester must be the customer on a COMPLETED order containing this
// order item, so a stranger can't stage uploads against someone else's order.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to add photos or video." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const orderItemId = form.get("orderItemId");
  const kind = form.get("kind"); // "image" | "video"
  const file = form.get("file");

  if (typeof orderItemId !== "string" || (kind !== "image" && kind !== "video") || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file, orderItemId, or kind" }, { status: 400 });
  }

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true },
  });
  if (!orderItem || orderItem.order.customerId !== session.userId) {
    return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  }
  if (orderItem.order.orderStatus !== "COMPLETED") {
    return NextResponse.json({ error: "You can only review completed orders." }, { status: 400 });
  }

  try {
    const saved = await saveUploadedFile(file, session.userId, kind);
    return NextResponse.json({
      type: kind === "image" ? "IMAGE" : "VIDEO",
      url: saved.url,
      mimeType: saved.mimeType,
      fileSize: saved.fileSize,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed. Please try again." },
      { status: 400 }
    );
  }
}
