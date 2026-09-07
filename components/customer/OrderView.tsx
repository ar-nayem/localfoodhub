"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MapPin, Clock, ShieldCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, isCancellable, type OrderType } from "@/lib/constants";
import { toast } from "@/components/ui/Toast";
import { OrderReviewSection } from "./OrderReviewSection";
import { CancelOrderDialog } from "./CancelOrderDialog";

interface OrderData {
  id: string;
  orderNumber: string;
  orderType: string;
  orderStatus: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  guestName?: string | null;
  shop: { name: string; phone?: string | null; slug: string };
  table?: { label: string; area: string } | null;
  deliveryAddress?: { line1: string; line2?: string | null; city: string } | null;
  pickupTime?: string | null;
  items: { id: string; name: string; price: number; quantity: number; notes?: string | null }[];
  statusEvents?: { status: string; createdAt: string }[];
}

function timeOf(events: { status: string; createdAt: string }[] | undefined, status: string) {
  const event = events?.find((e) => e.status === status);
  if (!event) return null;
  return new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function OrderView({
  order: initialOrder,
  qrImage,
  justPaid,
  isVerifyingStaff,
}: {
  order: OrderData;
  qrImage: string | null;
  justPaid: boolean;
  isVerifyingStaff: boolean;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [verifying, setVerifying] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (["COMPLETED", "CANCELLED", "DELIVERED"].includes(order.orderStatus)) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/orders/${order.id}`);
      if (res.ok) setOrder(await res.json());
    }, 6000);
    return () => clearInterval(interval);
  }, [order.id, order.orderStatus]);

  const flow = ORDER_STATUS_FLOW[order.orderType as OrderType] ?? [];
  const currentIndex = flow.indexOf(order.orderStatus);
  const cancelled = order.orderStatus === "CANCELLED";
  const canCancel = !isVerifyingStaff && isCancellable(order.orderStatus);

  async function cancelOrder(reason: string | null) {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error ?? "Could not cancel this order.");
        // The shop accepted mid-flight — refresh so the UI stops offering Cancel.
        const fresh = await fetch(`/api/orders/${order.id}`);
        if (fresh.ok) setOrder(await fresh.json());
        return;
      }
      setOrder(data.order);
      setCancelOpen(false);
      toast(
        data.refundState === "REFUNDED"
          ? "Order cancelled — refund completed"
          : data.refundState === "PROCESSING"
            ? "Order cancelled — refund processing"
            : "Order cancelled",
        "success"
      );
    } catch {
      setCancelError("Could not cancel this order.");
    } finally {
      setCancelling(false);
    }
  }

  async function markCollected() {
    setVerifying(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) throw new Error("Could not update order");
      setOrder(await res.json());
      toast("Order marked collected", "success");
    } catch {
      toast("Could not update order", "error");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div>
      {isVerifyingStaff && (
        <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <ShieldCheck size={16} /> Staff verification
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payment: <strong>{order.paymentStatus}</strong> · Status: <strong>{order.orderStatus}</strong>
          </p>
          {order.orderStatus !== "COMPLETED" ? (
            <Button onClick={markCollected} disabled={verifying} className="mt-3 w-full">
              {verifying ? "Marking..." : "Mark Collected"}
            </Button>
          ) : (
            <p className="mt-2 text-sm font-medium text-success">Verified & collected</p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        {!cancelled && (
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 size={28} />
          </div>
        )}
        <h1 className="text-lg font-bold">
          {cancelled ? "Order cancelled" : justPaid ? "Order confirmed!" : `Order #${order.orderNumber}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.shop.name} · #{order.orderNumber}
        </p>
        {!cancelled ? (
          <Badge tone="primary" className="mt-3">
            {ORDER_STATUS_LABEL[order.orderStatus] ?? order.orderStatus}
          </Badge>
        ) : (
          <div className="mt-3">
            <Badge tone="error">Cancelled</Badge>
            {order.cancelledAt && (
              <p className="mt-2 text-sm text-muted-foreground">
                Cancelled at {new Date(order.cancelledAt).toLocaleString()}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Refund:{" "}
              <span className="font-medium text-foreground">
                {order.paymentStatus === "REFUNDED"
                  ? "Completed"
                  : order.paymentStatus === "PROCESSING"
                    ? "Processing"
                    : "Not applicable"}
              </span>
            </p>
          </div>
        )}
      </div>

      {canCancel && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-medium">Changed your mind?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can cancel until the shop accepts this order.
          </p>
          <button
            onClick={() => {
              setCancelError(null);
              setCancelOpen(true);
            }}
            className="mt-3 rounded-xl border border-error px-4 py-2 text-sm font-semibold text-error"
          >
            Cancel Order
          </button>
        </div>
      )}

      {order.table && (
        <InfoRow icon={MapPin} label="Table" value={`${order.table.area} · ${order.table.label}`} />
      )}
      {order.deliveryAddress && (
        <InfoRow
          icon={MapPin}
          label="Delivering to"
          value={`${order.deliveryAddress.line1}${order.deliveryAddress.line2 ? ", " + order.deliveryAddress.line2 : ""}, ${order.deliveryAddress.city}`}
        />
      )}
      {order.pickupTime && (
        <InfoRow icon={Clock} label="Pickup time" value={new Date(order.pickupTime).toLocaleTimeString()} />
      )}

      {!cancelled && flow.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Order status</h2>
          <ol className="flex flex-col gap-0">
            {flow.map((status, idx) => {
              const done = idx <= currentIndex;
              const at = timeOf(order.statusEvents, status);
              return (
                <li key={status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? "✓" : ""}
                    </span>
                    {idx < flow.length - 1 && (
                      <span
                        className={`w-0.5 flex-1 ${idx < currentIndex ? "bg-primary" : "bg-border"}`}
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="flex flex-1 items-baseline justify-between gap-3 pb-4">
                    <span className={done ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
                      {ORDER_STATUS_LABEL[status]}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{at ?? "—"}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Order summary</h2>
        <div className="flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span>{formatMoney(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-{formatMoney(order.discount)}</span>
            </div>
          )}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery fee</span>
              <span>{formatMoney(order.deliveryFee)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-base font-bold">
            <span>Total paid</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>
      </div>

      {qrImage && !cancelled && (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrImage} alt="Order QR code" className="h-44 w-44" />
          <p className="mt-3 text-sm text-muted-foreground">Show this QR when collecting your order.</p>
        </div>
      )}

      {order.orderStatus === "COMPLETED" && !isVerifyingStaff && (
        <OrderReviewSection orderId={order.id} orderType={order.orderType} items={order.items} />
      )}

      {cancelOpen && (
        <CancelOrderDialog
          onConfirm={cancelOrder}
          onClose={() => setCancelOpen(false)}
          submitting={cancelling}
          error={cancelError}
        />
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm">
      <Icon size={15} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
