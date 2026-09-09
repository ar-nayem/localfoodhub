import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/auth";
import {
  salesByDay,
  financeByShop,
  payoutsByMonth,
  bracketForBirthDate,
  PLATFORM_COMMISSION_PERCENT,
} from "@/lib/admin/analytics";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days") ?? 30), 7), 365);

  const [daily, shops, monthly, byType, customers, locations, topProducts] = await Promise.all([
    salesByDay(days),
    financeByShop(),
    payoutsByMonth(12),
    prisma.order.groupBy({
      by: ["orderType"],
      where: { paymentStatus: "PAID" },
      _count: true,
      _sum: { total: true },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { dateOfBirth: true, createdAt: true },
    }),
    prisma.location.findMany({
      select: {
        id: true,
        name: true,
        shops: {
          select: {
            id: true,
            orders: { where: { paymentStatus: "PAID" }, select: { total: true } },
          },
        },
      },
    }),
    // Line revenue is price × quantity, which groupBy can't sum on its own, so this
    // aggregates in JS. Scoped to paid orders so unpaid carts never inflate a bestseller.
    prisma.orderItem.findMany({
      where: { order: { paymentStatus: "PAID" } },
      select: { productId: true, name: true, price: true, quantity: true },
    }),
  ]);

  // Demographics are reported against the customers who actually gave a birthday, and the
  // gap is reported alongside — a percentage over an unknown denominator would read as
  // fact when it's mostly missing data.
  const productTotals = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();
  for (const item of topProducts) {
    const entry = productTotals.get(item.productId) ?? {
      productId: item.productId,
      name: item.name,
      quantity: 0,
      revenue: 0,
    };
    entry.quantity += item.quantity;
    entry.revenue += item.price * item.quantity;
    productTotals.set(item.productId, entry);
  }
  const bestSellers = [...productTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const withDob = customers.filter((c) => c.dateOfBirth);
  const ageCounts = new Map<string, number>();
  for (const c of withDob) {
    const bracket = bracketForBirthDate(c.dateOfBirth!);
    ageCounts.set(bracket, (ageCounts.get(bracket) ?? 0) + 1);
  }

  return NextResponse.json({
    commissionPercent: PLATFORM_COMMISSION_PERCENT,
    daily,
    shops,
    monthly,
    orderTypes: byType.map((t) => ({
      orderType: t.orderType,
      orders: t._count,
      revenue: t._sum.total ?? 0,
    })),
    topProducts: bestSellers,
    locations: locations
      .map((l) => {
        const orders = l.shops.flatMap((s) => s.orders);
        return {
          id: l.id,
          name: l.name,
          shops: l.shops.length,
          orders: orders.length,
          revenue: orders.reduce((sum, o) => sum + o.total, 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue),
    demographics: {
      totalCustomers: customers.length,
      withBirthDate: withDob.length,
      brackets: [...ageCounts.entries()].map(([bracket, count]) => ({ bracket, count })),
    },
  });
}
