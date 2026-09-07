"use client";

import { useEffect, useState } from "react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { QRCard } from "@/components/qr/QRCard";
import { toast } from "@/components/ui/Toast";

interface TableRow {
  id: string;
  area: string;
  label: string;
  status: string;
  qrCodes: { id: string; token: string }[];
  orders: { id: string; orderNumber: string; orderStatus: string }[];
}

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success"> = {
  AVAILABLE: "neutral",
  OCCUPIED: "primary",
  ORDERING: "primary",
  PREPARING: "warning",
  READY: "success",
  CLEANING: "neutral",
};

export function TableManager() {
  const { shop } = useVendorShop();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [area, setArea] = useState("Main");
  const [label, setLabel] = useState("");
  const [qrPreview, setQrPreview] = useState<{ table: string; dataUrl: string; url: string } | null>(null);

  async function load() {
    if (!shop) return;
    const res = await fetch(`/api/vendor/tables?shopId=${shop.id}`);
    if (res.ok) setTables(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  async function addTable() {
    if (!label.trim() || !shop) return;
    const res = await fetch("/api/vendor/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id, area, label: label.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Could not add table", "error");
      return;
    }
    setLabel("");
    load();
  }

  async function deleteTable(id: string) {
    if (!confirm("Delete this table?")) return;
    await fetch(`/api/vendor/tables/${id}`, { method: "DELETE" });
    load();
  }

  async function showQr(table: TableRow) {
    const res = await fetch(`/api/qr?shopId=${shop?.id}`);
    const all = await res.json();
    const qr = all.find((q: { id: string }) => table.qrCodes.some((t) => t.id === q.id));
    if (qr) setQrPreview({ table: table.label, dataUrl: qr.imageDataUrl, url: qr.url });
  }

  const grouped = tables.reduce<Record<string, TableRow[]>>((acc, t) => {
    (acc[t.area] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-2">
        <div>
          <Label>Dining area</Label>
          <Input value={area} onChange={(e) => setArea(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>Table label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. A01" className="w-32" />
        </div>
        <Button onClick={addTable}>+ Add table</Button>
      </div>

      {Object.entries(grouped).map(([areaName, areaTables]) => (
        <div key={areaName} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">{areaName}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {areaTables.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{t.label}</p>
                  <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status}</Badge>
                </div>
                {t.orders[0] && (
                  <p className="mt-1 text-xs text-muted-foreground">#{t.orders[0].orderNumber}</p>
                )}
                <div className="mt-2 flex gap-2 text-xs">
                  <button onClick={() => showQr(t)} className="font-medium text-primary">
                    QR code
                  </button>
                  <button onClick={() => deleteTable(t.id)} className="text-error">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {tables.length === 0 && <p className="text-muted-foreground">No tables yet — add your first one above.</p>}

      {qrPreview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setQrPreview(null)}>
          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <QRCard type="TABLE" title={shop?.name ?? ""} subtitle={`Table ${qrPreview.table}`} imageDataUrl={qrPreview.dataUrl} />
            <a
              href={qrPreview.dataUrl}
              download={`table-${qrPreview.table}-qr.png`}
              className="mt-3 rounded-lg border border-primary bg-surface px-4 py-2 text-sm font-semibold text-primary"
            >
              Download PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
