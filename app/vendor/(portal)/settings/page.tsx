"use client";

import { isOrderTypeActive } from "@/lib/constants";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { isGoogleMapsConfigured } from "@/lib/maps/loadGoogleMaps";
import type { PlaceResult } from "@/lib/maps/types";

// Both touch `window` at import time (Leaflet directly, Google via a <script> tag), so
// either can only ever run client-side.
const LocationPicker = dynamic(
  () => import("@/components/vendor/LocationPicker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="mt-2 h-64 w-full animate-pulse rounded-xl bg-muted" /> }
);
const GoogleShopLocationPicker = dynamic(
  () => import("@/components/vendor/GoogleShopLocationPicker").then((m) => m.GoogleShopLocationPicker),
  { ssr: false, loading: () => <div className="mt-2 h-64 w-full animate-pulse rounded-xl bg-muted" /> }
);

export default function VendorSettingsPage() {
  const { shop } = useVendorShop();
  const [form, setForm] = useState<Record<string, string | boolean | number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name,
        description: shop.description,
        address: shop.address,
        latitude: shop.latitude ?? "",
        longitude: shop.longitude ?? "",
        placeId: shop.placeId ?? "",
        phone: shop.phone ?? "",
        supportsDelivery: shop.supportsDelivery,
        supportsPickup: shop.supportsPickup,
        supportsDineIn: shop.supportsDineIn,
        deliveryFee: shop.deliveryFee,
        minOrder: shop.minOrder,
        prepTimeMinutes: shop.prepTimeMinutes,
      });
    }
  }, [shop]);

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      latitude: form.latitude === "" || form.latitude == null ? null : Number(form.latitude),
      longitude: form.longitude === "" || form.longitude == null ? null : Number(form.longitude),
    };
    const res = await fetch("/api/vendor/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Could not save settings", "error");
      return;
    }
    toast("Settings saved", "success");
  }

  if (!shop) return null;

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-bold">Shop settings</h1>

      <div className="flex flex-col gap-4">
        <div>
          <Label>Shop name</Label>
          <Input value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={String(form.description ?? "")}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={String(form.address ?? "")} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>

        <div>
          <Label>Map location</Label>
          {isGoogleMapsConfigured() ? (
            <GoogleShopLocationPicker
              latitude={form.latitude === "" || form.latitude == null ? null : Number(form.latitude)}
              longitude={form.longitude === "" || form.longitude == null ? null : Number(form.longitude)}
              onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
              onPlaceResolved={(place: PlaceResult) =>
                setForm((f) => ({ ...f, address: place.formattedAddress, placeId: place.placeId ?? "" }))
              }
            />
          ) : (
            <LocationPicker
              latitude={form.latitude === "" || form.latitude == null ? null : Number(form.latitude)}
              longitude={form.longitude === "" || form.longitude == null ? null : Number(form.longitude)}
              onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
            />
          )}
          {(form.latitude === "" || form.latitude == null) && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              No location set yet — customers won&apos;t see this shop on the Explore map
              until you set one.
            </p>
          )}
        </div>

        <div>
          <Label>Phone</Label>
          <Input value={String(form.phone ?? "")} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Order modes</h2>
          {isOrderTypeActive("DELIVERY") && (
            <ToggleRow label="Delivery" checked={!!form.supportsDelivery} onChange={(v) => setForm({ ...form, supportsDelivery: v })} />
          )}
          <ToggleRow label="Pickup" checked={!!form.supportsPickup} onChange={(v) => setForm({ ...form, supportsPickup: v })} />
          <ToggleRow label="Dine-in" checked={!!form.supportsDineIn} onChange={(v) => setForm({ ...form, supportsDineIn: v })} />
        </div>

        <div className="flex gap-3">
          {isOrderTypeActive("DELIVERY") && (
            <div className="flex-1">
              <Label>Delivery fee (৳)</Label>
              <Input
                type="number"
                value={String(form.deliveryFee ?? 0)}
                onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
              />
            </div>
          )}
          <div className="flex-1">
            <Label>Min order (৳)</Label>
            <Input
              type="number"
              value={String(form.minOrder ?? 0)}
              onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })}
            />
          </div>
          <div className="flex-1">
            <Label>Prep time (min)</Label>
            <Input
              type="number"
              value={String(form.prepTimeMinutes ?? 10)}
              onChange={(e) => setForm({ ...form, prepTimeMinutes: Number(e.target.value) })}
            />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="mt-2">
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
