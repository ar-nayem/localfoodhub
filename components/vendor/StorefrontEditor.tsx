"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { THEME_PRESETS } from "@/lib/storefront/theme";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { MediaUploader } from "@/components/ui/MediaUploader";
import { MediaLibraryPicker } from "./MediaLibraryPicker";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface StorefrontConfig {
  logoUrl: string | null;
  coverUrl: string | null;
  bannerText: string | null;
  bannerCta: string | null;
  themePreset: string;
  accentColor: string | null;
  sectionsConfig: string;
  discoveryEnabled: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  featured: boolean;
  discoveryEligible: boolean;
}

export function StorefrontEditor() {
  const { shop } = useVendorShop();
  const [published, setPublished] = useState<StorefrontConfig | null>(null);
  const [form, setForm] = useState<StorefrontConfig | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<"logoUrl" | "coverUrl" | null>(null);

  async function load() {
    if (!shop) return;
    const [storefrontRes, productsRes] = await Promise.all([
      fetch(`/api/vendor/storefront?shopId=${shop.id}`),
      fetch(`/api/vendor/products?shopId=${shop.id}`),
    ]);
    const storefront = await storefrontRes.json();
    setPublished(storefront.published);
    setForm({ ...storefront.published, ...(storefront.draft ?? {}) });
    setHasDraft(storefront.hasUnpublishedChanges);
    setProducts(await productsRes.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  function set<K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function saveDraft(showToast = true) {
    if (!shop || !form || !published) return;
    setSaving(true);
    const patch = Object.fromEntries(
      Object.entries(form).filter(([k, v]) => (published as any)[k] !== v)
    );
    const res = await fetch("/api/vendor/storefront", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id, patch }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Could not save draft", "error");
      return;
    }
    setHasDraft(true);
    if (showToast) toast("Draft saved", "success");
  }

  async function publish() {
    if (!shop) return;
    await saveDraft(false);
    setPublishing(true);
    const res = await fetch("/api/vendor/storefront", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id }),
    });
    setPublishing(false);
    if (!res.ok) {
      toast("Could not publish", "error");
      return;
    }
    toast("Published! Customers now see your changes.", "success");
    load();
  }

  async function toggleProductFlag(productId: string, field: "featured" | "discoveryEligible", value: boolean) {
    await fetch(`/api/vendor/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p)));
  }

  if (!shop || !form) return null;

  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Customize My Shop</h1>
          <p className="text-sm text-muted-foreground">
            Changes save as a draft — customers only see them once you publish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/s/${shop.slug}`} target="_blank">
            <Button variant="outline" size="sm">
              View My Shop
            </Button>
          </Link>
        </div>
      </div>

      {hasDraft && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <span className="font-medium text-warning">Unsaved changes not yet published</span>
        </div>
      )}

      <Section title="Logo & banner">
        <div className="flex gap-6">
          <MediaUploader
            label="Logo"
            shape="round"
            value={form.logoUrl}
            onChange={(url) => set("logoUrl", url)}
            uploadEndpoint="/api/vendor/media"
            extraFields={{ shopId: shop.id, type: "SHOP_LOGO" }}
            onBrowseLibrary={() => setLibraryTarget("logoUrl")}
          />
          <MediaUploader
            label="Banner"
            shape="wide"
            value={form.coverUrl}
            onChange={(url) => set("coverUrl", url)}
            uploadEndpoint="/api/vendor/media"
            extraFields={{ shopId: shop.id, type: "BANNER" }}
            onBrowseLibrary={() => setLibraryTarget("coverUrl")}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Banner text (optional)</Label>
            <Input
              value={form.bannerText ?? ""}
              onChange={(e) => set("bannerText", e.target.value || null)}
              placeholder="20% off all burgers today"
            />
          </div>
          <div>
            <Label>Banner CTA (optional)</Label>
            <Input
              value={form.bannerCta ?? ""}
              onChange={(e) => set("bannerCta", e.target.value || null)}
              placeholder="Order now"
            />
          </div>
        </div>
      </Section>

      <Section title="Theme">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {THEME_PRESETS.map((t) => (
            <button
              key={t.key}
              onClick={() => set("themePreset", t.key)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium",
                form.themePreset === t.key ? "border-primary bg-primary/10" : "border-border"
              )}
            >
              <span
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: `hsl(${t.primary})` }}
              />
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label>Custom accent color (optional)</Label>
          <div className="flex items-center gap-2">
            <Input
              value={form.accentColor ?? ""}
              onChange={(e) => set("accentColor", e.target.value || null)}
              placeholder="#ea580c"
              className="max-w-[160px]"
            />
            {form.accentColor && (
              <span className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: form.accentColor }} />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Overrides the preset above. Colors too light for readable button text are rejected on save.
          </p>
        </div>
      </Section>

      <Section title="Featured & discovery">
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
          <div>
            <p className="text-sm font-medium">Include my shop in Explore</p>
            <p className="text-xs text-muted-foreground">Customers using &quot;What should I eat?&quot; can be shown your food.</p>
          </div>
          <Switch checked={form.discoveryEnabled} onCheckedChange={(v) => set("discoveryEnabled", v)} />
        </div>

        <p className="mb-2 mt-4 text-sm font-medium">Products</p>
        <div className="flex flex-col gap-1.5">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>{p.name}</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={p.featured}
                    onChange={(e) => toggleProductFlag(p.id, "featured", e.target.checked)}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={p.discoveryEligible}
                    onChange={(e) => toggleProductFlag(p.id, "discoveryEligible", e.target.checked)}
                  />
                  Discoverable
                </label>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-sm text-muted-foreground">Add menu items first.</p>}
        </div>
      </Section>

      <div className="sticky bottom-0 mt-6 flex gap-2 border-t border-border bg-background py-4">
        <Button variant="outline" onClick={() => saveDraft()} disabled={saving} className="flex-1">
          {saving ? "Saving..." : "Save Draft"}
        </Button>
        <Button onClick={publish} disabled={publishing} className="flex-1">
          {publishing ? "Publishing..." : "Publish Changes"}
        </Button>
      </div>

      {libraryTarget && (
        <MediaLibraryPicker
          shopId={shop.id}
          onClose={() => setLibraryTarget(null)}
          onSelect={(url) => {
            set(libraryTarget, url);
            setLibraryTarget(null);
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2.5 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
