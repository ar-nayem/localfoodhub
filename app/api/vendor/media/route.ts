import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { saveUploadedImage } from "@/lib/vendor/media";

// Centralized vendor media library (spec Section 102) — list what's been uploaded so a
// vendor can reuse an existing image instead of re-uploading the same file.
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const media = await prisma.media.findMany({
    where: { shopId: shopId! },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(media);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const shopId = form.get("shopId");
  const type = form.get("type");
  const file = form.get("file");

  const auth = await requireShopAccess(typeof shopId === "string" ? shopId : null);
  if ("error" in auth) return auth.error;

  if (!(file instanceof File) || typeof shopId !== "string" || typeof type !== "string") {
    return NextResponse.json({ error: "Missing file, shopId, or type" }, { status: 400 });
  }
  if (!["SHOP_LOGO", "BANNER", "FOOD", "GALLERY"].includes(type)) {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  try {
    const url = await saveUploadedImage(file, shopId);
    const media = await prisma.media.create({ data: { shopId, url, type } });
    return NextResponse.json(media, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(media.shopId);
  if ("error" in auth) return auth.error;

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
