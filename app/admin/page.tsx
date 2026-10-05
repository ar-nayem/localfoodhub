"use client";

import { useEffect, useState } from "react";
import { Store, Users, ClipboardList, DollarSign, QrCode, Clock, type LucideIcon } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

interface Stats {
  totalShops: number;
  activeShops: number;
  pendingShops: number;
  totalCustomers: number;
  ordersToday: number;
  revenueToday: number;
  qrScans: number;
  ordersByType: { orderType: string; _count: number }[];
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-secondary p-6 text-white">
        <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">শখের খাবার · Company operations</p><h1 className="font-bold">Platform overview</h1><p className="mt-2 text-sm text-white/75">Marketplace activity and the decisions that need your attention.</p></div>
        <Link href="/admin/shops" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-secondary">Manage shops</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Store} label="Active shops" value={stats?.activeShops ?? "–"} />
        <StatCard icon={Clock} label="Pending approval" value={stats?.pendingShops ?? "–"} />
        <StatCard icon={Users} label="Customers" value={stats?.totalCustomers ?? "–"} />
        <StatCard icon={ClipboardList} label="Orders today" value={stats?.ordersToday ?? "–"} />
        <StatCard icon={DollarSign} label="Revenue today" value={stats ? formatMoney(stats.revenueToday) : "–"} />
        <StatCard icon={QrCode} label="Total QR scans" value={stats?.qrScans ?? "–"} />
      </div>

      {stats && stats.ordersByType.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Orders by type</h2>
          <div className="flex gap-6">
            {stats.ordersByType.map((row) => (
              <div key={row.orderType}>
                <p className="text-lg font-bold">{row._count}</p>
                <p className="text-xs text-muted-foreground">{row.orderType}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={19} /></span>
      <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
