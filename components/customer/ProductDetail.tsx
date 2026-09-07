"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Minus, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, cn } from "@/lib/utils";
import { useCartStore, cartLineKey } from "@/lib/cart/store";
import { ReviewList } from "./ReviewList";
import { toast } from "@/components/ui/Toast";

interface OptionValue {
  id: string;
  label: string;
  priceDelta: number;
}
interface Option {
  id: string;
  name: string;
  values: OptionValue[];
}
interface Addon {
  id: string;
  name: string;
  price: number;
}

export function ProductDetail({
  product,
}: {
  product: {
    id: string;
    shopId: string;
    shop: { slug: string; name: string };
    name: string;
    description: string;
    price: number;
    discountPrice: number | null;
    imageUrl: string | null;
    status: string;
    prepTimeMinutes: number;
    ingredients: string[];
    allergens: string[];
    dietaryTags: string[];
    options: Option[];
    addons: Addon[];
  };
}) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const [selectedValues, setSelectedValues] = useState<Record<string, OptionValue>>({});
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const basePrice = product.discountPrice ?? product.price;
  const unitPrice = useMemo(() => {
    const optionsTotal = Object.values(selectedValues).reduce((s, v) => s + v.priceDelta, 0);
    const addonsTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
    return basePrice + optionsTotal + addonsTotal;
  }, [basePrice, selectedValues, selectedAddons]);

  const unavailable = product.status !== "AVAILABLE";
  const missingRequiredOption = product.options.some((o) => !selectedValues[o.id]);

  function toggleAddon(addon: Addon) {
    setSelectedAddons((prev) =>
      prev.some((a) => a.id === addon.id) ? prev.filter((a) => a.id !== addon.id) : [...prev, addon]
    );
  }

  function handleAdd() {
    const selOptions = product.options.map((o) => ({
      optionName: o.name,
      valueLabel: selectedValues[o.id]?.label ?? "",
      priceDelta: selectedValues[o.id]?.priceDelta ?? 0,
    }));
    const selAddons = selectedAddons.map((a) => ({ name: a.name, price: a.price }));

    const added = addItem(product.shopId, product.shop.name, product.shop.slug, {
      key: cartLineKey(product.id, selOptions, selAddons),
      productId: product.id,
      name: product.name,
      unitPrice,
      imageUrl: product.imageUrl ?? undefined,
      quantity,
      selectedOptions: selOptions,
      selectedAddons: selAddons,
      notes: notes || undefined,
    });
    // On a conflict, addItem sets the store's `conflict` state instead of adding — the
    // globally-mounted CartConflictDialog (app/(customer)/layout.tsx) takes over from
    // here. Only treat this as success — toast + navigate away — when it actually added.
    if (added) {
      toast(`Added ${quantity} × ${product.name}`, "success");
      router.back();
    }
  }

  return (
    <div>
      <div className="relative aspect-square w-full bg-muted sm:aspect-[4/3] sm:rounded-b-2xl">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover sm:rounded-b-2xl" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">🍲</div>
        )}
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="px-4 pt-4 sm:px-6">
        <h1 className="text-xl font-bold">{product.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-lg font-semibold text-primary">{formatMoney(basePrice)}</span>
          {product.discountPrice && (
            <span className="text-sm text-muted-foreground line-through">{formatMoney(product.price)}</span>
          )}
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock size={14} /> {product.prepTimeMinutes} min
          </span>
        </div>

        {product.dietaryTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.dietaryTags.map((t) => (
              <Badge key={t} tone="primary">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {unavailable && (
          <div className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            This item is currently sold out.
          </div>
        )}

        {product.options.map((option) => (
          <div key={option.id} className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">{option.name}</h3>
            <div className="flex flex-wrap gap-2">
              {option.values.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedValues((prev) => ({ ...prev, [option.id]: v }))}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm",
                    selectedValues[option.id]?.id === v.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border"
                  )}
                >
                  {v.label}
                  {v.priceDelta > 0 && ` (+${formatMoney(v.priceDelta)})`}
                </button>
              ))}
            </div>
          </div>
        ))}

        {product.addons.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">Add-ons</h3>
            <div className="flex flex-col gap-2">
              {product.addons.map((a) => {
                const checked = selectedAddons.some((s) => s.id === a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAddon(a)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm",
                      checked ? "border-primary bg-primary/10" : "border-border"
                    )}
                  >
                    <span>{a.name}</span>
                    <span className="text-muted-foreground">+{formatMoney(a.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold">Special instructions</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Less spicy"
            rows={2}
          />
        </div>

        {product.ingredients.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            <span className="font-medium">Ingredients:</span> {product.ingredients.join(", ")}
          </p>
        )}
        {product.allergens.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Allergens:</span> {product.allergens.join(", ")}
          </p>
        )}

        <ReviewList productId={product.id} shopName={product.shop.name} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 py-3 sm:sticky">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex items-center gap-3 rounded-full border border-border px-2 py-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="w-4 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
          <Button
            onClick={handleAdd}
            disabled={unavailable || missingRequiredOption}
            className="flex-1"
            size="lg"
          >
            Add to cart — {formatMoney(unitPrice * quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}
