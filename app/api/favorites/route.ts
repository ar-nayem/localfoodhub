import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const favorites = await prisma.favorite.findMany({
    where: { userId: session.userId },
    include: { shop: true, product: { include: { shop: { select: { slug: true, name: true } } } } },
  });
  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const productId: string | undefined = body?.productId;
  if (!shopId && !productId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const favorite = await prisma.favorite.create({
    data: { userId: session.userId, shopId, productId },
  });
  return NextResponse.json(favorite, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const favorite = await prisma.favorite.findUnique({ where: { id } });
  if (!favorite || favorite.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.favorite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
