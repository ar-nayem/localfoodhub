import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { upsertProductSchema } from "@/lib/validation/schemas";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(product.shopId);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = upsertProductSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  const d = parsed.data;

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(d.categoryId !== undefined ? { categoryId: d.categoryId } : {}),
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.price !== undefined ? { price: d.price } : {}),
      ...(d.discountPrice !== undefined ? { discountPrice: d.discountPrice } : {}),
      ...(d.imageUrl !== undefined ? { imageUrl: d.imageUrl || null } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.prepTimeMinutes !== undefined ? { prepTimeMinutes: d.prepTimeMinutes } : {}),
      ...(d.ingredients !== undefined ? { ingredients: JSON.stringify(d.ingredients) } : {}),
      ...(d.allergens !== undefined ? { allergens: JSON.stringify(d.allergens) } : {}),
      ...(d.dietaryTags !== undefined ? { dietaryTags: JSON.stringify(d.dietaryTags) } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireShopAccess(product.shopId);
  if ("error" in auth) return auth.error;

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
