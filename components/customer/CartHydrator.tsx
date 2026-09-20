"use client";

import { useEffect } from "react";
import { useCartStore, CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY } from "@/lib/cart/store";

/** Triggers the cart store's deferred localStorage rehydration exactly once, after
 * mount — pairs with `skipHydration: true` in lib/cart/store.ts. Mount this once near
 * the root of the customer-facing tree. */
export function CartHydrator() {
  useEffect(() => {
    // Move a cart saved under the pre-rename key before rehydrating, so anyone who had
    // items in their basket when the rename shipped still finds them. Runs once: the old
    // key is removed, so the next visit takes the fast path.
    try {
      const legacy = localStorage.getItem(LEGACY_CART_STORAGE_KEY);
      if (legacy && !localStorage.getItem(CART_STORAGE_KEY)) {
        localStorage.setItem(CART_STORAGE_KEY, legacy);
      }
      if (legacy) localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). The cart just starts
      // empty in that case, which is what would have happened anyway.
    }

    useCartStore.persist.rehydrate();
  }, []);
  return null;
}
