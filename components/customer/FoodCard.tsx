"use client";

import { Plus } from "lucide-react";
import { FoodThumb } from "./FoodThumb";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface FoodCardData {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  imageUrl?: string | null;
  status: string;
}

export function FoodCard({
  product,
  onSelect,
}: {
  product: FoodCardData;
  onSelect: (product: FoodCardData) => void;
}) {
  const unavailable = product.status !== "AVAILABLE";
  return (
    <button
      onClick={() => !unavailable && onSelect(product)}
      disabled={unavailable}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-transform active:scale-[0.99]",
        unavailable && "opacity-50"
      )}
    >
      <div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl">
        <FoodThumb src={product.imageUrl} label={product.name} rounded="rounded-xl" glyphClassName="text-2xl" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{product.name}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-1 flex items-center gap-2">
          {product.discountPrice ? (
            <>
              <span className="text-sm font-semibold text-primary">
                {formatMoney(product.discountPrice)}
              </span>
              <span className="text-xs text-muted-foreground line-through">
                {formatMoney(product.price)}
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-primary">{formatMoney(product.price)}</span>
          )}
        </div>
      </div>
      {unavailable ? (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Sold out
        </span>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Plus size={16} />
        </div>
      )}
    </button>
  );
}
