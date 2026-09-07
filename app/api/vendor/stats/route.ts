import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayOrders, pending, preparing, completed, cancelled, qrAgg, discoveryEvents, shop, categories, tables] =
    await Promise.all([
      prisma.order.findMany({ where: { shopId: shopId!, createdAt: { gte: startOfDay } } }),
      prisma.order.count({ where: { shopId: shopId!, orderStatus: { in: ["PENDING", "CONFIRMED"] } } }),
      prisma.order.count({ where: { shopId: shopId!, orderStatus: "PREPARING" } }),
      prisma.order.count({ where: { shopId: shopId!, orderStatus: "COMPLETED" } }),
      prisma.order.count({ where: { shopId: shopId!, orderStatus: "CANCELLED" } }),
      prisma.qRCode.aggregate({ where: { shopId: shopId! }, _sum: { scanCount: true } }),
      prisma.discoveryEvent.groupBy({ by: ["action"], where: { shopId: shopId! }, _count: true }),
      prisma.shop.findUnique({ where: { id: shopId! } }),
      prisma.category.count({ where: { shopId: shopId! } }),
      prisma.table.count({ where: { shopId: shopId! } }),
    ]);

  const todayRevenue = todayOrders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + o.total, 0);

  const discovery = { shown: 0, clicked: 0, ordered: 0 };
  for (const row of discoveryEvents) {
    if (row.action === "SHOWN") discovery.shown = row._count;
    if (row.action === "CLICKED") discovery.clicked = row._count;
    if (row.action === "ORDERED") discovery.ordered = row._count;
  }

  // Setup checklist (spec Section 117) — a lightweight completion score instead of a
  // forced multi-step onboarding wizard; each item links straight to where it's fixed.
  const checklist = shop
    ? [
        { key: "logo", label: "Logo", done: !!shop.logoUrl, href: "/vendor/storefront" },
        { key: "banner", label: "Banner", done: !!shop.coverUrl, href: "/vendor/storefront" },
        { key: "description", label: "Shop description", done: shop.description.length > 10, href: "/vendor/settings" },
        { key: "categories", label: "Menu categories", done: categories > 0, href: "/vendor/menu" },
        { key: "products", label: "5+ menu items", done: (await prisma.product.count({ where: { shopId: shopId! } })) >= 5, href: "/vendor/menu" },
        { key: "tables", label: "Tables (for dine-in)", done: tables > 0, href: "/vendor/tables" },
        { key: "qr", label: "QR codes generated", done: (qrAgg._sum.scanCount ?? 0) >= 0 && (await prisma.qRCode.count({ where: { shopId: shopId! } })) > 0, href: "/vendor/qr" },
      ]
    : [];
  const completionPercent = checklist.length
    ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)
    : 0;

  return NextResponse.json({
    todayOrders: todayOrders.length,
    todayRevenue,
    pending,
    preparing,
    completed,
    cancelled,
    qrScans: qrAgg._sum.scanCount ?? 0,
    discovery,
    checklist,
    completionPercent,
  });
}
