"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

interface ShopRow {
  id: string;
  name: string;
  category: string;
  address: string;
  status: string;
  createdAt: string;
  location?: { name: string } | null;
  staff: { user: { name: string; email: string } }[];
}

const TONE: Record<string, "warning" | "success" | "error" | "neutral"> = {
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "error",
  CLOSED: "neutral",
};

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [filter, setFilter] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/shops${filter ? `?status=${filter}` : ""}`);
    if (res.ok) setShops(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast("Could not update shop", "error");
      return;
    }
    toast(`Shop ${status.toLowerCase()}`, "success");
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Shops</h1>
      <div className="mb-4 flex gap-2">
        {["", "PENDING", "ACTIVE", "SUSPENDED", "CLOSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              filter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {shops.map((shop) => (
          <div key={shop.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{shop.name}</p>
                <p className="text-sm text-muted-foreground">
                  {shop.category} · {shop.address}
                  {shop.location && ` · ${shop.location.name}`}
                </p>
                {shop.staff[0] && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Owner: {shop.staff[0].user.name} ({shop.staff[0].user.email})
                  </p>
                )}
              </div>
              <Badge tone={TONE[shop.status]}>{shop.status}</Badge>
            </div>
            <div className="mt-3 flex gap-2">
              {shop.status === "PENDING" && (
                <>
                  <Button size="sm" onClick={() => setStatus(shop.id, "ACTIVE")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setStatus(shop.id, "SUSPENDED")}>
                    Reject
                  </Button>
                </>
              )}
              {shop.status === "ACTIVE" && (
                <Button size="sm" variant="danger" onClick={() => setStatus(shop.id, "SUSPENDED")}>
                  Suspend
                </Button>
              )}
              {shop.status === "SUSPENDED" && (
                <Button size="sm" onClick={() => setStatus(shop.id, "ACTIVE")}>
                  Reinstate
                </Button>
              )}
            </div>
          </div>
        ))}
        {shops.length === 0 && <p className="text-muted-foreground">No shops match this filter.</p>}
      </div>
    </div>
  );
}
