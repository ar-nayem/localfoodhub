"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartLineItem {
  key: string; // productId + serialized options/addons, so distinct customizations stack separately
  productId: string;
  name: string;
  unitPrice: number; // base price + option deltas + addon prices, per unit
  imageUrl?: string;
  quantity: number;
  selectedOptions: { optionName: string; valueLabel: string; priceDelta: number }[];
  selectedAddons: { name: string; price: number }[];
  notes?: string;
}

export type OrderMode = "DELIVERY" | "PICKUP" | "DINE_IN";

interface CartState {
  shopId: string | null;
  shopName: string | null;
  shopSlug: string | null;
  orderMode: OrderMode | null;
  tableQrToken: string | null;
  tableLabel: string | null;
  entryQrToken: string | null;
  promoCode: string | null;
  promoDiscount: number;
  items: CartLineItem[];
  /** Set when addItem is called for a different shop than what's already in the cart —
   * spec Section 12: never silently mix orders from different vendors. */
  conflict: { shopId: string; shopName: string; shopSlug: string; item: CartLineItem } | null;

  addItem: (shopId: string, shopName: string, shopSlug: string, item: CartLineItem) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  resolveConflictByClearing: () => void;
  dismissConflict: () => void;
  subtotal: () => number;
  itemCount: () => number;
  setPromo: (code: string | null, discount: number) => void;
  setOrderContext: (ctx: {
    orderMode?: OrderMode | null;
    tableQrToken?: string | null;
    tableLabel?: string | null;
    entryQrToken?: string | null;
  }) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      shopId: null,
      shopName: null,
      shopSlug: null,
      orderMode: null,
      tableQrToken: null,
      tableLabel: null,
      entryQrToken: null,
      promoCode: null,
      promoDiscount: 0,
      items: [],
      conflict: null,

      setOrderContext: (ctx) => set((s) => ({ ...s, ...ctx })),
      setPromo: (code, discount) => set({ promoCode: code, promoDiscount: discount }),

      addItem: (shopId, shopName, shopSlug, item) => {
        const state = get();
        if (state.shopId && state.shopId !== shopId) {
          set({ conflict: { shopId, shopName, shopSlug, item } });
          return;
        }
        set((s) => {
          const existing = s.items.find((i) => i.key === item.key);
          const items = existing
            ? s.items.map((i) =>
                i.key === item.key ? { ...i, quantity: i.quantity + item.quantity } : i
              )
            : [...s.items, item];
          return { shopId, shopName, shopSlug, items };
        });
      },

      setQuantity: (key, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.key !== key)
              : s.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })),

      removeItem: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

      clear: () =>
        set({
          shopId: null,
          shopName: null,
          shopSlug: null,
          orderMode: null,
          tableQrToken: null,
          tableLabel: null,
          entryQrToken: null,
          promoCode: null,
          promoDiscount: 0,
          items: [],
        }),

      resolveConflictByClearing: () => {
        const conflict = get().conflict;
        if (!conflict) return;
        set({
          shopId: conflict.shopId,
          shopName: conflict.shopName,
          shopSlug: conflict.shopSlug,
          orderMode: null,
          tableQrToken: null,
          tableLabel: null,
          entryQrToken: null,
          promoCode: null,
          promoDiscount: 0,
          items: [conflict.item],
          conflict: null,
        });
      },

      dismissConflict: () => set({ conflict: null }),

      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    // skipHydration + manual rehydrate (see CartHydrator.tsx): every page that reads
    // this store is a "use client" component, which Next.js still server-renders for the
    // initial HTML. Auto-hydrating from localStorage during store creation would make
    // that first client render diverge from the server's (cart-less) render and trip a
    // hydration-mismatch error on every page, not just one banner. Deferring rehydration
    // to a post-mount effect keeps first paint identical everywhere, then the real cart
    // populates a moment later.
    { name: "lfh-cart", skipHydration: true }
  )
);

export function cartLineKey(
  productId: string,
  selectedOptions: { optionName: string; valueLabel: string }[],
  selectedAddons: { name: string }[]
): string {
  const opts = selectedOptions.map((o) => `${o.optionName}:${o.valueLabel}`).sort().join(",");
  const addons = selectedAddons.map((a) => a.name).sort().join(",");
  return `${productId}|${opts}|${addons}`;
}
