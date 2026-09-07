import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayOrders, pending, preparing, completed, cancelled, qrAgg] = await Promise.all([
    prisma.order.findMany({ where: { shopId: shopId!, createdAt: { gte: startOfDay } } }),
    prisma.order.count({ where: { shopId: shopId!, orderStatus: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.order.count({ where: { shopId: shopId!, orderStatus: "PREPARING" } }),
    prisma.order.count({ where: { shopId: shopId!, orderStatus: "COMPLETED" } }),
    prisma.order.count({ where: { shopId: shopId!, orderStatus: "CANCELLED" } }),
    prisma.qRCode.aggregate({ where: { shopId: shopId! }, _sum: { scanCount: true } }),
  ]);

  const todayRevenue = todayOrders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + o.total, 0);

  return NextResponse.json({
    todayOrders: todayOrders.length,
    todayRevenue,
    pending,
    preparing,
    completed,
    cancelled,
    qrScans: qrAgg._sum.scanCount ?? 0,
  });
}
