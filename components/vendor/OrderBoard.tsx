"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { formatMoney, cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";

interface OrderRow {
  id: string;
  orderNumber: string;
  orderType: string;
  orderStatus: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  guestName?: string | null;
  notes?: string | null;
  table?: { label: string; area: string } | null;
  deliveryAddress?: { line1: string; city: string } | null;
  items: { id: string; name: string; quantity: number; notes?: string | null }[];
}

const COLUMNS: { key: string; label: string; statuses: string[]; next?: string; nextLabel?: string }[] = [
  { key: "new", label: "New", statuses: ["PENDING", "CONFIRMED"], next: "ACCEPTED", nextLabel: "Accept" },
  { key: "accepted", label: "Accepted", statuses: ["ACCEPTED"], next: "PREPARING", nextLabel: "Start Preparing" },
  { key: "preparing", label: "Preparing", statuses: ["PREPARING"], next: "READY", nextLabel: "Mark Ready" },
  { key: "ready", label: "Ready", statuses: ["READY"], next: "COMPLETED", nextLabel: "Mark Completed" },
  { key: "completed", label: "Completed", statuses: ["COMPLETED", "DELIVERED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "REFUNDED"] },
];

export function OrderBoard({ large = false }: { large?: boolean }) {
  const { shop } = useVendorShop();
  const [orders, setOrders] = useState<OrderRow[]>([]);

  async function load() {
    if (!shop) return;
    const res = await fetch(`/api/orders?shopId=${shop.id}`);
    if (res.ok) setOrders(await res.json());
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  async function advance(orderId: string, status: string) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast("Could not update order", "error");
      return;
    }
    load();
  }

  const activeColumns = large ? COLUMNS.slice(0, 4) : COLUMNS;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {activeColumns.map((col) => {
        const columnOrders = orders.filter((o) => col.statuses.includes(o.orderStatus));
        return (
          <div key={col.key} className="w-72 shrink-0">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              {col.label} <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{columnOrders.length}</span>
            </h2>
            <div className="flex flex-col gap-3">
              {columnOrders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    "rounded-2xl border border-border bg-surface p-4 shadow-sm",
                    large && "p-5"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={cn("font-bold", large && "text-lg")}>#{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.orderType === "DINE_IN"
                          ? `Table ${order.table?.label ?? "?"}`
                          : order.orderType === "DELIVERY"
                            ? order.deliveryAddress?.city ?? "Delivery"
                            : "Pickup"}
                        {order.guestName ? ` · ${order.guestName}` : ""}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <ul className={cn("mt-2.5 space-y-0.5", large ? "text-base" : "text-sm")}>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity} × {item.name}
                        {item.notes && <span className="text-muted-foreground"> ({item.notes})</span>}
                      </li>
                    ))}
                  </ul>
                  {order.notes && (
                    <p className="mt-1.5 text-xs italic text-muted-foreground">Note: {order.notes}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                    <span className="text-sm font-semibold">{formatMoney(order.total)}</span>
                    {col.next && (
                      <button
                        onClick={() => advance(order.id, col.next!)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        {col.nextLabel}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {columnOrders.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Nothing here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
