"use client";

import { useEffect, useState } from "react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";

interface QrRow {
  id: string;
  type: string;
  status: string;
  label?: string | null;
  scanCount: number;
  orderCount: number;
  lastScannedAt: string | null;
  imageDataUrl: string;
  url: string;
}

interface ProductOption {
  id: string;
  name: string;
}

const GENERATABLE_TYPES = ["SHOP", "MENU", "COUNTER", "PRODUCT"] as const;

export function QrCenter() {
  const { shop } = useVendorShop();
  const [qrCodes, setQrCodes] = useState<QrRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [newType, setNewType] = useState<(typeof GENERATABLE_TYPES)[number]>("SHOP");
  const [productId, setProductId] = useState("");
  const [generating, setGenerating] = useState(false);

  async function load() {
    if (!shop) return;
    const [qr, prod] = await Promise.all([
      fetch(`/api/qr?shopId=${shop.id}`).then((r) => r.json()),
      fetch(`/api/vendor/products?shopId=${shop.id}`).then((r) => r.json()),
    ]);
    setQrCodes(qr.filter((q: QrRow) => q.type !== "TABLE"));
    setProducts(prod);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  async function generate() {
    if (!shop) return;
    if (newType === "PRODUCT" && !productId) {
      toast("Choose a product first", "error");
      return;
    }
    setGenerating(true);
    const res = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: newType,
        shopId: shop.id,
        productId: newType === "PRODUCT" ? productId : undefined,
        label: newType === "PRODUCT" ? products.find((p) => p.id === productId)?.name : undefined,
      }),
    });
    setGenerating(false);
    if (!res.ok) {
      toast("Could not generate QR", "error");
      return;
    }
    load();
  }

  async function toggleStatus(qr: QrRow) {
    const nextStatus = qr.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await fetch(`/api/qr/${qr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    load();
  }

  function printQr(qr: QrRow) {
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) return;
    win.document.write(`
      <html><head><title>${shop?.name ?? ""} QR</title>
      <style>
        body { font-family: -apple-system, sans-serif; text-align:center; padding:40px 20px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        p { color:#666; margin: 0 0 24px; }
        img { width: 260px; height: 260px; }
        .foot { margin-top: 20px; font-size: 13px; color:#666; }
      </style></head>
      <body>
        <h1>${shop?.name ?? ""}</h1>
        <p>${qr.label ?? qr.type}</p>
        <img src="${qr.imageDataUrl}" />
        <div class="foot">Scan to order</div>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-2">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as (typeof GENERATABLE_TYPES)[number])}
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm"
        >
          {GENERATABLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {newType === "PRODUCT" && (
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm"
          >
            <option value="">Choose product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <Button onClick={generate} disabled={generating}>
          {generating ? "Generating..." : "Generate QR"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {qrCodes.map((qr) => (
          <div key={qr.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge tone="primary">{qr.type}</Badge>
                <p className="mt-1 font-medium">{qr.label ?? qr.type}</p>
              </div>
              <Switch checked={qr.status === "ACTIVE"} onCheckedChange={() => toggleStatus(qr)} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.imageDataUrl} alt={qr.label ?? qr.type} className="mx-auto my-3 h-32 w-32" />
            <div className="grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground">
              <div>
                <p className="text-sm font-semibold text-foreground">{qr.scanCount}</p>
                Scans
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{qr.orderCount}</p>
                Orders
              </div>
            </div>
            {qr.lastScannedAt && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Last scanned {new Date(qr.lastScannedAt).toLocaleString()}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <a
                href={qr.imageDataUrl}
                download={`${qr.type.toLowerCase()}-qr.png`}
                className="flex-1 rounded-lg border border-border py-1.5 text-center text-xs font-semibold"
              >
                Download
              </a>
              <button
                onClick={() => printQr(qr)}
                className="flex-1 rounded-lg border border-border py-1.5 text-xs font-semibold"
              >
                Print
              </button>
            </div>
          </div>
        ))}
      </div>
      {qrCodes.length === 0 && <p className="text-muted-foreground">No QR codes yet — generate one above.</p>}
    </div>
  );
}
