"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart/store";

/** Triggers the cart store's deferred localStorage rehydration exactly once, after
 * mount — pairs with `skipHydration: true` in lib/cart/store.ts. Mount this once near
 * the root of the customer-facing tree. */
export function CartHydrator() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);
  return null;
}
