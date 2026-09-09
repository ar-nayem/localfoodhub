import { prisma } from "@/lib/prisma";

/**
 * Platform commission on each paid order, as a percentage. A payout figure is only as
 * honest as the rate behind it, so this is one named constant rather than a number
 * scattered through the finance views — change it here and every payout, chart and CSV
 * moves together.
 */
export const PLATFORM_COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 15);

/** Only money that actually arrived counts as revenue. Pending and failed orders are
 * excluded everywhere, so the dashboard can never read higher than the bank. */
const PAID = { paymentStatus: "PAID" as const };

// Bucket keys are built from *local* date parts, never toISOString(). Local midnight
// converted to UTC lands on the previous day anywhere east of Greenwich, which silently
// shifted every bucket by one and dropped the current month off the payout chart
// entirely. Dhaka is UTC+6, so this is not a hypothetical.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface DailyPoint {
  date: string;
  revenue: number;
  orders: number;
}

/** Fills gaps with zeroes: a day with no orders is a real data point (a flat run in the
 * line), not a missing one the chart should interpolate across. */
export async function salesByDay(days: number): Promise<DailyPoint[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const orders = await prisma.order.findMany({
    where: { ...PAID, createdAt: { gte: since } },
    select: { createdAt: true, total: true },
  });

  const buckets = new Map<string, DailyPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = dayKey(d);
    buckets.set(key, { date: key, revenue: 0, orders: 0 });
  }
  for (const o of orders) {
    const b = buckets.get(dayKey(o.createdAt));
    if (b) {
      b.revenue += o.total;
      b.orders += 1;
    }
  }
  return [...buckets.values()];
}

export interface ShopFinance {
  shopId: string;
  shopName: string;
  locationName: string | null;
  orders: number;
  grossRevenue: number;
  commission: number;
  payout: number;
  averageOrderValue: number;
}

export async function financeByShop(since?: Date): Promise<ShopFinance[]> {
  const shops = await prisma.shop.findMany({
    select: {
      id: true,
      name: true,
      location: { select: { name: true } },
      orders: {
        where: { ...PAID, ...(since ? { createdAt: { gte: since } } : {}) },
        select: { total: true },
      },
    },
  });

  return shops
    .map((s) => {
      const grossRevenue = s.orders.reduce((sum, o) => sum + o.total, 0);
      const commission = Math.round(grossRevenue * (PLATFORM_COMMISSION_PERCENT / 100));
      return {
        shopId: s.id,
        shopName: s.name,
        locationName: s.location?.name ?? null,
        orders: s.orders.length,
        grossRevenue,
        commission,
        payout: grossRevenue - commission,
        averageOrderValue: s.orders.length ? Math.round(grossRevenue / s.orders.length) : 0,
      };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);
}

export interface MonthlyPayout {
  month: string;
  grossRevenue: number;
  commission: number;
  payout: number;
  orders: number;
}

export async function payoutsByMonth(months: number): Promise<MonthlyPayout[]> {
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  since.setMonth(since.getMonth() - (months - 1));

  const orders = await prisma.order.findMany({
    where: { ...PAID, createdAt: { gte: since } },
    select: { createdAt: true, total: true, shopId: true },
  });

  const buckets = new Map<string, MonthlyPayout>();
  for (let i = 0; i < months; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const key = monthKey(d);
    buckets.set(key, { month: key, grossRevenue: 0, commission: 0, payout: 0, orders: 0 });
  }

  // Commission is rounded per shop per month, then summed — because that is the unit
  // actually settled. Rounding the month's combined gross instead drifts by a taka or two
  // against the sum of the individual payouts, and a payouts table whose total disagrees
  // with its own rows is one nobody can reconcile against a bank transfer.
  const perShopMonth = new Map<string, { month: string; gross: number }>();
  for (const o of orders) {
    const month = monthKey(o.createdAt);
    const bucket = buckets.get(month);
    if (!bucket) continue;
    bucket.grossRevenue += o.total;
    bucket.orders += 1;

    const key = `${month}::${o.shopId}`;
    const entry = perShopMonth.get(key) ?? { month, gross: 0 };
    entry.gross += o.total;
    perShopMonth.set(key, entry);
  }

  for (const { month, gross } of perShopMonth.values()) {
    const bucket = buckets.get(month);
    if (bucket) bucket.commission += Math.round(gross * (PLATFORM_COMMISSION_PERCENT / 100));
  }
  for (const b of buckets.values()) {
    b.payout = b.grossRevenue - b.commission;
  }
  return [...buckets.values()];
}

export const AGE_BRACKETS = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;

export function bracketForBirthDate(dob: Date, now = new Date()): string {
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age--;
  if (age < 18) return "Under 18";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  return "55+";
}
