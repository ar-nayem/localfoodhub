"use client";

import { useEffect } from "react";
import { useCartStore, CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEYS } from "@/lib/cart/store";

/** Triggers the cart store's deferred localStorage rehydration exactly once, after
 * mount — pairs with `skipHydration: true` in lib/cart/store.ts. Mount this once near
 * the root of the customer-facing tree. */
export function CartHydrator() {
  useEffect(() => {
    // Move a cart saved under any prior key before rehydrating, so anyone who had items
    // in their basket before this rename (or an earlier one) still finds them. Takes the
    // first legacy key that actually has data, then clears every legacy key found — so a
    // second rename later starts from a clean slate rather than accumulating dead keys.
    try {
      if (!localStorage.getItem(CART_STORAGE_KEY)) {
        const found = LEGACY_CART_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
        if (found) localStorage.setItem(CART_STORAGE_KEY, found);
      }
      for (const key of LEGACY_CART_STORAGE_KEYS) localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). The cart just starts
      // empty in that case, which is what would have happened anyway.
    }

    useCartStore.persist.rehydrate();
  }, []);
  return null;
}
