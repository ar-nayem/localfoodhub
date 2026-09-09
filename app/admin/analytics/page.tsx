"use client";

import { useEffect, useState } from "react";
import { TrendingUp, MapPin, Users, ShoppingBag } from "lucide-react";
import { LineChart } from "@/components/admin/charts/LineChart";
import { BarChart } from "@/components/admin/charts/BarChart";
import { formatMoney, cn } from "@/lib/utils";

interface Analytics {
  commissionPercent: number;
  daily: { date: string; revenue: number; orders: number }[];
  shops: { shopId: string; shopName: string; locationName: string | null; orders: number; grossRevenue: number }[];
  orderTypes: { orderType: string; orders: number; revenue: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  locations: { id: string; name: string; shops: number; orders: number; revenue: number }[];
  demographics: {
    totalCustomers: number;
    withBirthDate: number;
    brackets: { bracket: string; count: number }[];
  };
}

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, [days]);

  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const totalRevenue = data?.daily.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = data?.daily.reduce((s, d) => s + d.orders, 0) ?? 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Sales &amp; market insights</h1>
          <p className="text-sm text-muted-foreground">Paid orders only — pending and failed payments are excluded.</p>
        </div>
        {/* Filters in one row above the charts, not buried per-card. */}
        <div className="flex rounded-full border border-border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold",
                days === r.days ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={TrendingUp} label={`Revenue · ${days}d`} value={formatMoney(totalRevenue)} />
        <StatTile icon={ShoppingBag} label={`Orders · ${days}d`} value={String(totalOrders)} />
        <StatTile
          icon={TrendingUp}
          label="Avg order value"
          value={totalOrders ? formatMoney(Math.round(totalRevenue / totalOrders)) : "—"}
        />
        <StatTile icon={Users} label="Customers" value={String(data?.demographics.totalCustomers ?? 0)} />
      </div>

      <Card title={`Revenue over the last ${days} days`}>
        {data ? (
          <LineChart points={data.daily.map((d) => ({ label: shortDate(d.date), value: d.revenue }))} formatValue={formatMoney} />
        ) : (
          <Loading />
        )}
      </Card>

      {/* Deliberately a second chart rather than a second axis on the one above: orders and
          revenue have different units, and a dual-axis chart invents correlations. */}
      <Card title={`Orders over the last ${days} days`}>
        {data ? (
          <LineChart
            points={data.daily.map((d) => ({ label: shortDate(d.date), value: d.orders }))}
            formatValue={(v) => String(v)}
            colorIndex={2}
          />
        ) : (
          <Loading />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top shops by revenue">
          {data ? (
            <BarChart
              data={data.shops.map((s) => ({
                label: s.shopName,
                sublabel: `${s.orders} ${s.orders === 1 ? "order" : "orders"}${s.locationName ? ` · ${s.locationName}` : ""}`,
                value: s.grossRevenue,
              }))}
              formatValue={formatMoney}
            />
          ) : (
            <Loading />
          )}
        </Card>

        <Card title="Best selling items">
          {data ? (
            <BarChart
              data={data.topProducts.map((p) => ({
                label: p.name,
                sublabel: `${p.quantity} sold`,
                value: p.revenue,
              }))}
              formatValue={formatMoney}
              colorIndex={1}
            />
          ) : (
            <Loading />
          )}
        </Card>

        <Card title="Revenue by area" icon={MapPin}>
          {data ? (
            <BarChart
              data={data.locations.map((l) => ({
                label: l.name,
                sublabel: `${l.shops} ${l.shops === 1 ? "shop" : "shops"} · ${l.orders} ${l.orders === 1 ? "order" : "orders"}`,
                value: l.revenue,
              }))}
              formatValue={formatMoney}
              colorIndex={2}
            />
          ) : (
            <Loading />
          )}
        </Card>

        <Card title="How customers order">
          {data ? (
            <BarChart
              data={data.orderTypes.map((t) => ({
                label: t.orderType === "DINE_IN" ? "Dine-in" : t.orderType === "PICKUP" ? "Pickup" : t.orderType,
                sublabel: `${t.orders} ${t.orders === 1 ? "order" : "orders"}`,
                value: t.revenue,
              }))}
              formatValue={formatMoney}
              colorIndex={3}
            />
          ) : (
            <Loading />
          )}
        </Card>
      </div>

      <Card title="Customer age groups" icon={Users}>
        {!data ? (
          <Loading />
        ) : data.demographics.withBirthDate === 0 ? (
          // The honest empty state. Age is self-reported and nobody has given it yet —
          // saying so beats an empty chart that looks broken, and beats inferring an age
          // nobody actually told us.
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium">No birth dates collected yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Customers can add a birthday from their profile. This fills in as they do —
              {" "}
              {data.demographics.totalCustomers} customer
              {data.demographics.totalCustomers === 1 ? "" : "s"} so far, none with a birthday on file.
            </p>
          </div>
        ) : (
          <>
            <BarChart
              data={data.demographics.brackets.map((b) => ({ label: b.bracket, value: b.count }))}
              formatValue={(v) => `${v}`}
              colorIndex={1}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Based on {data.demographics.withBirthDate} of {data.demographics.totalCustomers} customers who shared a
              birthday — the rest are not counted rather than estimated.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <Icon size={16} className="mb-2 text-primary" />
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon?: typeof Users; children: React.ReactNode }) {
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
