"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  name: string;
  type: string;
  description?: string;
  active: boolean;
  isDefault: boolean;
  sortOrder: number;
}

/** Admin control over which QR card designs vendors can pick, their order, and the
 * default per QR type. The layouts themselves live in the template registry — this
 * governs availability, not geometry. */
export function QrTemplateManager() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/qr-templates");
    if (!res.ok) return setRows([]);
    const data = await res.json();
    setRows(data.templates);
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/qr-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) {
      toast("Could not update the template", "error");
      return;
    }
    load();
  }

  async function preview(row: Row) {
    setPreviewId(row.id);
    setPreviewSvg(null);
    const res = await fetch("/api/qr/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: row.id, type: row.type, adminPreview: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error ?? "Preview needs a shop context", "error");
      setPreviewId(null);
      return;
    }
    setPreviewSvg(data.svg);
  }

  if (!rows) return <p className="text-muted-foreground">Loading templates...</p>;

  const byType = rows.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.type] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(byType).map(([type, list]) => (
        <section key={type} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">{type}</h2>
          <div className="flex flex-col gap-2">
            {list.map((row, i) => (
              <div
                key={row.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-surface p-3",
                  !row.active && "opacity-60"
                )}
              >
                <div className="flex flex-col">
                  <button
                    onClick={() => patch(row.id, { sortOrder: Math.max(0, row.sortOrder - 1) })}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="text-muted-foreground disabled:opacity-30"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => patch(row.id, { sortOrder: row.sortOrder + 1 })}
                    disabled={i === list.length - 1}
                    aria-label="Move down"
                    className="text-muted-foreground disabled:opacity-30"
                  >
                    <ChevronDown size={15} />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {row.name}
                    {row.isDefault && <Badge tone="primary">Default</Badge>}
                  </p>
                  {row.description && (
                    <p className="truncate text-xs text-muted-foreground">{row.description}</p>
                  )}
                </div>

                <button
                  onClick={() => patch(row.id, { isDefault: true })}
                  disabled={row.isDefault}
                  title="Make this the default for this QR type"
                  className="text-muted-foreground disabled:opacity-30"
                  aria-label="Set as default"
                >
                  <Star size={16} className={row.isDefault ? "fill-warning text-warning" : ""} />
                </button>

                <button
                  onClick={() => preview(row)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  Preview
                </button>

                <Switch checked={row.active} onCheckedChange={(v) => patch(row.id, { active: v })} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {previewId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setPreviewId(null)}
        >
          <div className="max-h-[90vh] w-full max-w-xs overflow-auto rounded-2xl bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            {previewSvg ? (
              <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Rendering...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
