"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search, Users } from "lucide-react";
import { formatMoney, maskPhone } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  ageBracket: string | null;
  orders: number;
  totalSpend: number;
  averageOrderValue: number;
  lastOrderAt: string | null;
  joinedAt: string;
}

type Filter = "ALL" | "BUYERS" | "NEVER_ORDERED";

export default function AdminCustomersPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLeads);
  }, []);

  const shown = useMemo(() => {
    if (!leads) return [];
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => (filter === "BUYERS" ? l.orders > 0 : filter === "NEVER_ORDERED" ? l.orders === 0 : true))
      .filter(
        (l) =>
          !q ||
          l.name.toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q) ||
          (l.phone ?? "").includes(q) ||
          (l.city ?? "").toLowerCase().includes(q)
      );
  }, [leads, query, filter]);

  const totalSpend = shown.reduce((s, l) => s + l.totalSpend, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Contact details and order history for every registered customer.
          </p>
        </div>
        <a
          href="/api/admin/customers?format=csv"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Download size={15} /> Export CSV
        </a>
      </div>

      {/* Real customer contact data. Worth saying plainly where it can and can't go —
          consent for marketing is not implied by having placed an order. */}
      <p className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs text-muted-foreground">
        These are real personal details. Placing an order isn&apos;t consent to marketing — check what you promised in
        your privacy policy before using this list for campaigns, and keep exports off shared drives.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Customers" value={String(shown.length)} />
        <Tile label="Have ordered" value={String(shown.filter((l) => l.orders > 0).length)} />
        <Tile label="Total spend" value={formatMoney(totalSpend)} />
        <Tile
          label="Avg per customer"
          value={shown.length ? formatMoney(Math.round(totalSpend / shown.length)) : "—"}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, city..."
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        {(["ALL", "BUYERS", "NEVER_ORDERED"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl border px-3.5 py-2 text-xs font-semibold ${
              filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {f === "ALL" ? "All" : f === "BUYERS" ? "Has ordered" : "Never ordered"}
          </button>
        ))}
      </div>

      {!leads ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users size={20} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No customers match this filter yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Contact</th>
                <th className="p-3 font-medium">City</th>
                <th className="p-3 font-medium">Age</th>
                <th className="p-3 text-right font-medium">Orders</th>
                <th className="p-3 text-right font-medium">Spend</th>
                <th className="p-3 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id} className="border-b border-border/60 last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(l.joinedAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="text-xs">{l.email ?? "—"}</p>
                    {/* Numbers are masked until asked for — a screen full of phone numbers
                        is a screen anyone walking past can photograph. */}
                    {l.phone && (
                      <button
                        onClick={() => setRevealed((prev) => new Set(prev).add(l.id))}
                        className="text-xs text-muted-foreground hover:text-primary"
                      >
                        {revealed.has(l.id) ? l.phone : `${maskPhone(l.phone)} · reveal`}
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{l.city ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.ageBracket ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{l.orders}</td>
                  <td className="p-3 text-right font-semibold tabular-nums">{formatMoney(l.totalSpend)}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {l.lastOrderAt ? new Date(l.lastOrderAt).toLocaleDateString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
