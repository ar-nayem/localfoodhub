"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/constants";

interface OrderSummary {
  id: string;
  orderNumber: string;
  orderType: string;
  orderStatus: string;
  total: number;
  createdAt: string;
  shop: { name: string; slug: string };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/orders").then(async (r) => {
      if (r.status === 401) {
        setUnauthenticated(true);
        setOrders([]);
        return;
      }
      setOrders(await r.json());
    });
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

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <h1 className="mb-4 text-xl font-bold">Your orders</h1>
      {!orders ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Your next meal is waiting.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <div>
                <p className="font-medium">{o.shop.name}</p>
                <p className="text-xs text-muted-foreground">
                  #{o.orderNumber} · {new Date(o.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(o.total)}</p>
                <Badge tone="primary">{ORDER_STATUS_LABEL[o.orderStatus] ?? o.orderStatus}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
