import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalShops, activeShops, pendingShops, totalCustomers, ordersToday, qrAgg, byType] =
    await Promise.all([
      prisma.shop.count(),
      prisma.shop.count({ where: { status: "ACTIVE" } }),
      prisma.shop.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.findMany({ where: { createdAt: { gte: startOfDay } } }),
      prisma.qRCode.aggregate({ _sum: { scanCount: true } }),
      prisma.order.groupBy({ by: ["orderType"], _count: true }),
    ]);

  const revenueToday = ordersToday
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + o.total, 0);

  return NextResponse.json({
    totalShops,
    activeShops,
    pendingShops,
    totalCustomers,
    ordersToday: ordersToday.length,
    revenueToday,
    qrScans: qrAgg._sum.scanCount ?? 0,
    ordersByType: byType,
  });
}
