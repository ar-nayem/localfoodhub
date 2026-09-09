"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Trash2, Pencil, Star } from "lucide-react";
import { BackButton } from "@/components/customer/BackButton";
import { toast } from "@/components/ui/Toast";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { haversineKm, formatDistance } from "@/lib/location/distance";
import { AddressMapPicker, type SavedAddress } from "@/components/shared/AddressMapPicker";
import { cn, maskPhone } from "@/lib/utils";

const LABEL_STYLES: Record<string, string> = {
  Home: "bg-primary/10 text-primary",
  Work: "bg-info/10 text-info",
  School: "bg-warning/10 text-warning",
};

export default function SavedLocationsPage() {
  const [rows, setRows] = useState<SavedAddress[] | null>(null);
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const { coords } = useGeolocation();

  function load() {
    fetch("/api/account/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }
  useEffect(load, []);

  const closestId = useMemo(() => {
    if (!coords || !rows?.length) return null;
    let best: { id: string; km: number } | null = null;
    for (const r of rows) {
      if (r.latitude == null || r.longitude == null) continue;
      const km = haversineKm(coords.lat, coords.lng, r.latitude, r.longitude);
      if (!best || km < best.km) best = { id: r.id, km };
    }
    return best?.id ?? null;
  }, [coords, rows]);

  async function remove(id: string) {
    const res = await fetch(`/api/account/locations/${id}`, { method: "DELETE" });
    if (res.ok) setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
    else toast("Could not remove this address", "error");
  }

  async function setDefault(addr: SavedAddress) {
    const res = await fetch(`/api/account/locations/${addr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: addr.label,
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        city: addr.city,
        notes: addr.notes ?? undefined,
        latitude: addr.latitude ?? undefined,
        longitude: addr.longitude ?? undefined,
        placeId: addr.placeId ?? undefined,
        recipientName: addr.recipientName ?? undefined,
        recipientPhone: addr.recipientPhone ?? undefined,
        isDefault: true,
      }),
    });
    if (res.ok) setRows((prev) => prev?.map((r) => ({ ...r, isDefault: r.id === addr.id })) ?? null);
    else toast("Could not set default address", "error");
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <BackButton fallback="/profile" />
        <h1 className="text-xl font-bold">My addresses</h1>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows?.map((r) => (
          <div key={r.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", LABEL_STYLES[r.label] ?? "bg-muted text-muted-foreground")}>
                  {r.label}
                </span>
                {r.id === closestId && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">Closest</span>
                )}
                {r.isDefault && (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">Default</span>
                )}
                {r.recipientName && <span className="text-xs font-medium text-foreground">{r.recipientName}</span>}
                {r.recipientPhone && <span className="text-xs text-muted-foreground">{maskPhone(r.recipientPhone)}</span>}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {r.line1}
                {r.line2 ? ` — ${r.line2}` : ""}
              </p>
              {coords && r.latitude != null && r.longitude != null && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistance(haversineKm(coords.lat, coords.lng, r.latitude, r.longitude))} away
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2.5 pt-0.5">
              <button
                onClick={() => setDefault(r)}
                aria-label={r.isDefault ? "Default address" : "Set as default"}
                disabled={r.isDefault}
              >
                <Star size={15} className={r.isDefault ? "fill-warning text-warning" : "text-border hover:text-muted-foreground"} />
              </button>
              <button onClick={() => setEditing(r)} aria-label="Edit" className="text-muted-foreground hover:text-foreground">
                <Pencil size={15} />
              </button>
              <button onClick={() => remove(r.id)} aria-label="Remove" className="text-error">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {rows && rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No saved addresses yet.
          </p>
        )}
      </div>

      <button
        onClick={() => setEditing("new")}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
      >
        <Plus size={16} /> Add a new address
      </button>

      {editing && (
        <AddressMapPicker
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setRows((prev) => {
              if (!prev) return [saved];
              const exists = prev.some((r) => r.id === saved.id);
              return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev];
            });
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}
