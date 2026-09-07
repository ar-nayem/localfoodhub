"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, ShoppingBag, UtensilsCrossed, CreditCard, type LucideIcon } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { formatMoney, cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCartStore();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [pickupTime, setPickupTime] = useState<"ASAP" | "SCHEDULED">("ASAP");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placingStage, setPlacingStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Placing an order clears the cart, which would otherwise immediately re-trigger the
  // empty-cart guard below and win the race against the redirect to the confirmation
  // page — this flag tells the guard to stand down once an order has actually gone through.
  const [orderPlaced, setOrderPlaced] = useState(false);

  const sub = cart.subtotal();
  const total = sub - cart.promoDiscount;

  useEffect(() => {
    if (cart.items.length === 0 && !orderPlaced) router.replace("/cart");
  }, [cart.items.length, orderPlaced, router]);

  const canSelectMode = cart.orderMode !== "DINE_IN";

  async function placeOrder() {
    if (!cart.shopId || !cart.orderMode) {
      setError("Choose delivery or pickup before checking out.");
      return;
    }
    if (cart.orderMode === "DELIVERY" && (!addressLine1 || !city)) {
      setError("A delivery address is required.");
      return;
    }
    if (cart.orderMode !== "DINE_IN" && (!guestName || !guestPhone)) {
      setError("Name and phone are required.");
      return;
    }

    setPlacing(true);
    setError(null);
    try {
      setPlacingStage("Placing your order...");
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          shopId: cart.shopId,
          orderType: cart.orderMode,
          items: cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            selectedOptions: i.selectedOptions,
            selectedAddons: i.selectedAddons,
            notes: i.notes,
          })),
          tableQrToken: cart.orderMode === "DINE_IN" ? cart.tableQrToken : undefined,
          entryQrToken: cart.entryQrToken ?? undefined,
          deliveryAddress:
            cart.orderMode === "DELIVERY" ? { line1: addressLine1, line2: addressLine2, city } : undefined,
          pickupTime: cart.orderMode === "PICKUP" ? pickupTime : undefined,
          promoCode: cart.promoCode ?? undefined,
          guestName: guestName || undefined,
          guestPhone: guestPhone || undefined,
          notes: notes || undefined,
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || "Could not place order");

      setPlacingStage("Processing payment...");
      const payRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!payRes.ok) throw new Error("Payment failed to start");

      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || verifyData.status !== "PAID") {
        throw new Error("Payment failed. Your order has not been confirmed.");
      }

      if (cart.discoveryPick && cart.items.some((i) => i.productId === cart.discoveryPick!.productId)) {
        fetch("/api/discover/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...cart.discoveryPick, action: "ORDERED" }),
        }).catch(() => undefined);
      }

      setOrderPlaced(true);
      cart.clear();
      toast("Order confirmed!", "success");
      router.push(`/orders/${order.id}?justPaid=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPlacing(false);
      setPlacingStage(null);
    }
  }

  if (cart.items.length === 0 && !orderPlaced) return null;

  return (
    <main className="mx-auto max-w-lg px-4 pb-40 pt-6">
      <h1 className="text-xl font-bold">Checkout</h1>

      <Section title="Order type">
        {cart.orderMode === "DINE_IN" ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm font-medium text-primary">
            <UtensilsCrossed size={16} /> Dine-in — Table {cart.tableLabel}
          </div>
        ) : (
          <div className="flex gap-2">
            <ModeButton
              active={cart.orderMode === "DELIVERY"}
              onClick={() => cart.setOrderContext({ orderMode: "DELIVERY" })}
              icon={Truck}
              label="Delivery"
              disabled={!canSelectMode}
            />
            <ModeButton
              active={cart.orderMode === "PICKUP"}
              onClick={() => cart.setOrderContext({ orderMode: "PICKUP" })}
              icon={ShoppingBag}
              label="Pickup"
              disabled={!canSelectMode}
            />
          </div>
        )}
      </Section>

      {cart.orderMode === "DELIVERY" && (
        <Section title="Delivery address">
          <div className="flex flex-col gap-3">
            <Input placeholder="Street address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            <Input placeholder="Apartment, floor, etc. (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            <Input placeholder="City / Area" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </Section>
      )}

      {cart.orderMode === "PICKUP" && (
        <Section title="Pickup time">
          <div className="flex gap-2">
            <ModeButton active={pickupTime === "ASAP"} onClick={() => setPickupTime("ASAP")} label="ASAP" />
            <ModeButton active={pickupTime === "SCHEDULED"} onClick={() => setPickupTime("SCHEDULED")} label="Schedule later" />
          </div>
        </Section>
      )}

      {cart.orderMode !== "DINE_IN" && (
        <Section title="Contact details">
          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </div>
          </div>
        </Section>
      )}

      <Section title="Notes (optional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the shop should know?" />
      </Section>

      <Section title="Payment method">
        <div className="flex items-center gap-2 rounded-xl border border-primary bg-primary/5 px-3.5 py-3 text-sm font-medium">
          <CreditCard size={16} className="text-primary" />
          Pay now (test payment)
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Card, bKash, Nagad, and Rocket are coming soon — this checkout runs on a test
          payment flow for now.
        </p>
      </Section>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 py-4">
        <div className="mx-auto max-w-lg">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>Total</span>
            <span className="text-base font-bold text-foreground">{formatMoney(total)}</span>
          </div>
          <Button onClick={placeOrder} disabled={placing} className="w-full" size="lg">
            {placing ? placingStage ?? "Placing order..." : `Place Order & Pay ${formatMoney(total)}`}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2.5 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium disabled:opacity-50",
        active ? "border-primary bg-primary/10 text-primary" : "border-border"
      )}
    >
      {Icon && <Icon size={15} />}
      {label}
    </button>
  );
}
