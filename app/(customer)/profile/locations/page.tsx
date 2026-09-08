"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, X } from "lucide-react";
import { BackButton } from "@/components/customer/BackButton";
import { Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { isGoogleMapsConfigured } from "@/lib/maps/loadGoogleMaps";
import { PlaceAutocompleteInput } from "@/components/shared/PlaceAutocompleteInput";
import type { PlaceResult } from "@/lib/maps/types";

interface SavedLocation {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  recipientName: string | null;
  recipientPhone: string | null;
}

function splitAddress(formatted: string): { line1: string; city: string } {
  const parts = formatted.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return { line1: formatted, city: "" };
  const city = parts.length >= 3 ? parts[parts.length - 3] : parts[Math.max(0, parts.length - 2)];
  return { line1: parts[0], city: city || parts[0] };
}

export default function SavedLocationsPage() {
  const [rows, setRows] = useState<SavedLocation[] | null>(null);
  const [adding, setAdding] = useState(false);
  const googleReady = isGoogleMapsConfigured();

  const [label, setLabel] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [placeCoords, setPlaceCoords] = useState<{ lat: number; lng: number; placeId: string | null } | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/account/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }
  useEffect(load, []);

  function onPlacePicked(place: PlaceResult) {
    const { line1: l1, city: c } = splitAddress(place.formattedAddress);
    setLine1(l1);
    setCity(c);
    setPlaceCoords({ lat: place.lat, lng: place.lng, placeId: place.placeId });
  }

  function resetForm() {
    setLabel("");
    setLine1("");
    setLine2("");
    setCity("");
    setPlaceCoords(null);
    setRecipientName("");
    setRecipientPhone("");
  }

  async function save() {
    if (!label || !line1 || !city) {
      toast("Label, address, and city are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          line1,
          line2: line2 || undefined,
          city,
          latitude: placeCoords?.lat,
          longitude: placeCoords?.lng,
          placeId: placeCoords?.placeId ?? undefined,
          recipientName: recipientName || undefined,
          recipientPhone: recipientPhone || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      resetForm();
      setAdding(false);
      load();
      toast("Location saved", "success");
    } catch {
      toast("Could not save this location", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/account/locations/${id}`, { method: "DELETE" });
    if (res.ok) setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
    else toast("Could not remove this location", "error");
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <BackButton fallback="/profile" />
        <h1 className="text-xl font-bold">Saved locations</h1>
      </div>

      <div className="flex flex-col gap-2">
        {rows?.map((r) => (
          <div key={r.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{r.label}</p>
              <p className="truncate text-sm text-muted-foreground">
                {r.line1}
                {r.line2 ? `, ${r.line2}` : ""}, {r.city}
              </p>
              {r.recipientName && (
                <p className="mt-0.5 text-xs text-muted-foreground">For {r.recipientName}{r.recipientPhone ? ` · ${r.recipientPhone}` : ""}</p>
              )}
            </div>
            <button onClick={() => remove(r.id)} aria-label="Remove" className="text-error">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {rows && rows.length === 0 && !adding && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No saved locations yet.
          </p>
        )}
      </div>

      <button
        onClick={() => setAdding(true)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-primary"
      >
        <Plus size={16} /> Add a location
      </button>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAdding(false)}>
          <div
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add a location</h2>
              <button onClick={() => setAdding(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Work, Mom's place..." />
              </div>

              {googleReady && (
                <div>
                  <Label>Search for a place</Label>
                  <PlaceAutocompleteInput
                    onSelect={onPlacePicked}
                    placeholder="Search an address..."
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                  />
                </div>
              )}

              <div>
                <Label>Address</Label>
                <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street address" />
              </div>
              <div>
                <Label>Apartment, floor, etc. (optional)</Label>
                <Input value={line2} onChange={(e) => setLine2(e.target.value)} />
              </div>
              <div>
                <Label>City / Area</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>

              <div className="mt-1 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">If this is for someone else (optional)</p>
                <div className="flex flex-col gap-3">
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name" />
                  <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="Recipient phone" />
                </div>
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save location"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
