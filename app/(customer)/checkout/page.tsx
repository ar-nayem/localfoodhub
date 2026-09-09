"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, ShoppingBag, UtensilsCrossed, CreditCard, type LucideIcon } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { BackButton } from "@/components/customer/BackButton";
import { isOrderTypeActive } from "@/lib/constants";
import { formatMoney, cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import type { SavedAddress } from "@/components/shared/AddressMapPicker";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCartStore();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [pickupTime, setPickupTime] = useState<"ASAP" | "SCHEDULED">("ASAP");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [orderFor, setOrderFor] = useState<"ME" | "SOMEONE_ELSE">("ME");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientNote, setRecipientNote] = useState("");
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

  // Delivery is disabled for this launch; move any cart still carrying it to pickup so
  // checkout can't be stuck on an order type the customer can no longer see.
  useEffect(() => {
    if (cart.orderMode === "DELIVERY" && !isOrderTypeActive("DELIVERY")) {
      cart.setOrderContext({ orderMode: "PICKUP" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.orderMode]);

  // Signed-in customers get their saved contacts here instead of retyping name/phone every
  // order — a 401 just means "guest," not an error, so it's swallowed rather than shown.
  useEffect(() => {
    fetch("/api/account/locations")
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: SavedAddress[] | null) => {
        if (!rows || rows.length === 0) return;
        setSavedAddresses(rows);
        const preferred = rows.find((r) => r.isDefault) ?? rows[0];
        if (preferred.recipientName || preferred.recipientPhone) {
          setSelectedAddressId(preferred.id);
          setGuestName((v) => v || preferred.recipientName || "");
          setGuestPhone((v) => v || preferred.recipientPhone || "");
        }
      })
      .catch(() => undefined);
    // Only ever runs once on mount — picking a different saved contact below updates the
    // fields directly rather than re-triggering this fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useSavedAddress(addr: SavedAddress) {
    setSelectedAddressId(addr.id);
    setGuestName(addr.recipientName || "");
    setGuestPhone(addr.recipientPhone || "");
  }

  const canSelectMode = cart.orderMode !== "DINE_IN";

  async function placeOrder() {
    if (!cart.shopId || !cart.orderMode) {
      setError("Choose how you want your order before checking out.");
      return;
    }
    if (cart.orderMode === "DELIVERY" && (!addressLine1 || !city)) {
      setError("A delivery address is required.");
      return;
    }
    if (cart.orderMode === "PICKUP" && pickupTime === "SCHEDULED" && !scheduledTime) {
      setError("Choose a pickup time.");
      return;
    }
    if (cart.orderMode !== "DINE_IN" && (!guestName || !guestPhone)) {
      setError("Name and phone are required.");
      return;
    }
    if (orderFor === "SOMEONE_ELSE" && (!recipientName || !recipientPhone)) {
      setError("Recipient name and phone are required.");
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
          pickupTime:
            cart.orderMode === "PICKUP"
              ? pickupTime === "SCHEDULED"
                ? new Date(scheduledTime).toISOString()
                : "ASAP"
              : undefined,
          promoCode: cart.promoCode ?? undefined,
          guestName: guestName || undefined,
          guestPhone: guestPhone || undefined,
          notes: notes || undefined,
          recipientName: orderFor === "SOMEONE_ELSE" ? recipientName : undefined,
          recipientPhone: orderFor === "SOMEONE_ELSE" ? recipientPhone : undefined,
          recipientNote: orderFor === "SOMEONE_ELSE" ? recipientNote || undefined : undefined,
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
    <main className="mx-auto max-w-lg px-4 pb-44 pt-4">
      <div className="flex items-center gap-3">
        <BackButton fallback="/cart" />
        <h1 className="text-xl font-bold">Checkout</h1>
      </div>

      <Section title="Order Type">
        {cart.orderMode === "DINE_IN" ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm font-medium text-primary">
            <UtensilsCrossed size={16} /> Dine-in — Table {cart.tableLabel}
          </div>
        ) : (
          <div className="flex gap-2">
            {isOrderTypeActive("DELIVERY") && (
              <ModeButton
                active={cart.orderMode === "DELIVERY"}
                onClick={() => cart.setOrderContext({ orderMode: "DELIVERY" })}
                icon={Truck}
                label="Delivery"
                disabled={!canSelectMode}
              />
            )}
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
        <Section title="Delivery Address">
          <div className="flex flex-col gap-3">
            <Input placeholder="Street address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            <Input placeholder="Apartment, floor, etc. (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            <Input placeholder="City / Area" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </Section>
      )}

      {cart.orderMode === "PICKUP" && (
        <Section title="Pickup Time">
          <div className="flex gap-2">
            <ModeButton active={pickupTime === "ASAP"} onClick={() => setPickupTime("ASAP")} label="ASAP" />
            <ModeButton active={pickupTime === "SCHEDULED"} onClick={() => setPickupTime("SCHEDULED")} label="Schedule later" />
          </div>
          {pickupTime === "SCHEDULED" && (
            <Input
              type="datetime-local"
              className="mt-3"
              value={scheduledTime}
              min={new Date(Date.now() + 15 * 60_000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          )}
        </Section>
      )}

      {cart.orderMode !== "DINE_IN" && (
        <Section title="Contact Details">
          {savedAddresses && savedAddresses.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => useSavedAddress(addr)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold",
                    selectedAddressId === addr.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  {addr.label}
                  {addr.isDefault && " · Default"}
                </button>
              ))}
            </div>
          )}
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

      <Section title="Who is this order for?">
        <div className="flex gap-2">
          <ModeButton active={orderFor === "ME"} onClick={() => setOrderFor("ME")} label="Me" />
          <ModeButton active={orderFor === "SOMEONE_ELSE"} onClick={() => setOrderFor("SOMEONE_ELSE")} label="Someone else" />
        </div>
        {orderFor === "SOMEONE_ELSE" && (
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <Label htmlFor="recipientName">Recipient name</Label>
              <Input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="recipientPhone">Recipient phone</Label>
              <Input id="recipientPhone" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="recipientNote">Note for the shop (optional)</Label>
              <Input
                id="recipientNote"
                value={recipientNote}
                onChange={(e) => setRecipientNote(e.target.value)}
                placeholder="e.g. Please call when it's ready"
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="Notes (optional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the shop should know?" />
      </Section>

      <Section title="Payment Method">
        <div className="flex items-center gap-3 rounded-2xl border border-primary bg-primary/5 px-3.5 py-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Pay Online</span>
            <span className="block text-xs text-muted-foreground">
              Test payment — card, bKash, Nagad and Rocket come later
            </span>
          </span>
        </div>
      </Section>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface px-4 py-4 sm:bottom-0">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold leading-tight">{formatMoney(total)}</p>
          </div>
          <Button onClick={placeOrder} disabled={placing} className="ml-auto flex-1 rounded-full" size="lg">
            {placing ? placingStage ?? "Placing order..." : "Place Order"}
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
