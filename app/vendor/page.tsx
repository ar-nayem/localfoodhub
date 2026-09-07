"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, DollarSign, ChefHat, QrCode, type LucideIcon } from "lucide-react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface Stats {
  todayOrders: number;
  todayRevenue: number;
  pending: number;
  preparing: number;
  completed: number;
  cancelled: number;
  qrScans: number;
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={ClipboardList} label="Today's orders" value={stats?.todayOrders ?? "–"} />
        <StatCard icon={DollarSign} label="Today's revenue" value={stats ? formatMoney(stats.todayRevenue) : "–"} />
        <StatCard icon={ChefHat} label="Preparing" value={stats?.preparing ?? "–"} />
        <StatCard icon={QrCode} label="QR scans" value={stats?.qrScans ?? "–"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <QuickAction href="/vendor/menu" label="Manage menu" />
        <QuickAction href="/vendor/orders" label="View orders" />
        <QuickAction href="/vendor/qr" label="Generate QR" />
        <QuickAction href="/vendor/settings" label="Shop settings" />
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
