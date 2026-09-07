import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAccentColorSafe } from "@/lib/storefront/theme";

const PUBLISHABLE_FIELDS = [
  "logoUrl",
  "coverUrl",
  "bannerText",
  "bannerCta",
  "themePreset",
  "accentColor",
  "sectionsConfig",
  "discoveryEnabled",
] as const;

// Storefront theme/banner/section editing is owner-only (spec Section 140) — kitchen and
// order staff can run the till but shouldn't be able to change what customers see.
async function requireOwner(shopId: string | null) {
  const session = await getSession();
  if (!session || session.role !== "SHOP_OWNER" || !shopId || !session.shopIds.includes(shopId)) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const session = await requireOwner(shopId);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shop = await prisma.shop.findUnique({ where: { id: shopId! } });
  if (!shop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const published = Object.fromEntries(PUBLISHABLE_FIELDS.map((f) => [f, (shop as any)[f]]));
  const draft = shop.draftConfig ? JSON.parse(shop.draftConfig) : null;
  return NextResponse.json({ published, draft, hasUnpublishedChanges: !!draft });
}

// Save Draft — never touches the live/published columns customers see (spec Section 114).
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const session = await requireOwner(shopId ?? null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patch = body?.patch;
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "Invalid patch" }, { status: 400 });
  }
  if (patch.accentColor && !isAccentColorSafe(patch.accentColor)) {
    return NextResponse.json(
      { error: "That color is too light to keep button text readable — pick a darker shade." },
      { status: 400 }
    );
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId! } });
  if (!shop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentDraft = shop.draftConfig ? JSON.parse(shop.draftConfig) : {};
  const nextDraft = { ...currentDraft, ...patch };
  await prisma.shop.update({ where: { id: shop.id }, data: { draftConfig: JSON.stringify(nextDraft) } });

  return NextResponse.json({ ok: true, draft: nextDraft });
}

// Publish — copies the draft onto the live columns customers actually see, then clears
// the draft and writes a revision snapshot (spec Section 114/115).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const session = await requireOwner(shopId ?? null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shop = await prisma.shop.findUnique({ where: { id: shopId! } });
  if (!shop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!shop.draftConfig) return NextResponse.json({ error: "No unpublished changes" }, { status: 400 });

  const draft = JSON.parse(shop.draftConfig);
  const data: Record<string, unknown> = { draftConfig: null };
  for (const field of PUBLISHABLE_FIELDS) {
    if (field in draft) data[field] = draft[field];
  }

  const updated = await prisma.shop.update({ where: { id: shop.id }, data });

  const snapshot = Object.fromEntries(PUBLISHABLE_FIELDS.map((f) => [f, (updated as any)[f]]));
  await prisma.shopRevision.create({
    data: { shopId: shop.id, config: JSON.stringify(snapshot), publishedById: session.userId },
  });

  return NextResponse.json({ ok: true, published: snapshot });
}
