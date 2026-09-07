"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, DollarSign, ChefHat, QrCode, Sparkles, Check, type LucideIcon } from "lucide-react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { formatMoney, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

interface Stats {
  todayOrders: number;
  todayRevenue: number;
  pending: number;
  preparing: number;
  completed: number;
  cancelled: number;
  qrScans: number;
  discovery: { shown: number; clicked: number; ordered: number };
  checklist: ChecklistItem[];
  completionPercent: number;
}

export default function VendorOverviewPage() {
  const { shop } = useVendorShop();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!shop) return;
    fetch(`/api/vendor/stats?shopId=${shop.id}`)
      .then((r) => r.json())
      .then(setStats);
  }, [shop]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{shop?.name ?? "Your shop"}</h1>
          {shop && (
            <Badge tone={shop.status === "ACTIVE" ? "success" : "warning"} className="mt-1">
              {shop.status === "PENDING" ? "Awaiting admin approval" : shop.status}
            </Badge>
          )}
        </div>
      </div>

      {stats && stats.completionPercent < 100 && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Your shop is {stats.completionPercent}% complete</p>
          </div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${stats.completionPercent}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.checklist.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                  item.done ? "border-success/30 bg-success/10 text-success" : "border-border text-muted-foreground"
                )}
              >
                {item.done && <Check size={12} />}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={ClipboardList} label="Today's orders" value={stats?.todayOrders ?? "–"} />
        <StatCard icon={DollarSign} label="Today's revenue" value={stats ? formatMoney(stats.todayRevenue) : "–"} />
        <StatCard icon={ChefHat} label="Preparing" value={stats?.preparing ?? "–"} />
        <StatCard icon={QrCode} label="QR scans" value={stats?.qrScans ?? "–"} />
      </div>

      {stats && stats.discovery.shown > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles size={15} className="text-primary" /> Explore performance
          </p>
          <div className="flex gap-6 text-sm">
            <span>
              <strong>{stats.discovery.shown}</strong> <span className="text-muted-foreground">shown</span>
            </span>
            <span>
              <strong>{stats.discovery.clicked}</strong> <span className="text-muted-foreground">selected</span>
            </span>
            <span>
              <strong>{stats.discovery.ordered}</strong> <span className="text-muted-foreground">ordered</span>
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <QuickAction href="/vendor/menu" label="Manage menu" />
        <QuickAction href="/vendor/orders" label="View orders" />
        <QuickAction href="/vendor/storefront" label="Customize shop" />
        <QuickAction href="/vendor/qr" label="Generate QR" />
      </div>
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

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-surface p-4 text-sm font-medium transition-colors hover:bg-muted"
    >
      {label} →
    </Link>
  );
}
