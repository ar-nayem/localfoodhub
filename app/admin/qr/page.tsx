"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";

interface QrRow {
  id: string;
  type: string;
  status: string;
  label?: string | null;
  scanCount: number;
  orderCount: number;
  shop?: { name: string } | null;
  location?: { name: string } | null;
  imageDataUrl: string;
}

interface LocationOption {
  id: string;
  name: string;
}

export default function AdminQrPage() {
  const [qrCodes, setQrCodes] = useState<QrRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [generating, setGenerating] = useState(false);

  async function load() {
    const [qr, locs] = await Promise.all([
      fetch("/api/qr").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]);
    setQrCodes(qr);
    setLocations(locs);
  }

  useEffect(() => {
    load();
  }, []);

  async function generateLocationQr() {
    if (!locationId) return;
    setGenerating(true);
    const res = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "LOCATION",
        locationId,
        label: locations.find((l) => l.id === locationId)?.name,
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

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">QR codes</h1>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface p-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">Generate a LOCATION QR</p>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-11 w-56 rounded-xl border border-border bg-surface px-3 text-sm"
          >
            <option value="">Choose a location...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={generateLocationQr} disabled={generating || !locationId}>
          Generate
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Label</th>
              <th className="px-4 py-2.5">Shop / Location</th>
              <th className="px-4 py-2.5">Scans</th>
              <th className="px-4 py-2.5">Orders</th>
              <th className="px-4 py-2.5">Active</th>
            </tr>
          </thead>
          <tbody>
            {qrCodes.map((qr) => (
              <tr key={qr.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  <Badge tone="primary">{qr.type}</Badge>
                </td>
                <td className="px-4 py-2.5">{qr.label ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {qr.shop?.name ?? qr.location?.name ?? "—"}
                </td>
                <td className="px-4 py-2.5">{qr.scanCount}</td>
                <td className="px-4 py-2.5">{qr.orderCount}</td>
                <td className="px-4 py-2.5">
                  <Switch checked={qr.status === "ACTIVE"} onCheckedChange={() => toggleStatus(qr)} />
                </td>
              </tr>
            ))}
            {qrCodes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No QR codes yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
