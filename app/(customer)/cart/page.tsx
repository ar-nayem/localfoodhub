"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FoodThumb } from "@/components/customer/FoodThumb";
import { BackButton } from "@/components/customer/BackButton";
import { formatMoney } from "@/lib/utils";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    shopName,
    orderMode,
    tableLabel,
    setQuantity,
    subtotal,
    promoCode,
    promoDiscount,
    setPromo,
    shopId,
    shopSlug: cartShopSlug,
  } = useCartStore();
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const sub = subtotal();
  const total = sub - promoDiscount;

  async function applyPromo() {
    if (!promoInput.trim() || !shopId) return;
    setChecking(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, code: promoInput.trim(), subtotal: sub }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPromo(data.code, data.discountAmount);
    } catch (err) {
      setPromo(null, 0);
      setPromoError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setChecking(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ShoppingBag size={26} className="text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find something delicious nearby.</p>
        <Link href="/explore">
          <Button className="mt-5">Explore shops</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-40 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <BackButton fallback="/explore" />
        <h1 className="text-xl font-bold">Your Cart</h1>
      </div>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        {shopName}
        {orderMode && ` · ${orderMode === "DINE_IN" ? `Dine-in — Table ${tableLabel}` : orderMode === "DELIVERY" ? "Delivery" : "Pickup"}`}
      </p>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
              <FoodThumb src={item.imageUrl} label={item.name} rounded="rounded-xl" glyphClassName="text-xl" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">{shopName}</p>
              {item.selectedOptions.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  {item.selectedOptions.map((o) => o.valueLabel).join(", ")}
                </p>
              )}
              {item.selectedAddons.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  +{item.selectedAddons.map((a) => a.name).join(", ")}
                </p>
              )}
              {item.notes && <p className="truncate text-xs italic text-muted-foreground">&quot;{item.notes}&quot;</p>}
              <p className="mt-0.5 text-sm font-bold text-primary">{formatMoney(item.unitPrice)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setQuantity(item.key, item.quantity - 1)}
                aria-label={`Decrease ${item.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border"
              >
                <Minus size={14} />
              </button>
              <span className="w-4 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() => setQuantity(item.key, item.quantity + 1)}
                aria-label={`Increase ${item.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {cartShopSlug && (
        <Link
          href={`/s/${cartShopSlug}`}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-primary"
        >
          <Plus size={15} /> Add more items
        </Link>
      )}

      <div className="mt-5 flex gap-2">
        <Input
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value)}
          placeholder="Promo code"
          className="uppercase"
        />
        <Button variant="outline" onClick={applyPromo} disabled={checking || !promoInput.trim()}>
          {checking ? "..." : "Apply"}
        </Button>
      </div>
      {promoError && <p className="mt-1.5 text-sm text-error">{promoError}</p>}
      {promoCode && <p className="mt-1.5 text-sm text-success">Promo {promoCode} applied: -{formatMoney(promoDiscount)}</p>}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface px-4 py-4 sm:bottom-0">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <div className="min-w-0">
            {promoDiscount > 0 && (
              <div className="flex gap-2 text-xs text-success">
                <span>Discount</span>
                <span>-{formatMoney(promoDiscount)}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold leading-tight">{formatMoney(total)}</p>
          </div>
          <Button
            onClick={() => router.push("/checkout")}
            className="ml-auto flex-1 rounded-full"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </div>
    </main>
  );
}
