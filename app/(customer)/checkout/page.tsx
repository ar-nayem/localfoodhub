"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  ShoppingBag,
  UtensilsCrossed,
  CreditCard,
  MapPin,
  Clock3,
  CircleCheck,
  ChefHat,
  PackageCheck,
  Bike,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { BackButton } from "@/components/customer/BackButton";
import { isOrderTypeActive } from "@/lib/constants";
import { formatMoney, cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import type { SavedAddress } from "@/components/shared/AddressMapPicker";
import { checkoutJourneyFor } from "@/lib/customer/checkoutPresentation";

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
  const journey = checkoutJourneyFor(cart.orderMode);

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

  function selectSavedAddress(addr: SavedAddress) {
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
    <main className="mx-auto max-w-lg px-4 pb-48 pt-3">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <BackButton fallback="/cart" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">শখের খাবার</p>
          <h1 className="text-xl font-bold">Checkout</h1>
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Your order</p>
            <h2 className="mt-0.5 text-base font-bold">{cart.shopName ?? "Local kitchen"}</h2>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{cart.itemCount()} item{cart.itemCount() === 1 ? "" : "s"}</span>
        </div>
        <div className="mt-4 space-y-3">
          {cart.items.map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UtensilsCrossed size={22} /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-bold">{formatMoney(item.unitPrice * item.quantity)}</p>
            </div>
          ))}
        </div>
      </section>

      <Section title="How would you like it?" subtitle="Choose the handoff that works for you.">
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
              description="Collect from the shop"
              disabled={!canSelectMode}
            />
          </div>
        )}
      </Section>

      {cart.orderMode === "DELIVERY" && (
        <Section title="Delivery address" subtitle="Where should the rider bring your order?">
          <div className="flex flex-col gap-3">
            <Input placeholder="Street address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            <Input placeholder="Apartment, floor, etc. (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
            <Input placeholder="City / Area" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </Section>
      )}

      {cart.orderMode === "PICKUP" && (
        <Section title="Pickup time" subtitle="We’ll only start preparing after you confirm.">
          <div className="flex gap-2">
            <ModeButton active={pickupTime === "ASAP"} onClick={() => setPickupTime("ASAP")} icon={Clock3} label="ASAP" description="Next available slot" />
            <ModeButton active={pickupTime === "SCHEDULED"} onClick={() => setPickupTime("SCHEDULED")} icon={Clock3} label="Schedule" description="Choose a time" />
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
        <Section title="Contact details" subtitle="So the shop can reach you about your order.">
          {savedAddresses && savedAddresses.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => selectSavedAddress(addr)}
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

      <Section title="Who is this for?">
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

      <Section title="A note for the kitchen" subtitle="Optional — allergies or special instructions are best confirmed with the shop.">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the shop should know?" />
      </Section>

      <Section title="Payment" subtitle="Payment is securely confirmed before the order is sent.">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-3.5 py-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Pay Online</span>
              <span className="block text-xs text-muted-foreground">Secure online payment</span>
          </span>
        </div>
      </Section>

      <section className="mt-6 rounded-3xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CircleCheck size={18} className="text-primary" />
          <h2 className="text-sm font-bold">What happens next</h2>
        </div>
        <ol className="mt-4 space-y-4">
          {journey.map((step, index) => {
            const Icon = [CircleCheck, ChefHat, cart.orderMode === "DELIVERY" ? Bike : PackageCheck][index] ?? Store;
            return (
              <li key={step.label} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={16} /></span>
                <span>
                  <span className="block text-sm font-semibold">{step.label}</span>
                  <span className="block text-xs leading-5 text-muted-foreground">{step.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-bold">Price details</h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Items subtotal</span><span>{formatMoney(sub)}</span></div>
          {cart.promoDiscount > 0 && <div className="flex justify-between text-success"><span>Discount {cart.promoCode ? `(${cart.promoCode})` : ""}</span><span>−{formatMoney(cart.promoDiscount)}</span></div>}
          <div className="flex justify-between text-muted-foreground"><span>Service fee</span><span>{formatMoney(0)}</span></div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><span>Total to pay</span><span>{formatMoney(total)}</span></div>
        </div>
      </section>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 px-4 py-4 backdrop-blur sm:bottom-0">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Total to pay</p>
            <p className="text-xl font-bold leading-tight">{formatMoney(total)}</p>
          </div>
          <Button onClick={placeOrder} disabled={placing} className="ml-auto flex-1 rounded-full" size="lg">
            {placing ? placingStage ?? "Placing order..." : `Pay ${formatMoney(total)} & place order`}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
  description,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-foreground hover:border-primary/40"
      )}
    >
      <span className="flex items-center gap-1.5">{Icon && <Icon size={15} />}{label}</span>
      {description && <span className="text-[11px] font-normal text-muted-foreground">{description}</span>}
    </button>
  );
}
