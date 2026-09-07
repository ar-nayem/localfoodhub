import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { upsertCategorySchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const categories = await prisma.category.findMany({
    where: { shopId: shopId! },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const parsed = upsertCategorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  const count = await prisma.category.count({ where: { shopId: shopId! } });
  const category = await prisma.category.create({
    data: { shopId: shopId!, name: parsed.data.name, sortOrder: count },
  });
  return NextResponse.json(category, { status: 201 });
}
