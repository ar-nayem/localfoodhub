import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { upsertProductSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const products = await prisma.product.findMany({
    where: { shopId: shopId! },
    include: { category: true, options: { include: { values: true } }, addons: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const parsed = upsertProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid product" }, { status: 400 });
  }
  const d = parsed.data;

  const product = await prisma.product.create({
    data: {
      shopId: shopId!,
      categoryId: d.categoryId,
      name: d.name,
      description: d.description,
      price: d.price,
      discountPrice: d.discountPrice ?? null,
      imageUrl: d.imageUrl || null,
      status: d.status,
      prepTimeMinutes: d.prepTimeMinutes,
      ingredients: JSON.stringify(d.ingredients),
      allergens: JSON.stringify(d.allergens),
      dietaryTags: JSON.stringify(d.dietaryTags),
    },
  });
  return NextResponse.json(product, { status: 201 });
}
