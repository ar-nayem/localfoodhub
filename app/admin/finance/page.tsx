"use client";

import { useEffect, useState } from "react";
import { Wallet, Store } from "lucide-react";
import { LineChart } from "@/components/admin/charts/LineChart";
import { BarChart } from "@/components/admin/charts/BarChart";
import { formatMoney } from "@/lib/utils";

interface FinanceData {
  commissionPercent: number;
  shops: {
    shopId: string;
    shopName: string;
    locationName: string | null;
    orders: number;
    grossRevenue: number;
    commission: number;
    payout: number;
    averageOrderValue: number;
  }[];
  monthly: { month: string; grossRevenue: number; commission: number; payout: number; orders: number }[];
}

export default function AdminFinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  const monthLabel = (m: string) =>
    new Date(`${m}-01`).toLocaleDateString(undefined, { month: "short", year: "2-digit" });

  const grossAll = data?.shops.reduce((s, x) => s + x.grossRevenue, 0) ?? 0;
  const commissionAll = data?.shops.reduce((s, x) => s + x.commission, 0) ?? 0;
  const payoutAll = data?.shops.reduce((s, x) => s + x.payout, 0) ?? 0;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Finance &amp; shop payouts</h1>
        <p className="text-sm text-muted-foreground">
          All figures are lifetime paid orders. Commission is {data?.commissionPercent ?? 15}% — set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">PLATFORM_COMMISSION_PERCENT</code> to change it.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label="Gross revenue" value={formatMoney(grossAll)} hint="What customers paid" />
        <Tile label={`Your commission (${data?.commissionPercent ?? 15}%)`} value={formatMoney(commissionAll)} hint="Platform earnings" />
        <Tile label="Owed to shops" value={formatMoney(payoutAll)} hint="Gross minus commission" />
      </div>

      <Card title="Monthly payouts owed to shops" icon={Wallet}>
        {data ? (
          <>
            <LineChart
              points={data.monthly.map((m) => ({ label: monthLabel(m.month), value: m.payout }))}
              formatValue={formatMoney}
            />
            {/* The table view the contrast rule requires — and the thing anyone actually
                doing a payout run will read from, rather than the chart. */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Month</th>
                    <th className="py-2 text-right font-medium">Orders</th>
                    <th className="py-2 text-right font-medium">Gross</th>
                    <th className="py-2 text-right font-medium">Commission</th>
                    <th className="py-2 text-right font-medium">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map((m) => (
                    <tr key={m.month} className="border-b border-border/60">
                      <td className="py-2">{monthLabel(m.month)}</td>
                      <td className="py-2 text-right tabular-nums">{m.orders}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(m.grossRevenue)}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{formatMoney(m.commission)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{formatMoney(m.payout)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Loading />
        )}
      </Card>

      <Card title="Revenue by shop" icon={Store}>
        {data ? (
          <BarChart
            data={data.shops.map((s) => ({
              label: s.shopName,
              sublabel: `${s.orders} ${s.orders === 1 ? "order" : "orders"} · avg ${formatMoney(s.averageOrderValue)}`,
              value: s.grossRevenue,
            }))}
            formatValue={formatMoney}
            maxRows={12}
          />
        ) : (
          <Loading />
        )}
      </Card>

      <Card title="Per-shop settlement">
        {data ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Shop</th>
                  <th className="py-2 text-right font-medium">Orders</th>
                  <th className="py-2 text-right font-medium">Gross</th>
                  <th className="py-2 text-right font-medium">Commission</th>
                  <th className="py-2 text-right font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {data.shops.map((s) => (
                  <tr key={s.shopId} className="border-b border-border/60">
                    <td className="py-2">
                      <p className="font-medium">{s.shopName}</p>
                      {s.locationName && <p className="text-xs text-muted-foreground">{s.locationName}</p>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.orders}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(s.grossRevenue)}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{formatMoney(s.commission)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{formatMoney(s.payout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Loading />
        )}
      </Card>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon?: typeof Wallet; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon size={15} className="text-muted-foreground" />}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Loading() {
  return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
}
