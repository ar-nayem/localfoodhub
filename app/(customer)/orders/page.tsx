"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL, isCancellable } from "@/lib/constants";

interface OrderSummary {
  id: string;
  orderNumber: string;
  orderType: string;
  orderStatus: string;
  total: number;
  createdAt: string;
  shop: { name: string; slug: string };
}

const CLOSED_STATUSES = ["COMPLETED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"ongoing" | "completed">("ongoing");

  useEffect(() => {
    fetch("/api/orders")
      .then(async (r) => {
        if (r.status === 401) {
          setUnauthenticated(true);
          setOrders([]);
          return;
        }
        if (!r.ok) throw new Error("failed");
        setOrders(await r.json());
      })
      .catch(() => setFailed(true));
  }, []);

  if (unauthenticated) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <ClipboardList size={26} className="mb-3 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Sign in to see your orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A confirmed order is always reachable from its own confirmation link, even as a
          guest — sign in to see your full history in one place.
        </p>
        <Link href="/login" className="mt-4 font-medium text-primary">
          Sign in
        </Link>
      </main>
    );
  }

  const visible = (orders ?? []).filter((o) =>
    tab === "ongoing" ? !CLOSED_STATUSES.includes(o.orderStatus) : CLOSED_STATUSES.includes(o.orderStatus)
  );

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <h1 className="mb-4 text-xl font-bold">Your orders</h1>

      <div className="mb-4 flex gap-2">
        {(["ongoing", "completed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium capitalize",
              tab === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {failed ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Couldn&apos;t load your orders. Please refresh and try again.
        </div>
      ) : !orders ? (
        <p className="text-muted-foreground">Loading your orders...</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {tab === "ongoing" ? "No orders in progress." : "No previous orders yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{o.shop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    #{o.orderNumber} · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{formatMoney(o.total)}</p>
                  <Badge tone={o.orderStatus === "CANCELLED" ? "error" : "primary"}>
                    {ORDER_STATUS_LABEL[o.orderStatus] ?? o.orderStatus}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/orders/${o.id}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  {CLOSED_STATUSES.includes(o.orderStatus) ? "View Details" : "Track Order"}
                </Link>
                {isCancellable(o.orderStatus) && (
                  <Link
                    href={`/orders/${o.id}`}
                    className="rounded-lg border border-error px-3 py-1.5 text-xs font-semibold text-error"
                  >
                    Cancel Order
                  </Link>
                )}
                {o.orderStatus === "COMPLETED" && (
                  <Link
                    href={`/orders/${o.id}`}
                    className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    Write a Review
                  </Link>
                )}
                <Link
                  href={`/s/${o.shop.slug}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  Reorder
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
