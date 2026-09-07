import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const session = await getSession();
  if (!session || !shopId || !session.shopIds.includes(shopId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const staff = await prisma.shopStaff.findMany({
    where: { shopId },
    include: { user: { select: { name: true, email: true } } },
  });
  return NextResponse.json(staff);
}

// Owner-only: invite staff by email. If the email has no account yet, one is created
// with a random temporary password (in a real deploy this would email an invite link
// instead — the notification service abstraction is already in place for that).
export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const role: string | undefined = body?.role;
  const email: string | undefined = body?.email;
  const name: string | undefined = body?.name;

  if (!session || session.role !== "SHOP_OWNER" || !shopId || !session.shopIds.includes(shopId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!email || !name || !role || !["SHOP_STAFF", "KITCHEN_STAFF"].includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const tempPassword = randomBytes(6).toString("hex");
    user = await prisma.user.create({
      data: { email, name, role, passwordHash: await hashPassword(tempPassword) },
    });
  }

  const staff = await prisma.shopStaff.upsert({
    where: { shopId_userId: { shopId, userId: user.id } },
    update: { role },
    create: { shopId, userId: user.id, role },
  });

  return NextResponse.json(staff, { status: 201 });
}
