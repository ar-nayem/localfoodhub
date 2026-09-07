"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Printer, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { downloadPng, downloadSvg, printCard } from "@/lib/qr/export";
import { cn } from "@/lib/utils";

interface TemplateRow {
  id: string;
  name: string;
  type: string;
  description?: string;
  isDefault: boolean;
  print: { widthMm: number; heightMm: number };
}

interface Reference {
  id: string;
  label: string;
}

const TYPES = [
  { value: "TABLE", label: "Table", needs: "table" },
  { value: "SHOP", label: "Shop", needs: null },
  { value: "MENU", label: "Menu", needs: null },
  { value: "PRODUCT", label: "Food item", needs: "product" },
  { value: "ORDER", label: "Order", needs: "order" },
  { value: "PICKUP", label: "Pickup", needs: "order" },
  // Delivery QR is hidden while delivery is off; the templates remain registered.
  { value: "EXPLORE", label: "Explore", needs: null },
] as const;

type QrType = (typeof TYPES)[number]["value"];

/**
 * The vendor-facing designer. It only ever chooses *presentation* — type, template, CTA
 * and which of their own rows the card points at. Platform branding, the token and the
 * destination are decided server-side, so there is nothing here a vendor could use to
 * repoint or rebrand a code.
 */
export function QrDesigner({
  shopId,
  tables,
  products,
  orders,
  onCreated,
  onClose,
}: {
  shopId: string;
  tables: Reference[];
  products: Reference[];
  orders: Reference[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<QrType>("TABLE");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string>("");
  const [cta, setCta] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);

  const needs = TYPES.find((t) => t.value === type)?.needs ?? null;
  const references = needs === "table" ? tables : needs === "product" ? products : needs === "order" ? orders : [];
  const activeTemplate = templates.find((t) => t.id === templateId) ?? null;

  // Template list follows the selected type.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/qr/templates?type=${type}`)
      .then((r) => r.json())
      .then((d: { templates: TemplateRow[] }) => {
        if (cancelled) return;
        setTemplates(d.templates);
        setTemplateId(d.templates.find((t) => t.isDefault)?.id ?? d.templates[0]?.id ?? null);
      })
      .catch(() => setTemplates([]));
    setReferenceId("");
    return () => {
      cancelled = true;
    };
  }, [type]);

  const renderPreview = useCallback(async () => {
    if (!templateId) return;
    setRendering(true);
    try {
      const res = await fetch("/api/qr/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          type,
          templateId,
          cta: cta || undefined,
          tableId: needs === "table" ? referenceId || undefined : undefined,
          productId: needs === "product" ? referenceId || undefined : undefined,
          orderId: needs === "order" ? referenceId || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSvg(data.svg);
    } catch {
      setSvg(null);
      toast("Could not render the preview", "error");
    } finally {
      setRendering(false);
    }
  }, [shopId, type, templateId, cta, referenceId, needs]);

  // Live preview: any change to design or content re-renders, debounced so typing a CTA
  // doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(renderPreview, 250);
    return () => clearTimeout(t);
  }, [renderPreview]);

  const filename = useMemo(
    () => `${type.toLowerCase()}-qr-${(referenceId || "card").slice(0, 6)}`,
    [type, referenceId]
  );

  async function save() {
    if (needs && !referenceId) {
      toast(`Choose a ${needs} first`, "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        shopId,
        templateId,
        ctaOverride: cta || undefined,
        tableId: needs === "table" ? referenceId : undefined,
        productId: needs === "product" ? referenceId : undefined,
        orderId: needs === "order" ? referenceId : undefined,
        label: references.find((r) => r.id === referenceId)?.label,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Could not create the QR code", "error");
      return;
    }
    toast("QR code created", "success");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-surface sm:h-[88vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg font-semibold">Create QR code</h2>
          <button onClick={onClose} className="text-sm font-medium text-muted-foreground">
            Close
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 overflow-hidden sm:grid-cols-[1fr_320px]">
          {/* Live preview */}
          <div className="flex items-center justify-center overflow-auto bg-muted/40 p-6">
            {svg ? (
              <div
                className={cn("w-full max-w-[280px] transition-opacity", rendering && "opacity-60")}
                // The renderer's output is our own SVG string, built server-side from the
                // template registry — not user-authored markup.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {rendering ? "Rendering preview..." : "Choose a design to preview"}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="overflow-y-auto border-t border-border p-4 sm:border-l sm:border-t-0">
            <Label htmlFor="qr-type">QR type</Label>
            <select
              id="qr-type"
              value={type}
              onChange={(e) => setType(e.target.value as QrType)}
              className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {needs && (
              <div className="mt-4">
                <Label htmlFor="qr-ref">
                  {needs === "table" ? "Table" : needs === "product" ? "Food item" : "Order"}
                </Label>
                <select
                  id="qr-ref"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                >
                  <option value="">Choose...</option>
                  {references.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {references.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nothing to link yet — add one first, then come back.
                  </p>
                )}
              </div>
            )}

            <div className="mt-4">
              <Label htmlFor="qr-cta">Call to action</Label>
              <Input
                id="qr-cta"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder={activeTemplate ? "Use the design's default" : ""}
                maxLength={40}
              />
            </div>

            <p className="mb-2 mt-5 text-sm font-semibold">Design</p>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    "relative rounded-xl border p-2.5 text-left text-xs",
                    templateId === t.id ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <span className="block font-semibold">{t.name}</span>
                  {t.description && (
                    <span className="mt-0.5 block leading-snug text-muted-foreground">{t.description}</span>
                  )}
                  {templateId === t.id && (
                    <Check size={14} className="absolute right-2 top-2 text-primary" />
                  )}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Designs are platform-branded. Changing a design never changes where an
              existing code points.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          <Button onClick={save} disabled={saving || !templateId} className="flex-1 sm:flex-none">
            {saving ? "Creating..." : "Create QR"}
          </Button>
          <button
            onClick={() => svg && downloadSvg(svg, filename)}
            disabled={!svg}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <Download size={15} /> SVG
          </button>
          <button
            onClick={() =>
              svg && activeTemplate && downloadPng(svg, filename, activeTemplate.print).catch(() => toast("PNG export failed", "error"))
            }
            disabled={!svg}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <Download size={15} /> PNG
          </button>
          <button
            onClick={() => svg && activeTemplate && printCard(svg, activeTemplate.print)}
            disabled={!svg}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
