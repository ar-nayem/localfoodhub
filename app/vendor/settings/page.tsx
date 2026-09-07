"use client";

import { useEffect, useState } from "react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";

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
    const res = await fetch("/api/vendor/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
          <Label>Phone</Label>
          <Input value={String(form.phone ?? "")} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Order modes</h2>
          <ToggleRow label="Delivery" checked={!!form.supportsDelivery} onChange={(v) => setForm({ ...form, supportsDelivery: v })} />
          <ToggleRow label="Pickup" checked={!!form.supportsPickup} onChange={(v) => setForm({ ...form, supportsPickup: v })} />
          <ToggleRow label="Dine-in" checked={!!form.supportsDineIn} onChange={(v) => setForm({ ...form, supportsDineIn: v })} />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Delivery fee (৳)</Label>
            <Input
              type="number"
              value={String(form.deliveryFee ?? 0)}
              onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
            />
          </div>
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
