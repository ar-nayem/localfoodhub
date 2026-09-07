import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { saveUploadedImage } from "@/lib/vendor/media";

const MEDIA_TYPES = ["SHOP_LOGO", "BANNER", "FOOD", "GALLERY", "PROMOTION", "CATEGORY"];

// Centralized vendor media library (spec Section 102/161) — list what's been uploaded so
// a vendor can reuse an existing image instead of re-uploading the same file.
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const type = req.nextUrl.searchParams.get("type");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const media = await prisma.media.findMany({
    where: { shopId: shopId!, ...(type ? { type } : {}) },
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
  if (!MEDIA_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  try {
    const saved = await saveUploadedImage(file, shopId);
    const media = await prisma.media.create({
      data: { shopId, url: saved.url, type, mimeType: saved.mimeType, fileSize: saved.fileSize },
    });
    return NextResponse.json(media, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    );
  }
}

// Reports how many places reference this image before deleting (spec Section 163) —
// pass ?force=true to delete anyway once the vendor has seen that count.
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const force = req.nextUrl.searchParams.get("force") === "true";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(media.shopId);
  if ("error" in auth) return auth.error;

  const [shopLogo, shopCover, products, categories, promotions] = await Promise.all([
    prisma.shop.count({ where: { id: media.shopId, logoUrl: media.url } }),
    prisma.shop.count({ where: { id: media.shopId, coverUrl: media.url } }),
    prisma.product.count({ where: { shopId: media.shopId, imageUrl: media.url } }),
    prisma.category.count({ where: { shopId: media.shopId, imageUrl: media.url } }),
    prisma.promotion.count({ where: { shopId: media.shopId, imageUrl: media.url } }),
  ]);
  const usageCount = shopLogo + shopCover + products + categories + promotions;

  if (usageCount > 0 && !force) {
    return NextResponse.json({ error: "in_use", usageCount }, { status: 409 });
  }

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
