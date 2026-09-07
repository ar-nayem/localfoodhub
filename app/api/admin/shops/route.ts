import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = req.nextUrl.searchParams.get("status");
  const shops = await prisma.shop.findMany({
    where: status ? { status } : {},
    include: { location: true, staff: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(shops);
}
