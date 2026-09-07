"use client";

import { useCartStore } from "@/lib/cart/store";
import { toast } from "@/components/ui/Toast";

/** Mounted once at the customer layout root so every "Add to cart" entry point (shop
 * menu, product detail page, Explore's "Choose This") gets the same conflict-resolution
 * UI instead of each page needing to remember to render it — spec Section 12: never
 * silently mix items from two shops into one order. */
export function CartConflictDialog() {
  const conflict = useCartStore((s) => s.conflict);
  const resolveConflictByClearing = useCartStore((s) => s.resolveConflictByClearing);
  const dismissConflict = useCartStore((s) => s.dismissConflict);

  if (!conflict) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5">
        <h3 className="font-semibold">You can only order from one shop per order</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your cart has items from another shop. Clear it to add from {conflict.shopName}?
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => {
              resolveConflictByClearing();
              toast(`Switched to ${conflict.shopName}`, "info");
            }}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Clear cart & add
          </button>
          <button
            onClick={dismissConflict}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
