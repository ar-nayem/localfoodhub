"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, DollarSign, ChefHat, QrCode, Sparkles, Check, ArrowUpRight, CircleCheck, type LucideIcon } from "lucide-react";
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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-primary px-5 py-6 text-primary-foreground shadow-sm sm:px-6">
        <div className="flex items-start justify-between gap-4">
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/70">Today at your shop</p>
          <h1 className="mt-1 text-2xl font-bold">{shop?.name ?? "Your shop"}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/80">Keep the menu current, respond quickly, and make every handoff feel dependable.</p>
          {shop && (
              <Badge tone={shop.status === "ACTIVE" ? "success" : "warning"} className="mt-4 border-0 bg-white/15 text-white">
              {shop.status === "PENDING" ? "Awaiting admin approval" : shop.status}
            </Badge>
          )}
        </div>
          <Link href="/vendor/orders" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-primary shadow-sm">Orders <ArrowUpRight size={14} /></Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Your day at a glance</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Live numbers from your shop activity.</p>
          </div>
          {stats?.pending ? <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-bold text-warning">{stats.pending} need attention</span> : <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><CircleCheck size={14} /> All caught up</span>}
        </div>
      </section>

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
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
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

      <section>
        <div className="mb-3">
          <h2 className="text-base font-bold">Run your shop</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">The most useful next actions, all in one place.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuickAction href="/vendor/menu" label="Manage menu" detail="Keep food, prices, and availability accurate." />
          <QuickAction href="/vendor/orders" label="Open order board" detail="Accept, prepare, and hand off new orders." />
          <QuickAction href="/vendor/storefront" label="Customize shop" detail="Update the story and look customers see." />
          <QuickAction href="/vendor/qr" label="Generate a QR" detail="Create an easy entry point for customers." />
        </div>
      </section>
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
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={18} /></span>
      <p className="mt-3 text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-border bg-surface p-5 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="flex items-center justify-between gap-3 text-sm font-bold">{label} <ArrowUpRight size={17} className="text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
      <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">{detail}</span>
    </Link>
  );
}
