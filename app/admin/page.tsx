"use client";

import { useEffect, useState } from "react";
import { Store, Users, ClipboardList, DollarSign, QrCode, Clock, type LucideIcon } from "lucide-react";
import { formatMoney } from "@/lib/utils";

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
      <h1 className="mb-5 text-xl font-bold">Platform overview</h1>
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
    <div className="rounded-2xl border border-border bg-surface p-4">
      <Icon size={18} className="text-primary" />
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
