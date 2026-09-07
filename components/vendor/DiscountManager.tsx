"use client";

import { useEffect, useState } from "react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { MediaUploader } from "@/components/ui/MediaUploader";
import { toast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/utils";

interface Promotion {
  id: string;
  code: string | null;
  title: string;
  type: string;
  value: number;
  imageUrl: string | null;
  active: boolean;
  minOrder: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
}

const EMPTY = {
  code: "",
  title: "",
  type: "PERCENT",
  value: "",
  minOrder: "",
  usageLimit: "",
  startsAt: "",
  endsAt: "",
  imageUrl: null as string | null,
};

export function DiscountManager() {
  const { shop } = useVendorShop();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!shop) return;
    const res = await fetch(`/api/vendor/discounts?shopId=${shop.id}`);
    if (res.ok) setPromotions(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  async function create() {
    if (!shop || !form.title || !form.value) return;
    setSaving(true);
    const res = await fetch("/api/vendor/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId: shop.id,
        code: form.code || null,
        title: form.title,
        type: form.type,
        value: Number(form.value),
        minOrder: form.minOrder ? Number(form.minOrder) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        imageUrl: form.imageUrl,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Could not create discount", "error");
      return;
    }
    setForm(EMPTY);
    load();
  }

  async function toggleActive(promo: Promotion) {
    await fetch(`/api/vendor/discounts/${promo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !promo.active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this discount?")) return;
    await fetch(`/api/vendor/discounts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">Discounts</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Shop-wide promo codes. Per-item discounts are set directly on a product's price in{" "}
        <span className="font-medium">Menu</span>.
      </p>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Create discount</h2>
        <MediaUploader
          shape="wide"
          label="Promotion image (optional)"
          value={form.imageUrl}
          onChange={(url) => setForm({ ...form, imageUrl: url })}
          uploadEndpoint="/api/vendor/media"
          extraFields={{ shopId: shop?.id ?? "", type: "PROMOTION" }}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Weekend Special" />
          </div>
          <div>
            <Label>Code (optional — blank applies automatically)</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WEEKEND10" />
          </div>
          <div>
            <Label>Type</Label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              <option value="PERCENT">Percent off</option>
              <option value="FIXED">Fixed amount off</option>
            </select>
          </div>
          <div>
            <Label>Value</Label>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === "PERCENT" ? "10" : "50"} />
          </div>
          <div>
            <Label>Minimum order (optional)</Label>
            <Input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
          </div>
          <div>
            <Label>Usage limit (optional)</Label>
            <Input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          </div>
          <div>
            <Label>Starts (optional)</Label>
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </div>
          <div>
            <Label>Ends (optional)</Label>
            <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
        </div>
        <Button onClick={create} disabled={saving} className="mt-4">
          {saving ? "Creating..." : "Create discount"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {promotions.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
            <div>
              <p className="font-medium">
                {p.title} {p.code && <Badge tone="neutral">{p.code}</Badge>}
              </p>
              <p className="text-sm text-muted-foreground">
                {p.type === "PERCENT" ? `${p.value}% off` : `${formatMoney(p.value)} off`}
                {p.minOrder > 0 && ` · min ${formatMoney(p.minOrder)}`}
                {p.usageLimit && ` · ${p.usedCount}/${p.usageLimit} used`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
              <button onClick={() => remove(p.id)} className="text-sm text-error">
                Delete
              </button>
            </div>
          </div>
        ))}
        {promotions.length === 0 && <p className="text-sm text-muted-foreground">No discounts yet.</p>}
      </div>
    </div>
  );
}
