"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { FoodCard, type FoodCardData } from "./FoodCard";
import { useCartStore, cartLineKey } from "@/lib/cart/store";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  products: (FoodCardData & { _count: { options: number; addons: number } })[];
}

export function ShopMenu({
  shopId,
  shopName,
  shopSlug,
  categories,
  supportsDelivery,
  supportsPickup,
  dineInTable,
  dineInQrToken,
}: {
  shopId: string;
  shopName: string;
  shopSlug: string;
  categories: Category[];
  initialTab?: string;
  supportsDelivery: boolean;
  supportsPickup: boolean;
  dineInTable: { id: string; label: string; area: string } | null;
  dineInQrToken?: string;
}) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const { addItem, conflict, resolveConflictByClearing, dismissConflict, setOrderContext, orderMode } =
    useCartStore();

  useEffect(() => {
    if (dineInTable && dineInQrToken) {
      setOrderContext({
        orderMode: "DINE_IN",
        tableQrToken: dineInQrToken,
        tableLabel: dineInTable.label,
        entryQrToken: dineInQrToken,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dineInTable?.id, dineInQrToken]);

  function selectMode(mode: "DELIVERY" | "PICKUP") {
    setOrderContext({ orderMode: mode, tableQrToken: null, tableLabel: null });
  }

  function handleSelect(product: FoodCardData & { _count?: { options: number; addons: number } }) {
    const hasCustomization = (product._count?.options ?? 0) + (product._count?.addons ?? 0) > 0;
    if (hasCustomization) {
      router.push(`/s/${shopSlug}/product/${product.id}`);
      return;
    }
    addItem(shopId, shopName, shopSlug, {
      key: cartLineKey(product.id, [], []),
      productId: product.id,
      name: product.name,
      unitPrice: product.discountPrice ?? product.price,
      imageUrl: product.imageUrl ?? undefined,
      quantity: 1,
      selectedOptions: [],
      selectedAddons: [],
    });
    toast(`Added ${product.name}`, "success");
  }

  const allProducts = useMemo(() => categories.flatMap((c) => c.products), [categories]);

  return (
    <div className="px-4 pt-4 sm:px-6">
      {!dineInTable && (supportsDelivery || supportsPickup) && (
        <div className="mb-4 flex gap-2">
          {supportsDelivery && (
            <button
              onClick={() => selectMode("DELIVERY")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium",
                orderMode === "DELIVERY" ? "border-primary bg-primary/10 text-primary" : "border-border"
              )}
            >
              <Truck size={15} /> Delivery
            </button>
          )}
          {supportsPickup && (
            <button
              onClick={() => selectMode("PICKUP")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium",
                orderMode === "PICKUP" ? "border-primary bg-primary/10 text-primary" : "border-border"
              )}
            >
              <ShoppingBag size={15} /> Pickup
            </button>
          )}
        </div>
      )}
      {dineInTable && (
        <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary">
          <UtensilsCrossed size={15} /> Dine-in — Table {dineInTable.label}
        </div>
      )}

      {allProducts.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">This menu is empty right now.</p>
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium",
                  activeCategory === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          {categories.map(
            (c) =>
              activeCategory === c.id && (
                <div key={c.id} className="mb-6 flex flex-col gap-2.5">
                  {c.products.map((p) => (
                    <FoodCard key={p.id} product={p} onSelect={handleSelect} />
                  ))}
                  {c.products.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No items in this category yet.
                    </p>
                  )}
                </div>
              )
          )}
        </>
      )}

      {conflict && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5">
            <h3 className="font-semibold">You can only order from one shop per order</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your cart has items from another shop. Clear it to add from {shopName}?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  resolveConflictByClearing();
                  toast(`Switched to ${shopName}`, "info");
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
      )}
    </div>
  );
}
