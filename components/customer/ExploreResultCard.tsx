"use client";

import { Star, Clock, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils";
import { formatDistance } from "@/lib/location/distance";

export interface Recommendation {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    discountPrice: number | null;
    imageUrl: string | null;
    prepTimeMinutes: number;
  };
  shop: {
    id: string;
    slug: string;
    name: string;
    rating: number;
    distanceKm: number | null;
    supportsDelivery: boolean;
    supportsPickup: boolean;
    supportsDineIn: boolean;
  };
  whyPicked: string[];
}

export function ExploreResultCard({
  recommendation,
  people,
  onChoose,
  onPass,
  onChangePreferences,
}: {
  recommendation: Recommendation;
  people: number;
  onChoose: () => void;
  onPass: () => void;
  onChangePreferences: () => void;
}) {
  const { product, shop, whyPicked } = recommendation;
  const price = product.discountPrice ?? product.price;
  const modes = [shop.supportsDelivery && "Delivery", shop.supportsPickup && "Pickup", shop.supportsDineIn && "Dine-in"].filter(
    Boolean
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">We found something</span>
        <button onClick={onChangePreferences} className="flex items-center gap-1 text-sm text-muted-foreground">
          <X size={14} /> Preferences
        </button>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">🍽️</div>
        )}
      </div>

      <div className="mt-4 flex-1">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground">from {shop.name}</p>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <Star size={14} className="fill-warning text-warning" />
            {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock size={14} /> {product.prepTimeMinutes} min
          </span>
          {shop.distanceKm != null && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin size={14} /> {formatDistance(shop.distanceKm)}
            </span>
          )}
          <span className="font-semibold text-primary">
            {formatMoney(price)}
            {people > 1 && <span className="text-muted-foreground"> · ~{formatMoney(price * people)} total</span>}
          </span>
        </div>
        {product.discountPrice && (
          <p className="mt-1 text-sm text-muted-foreground line-through">{formatMoney(product.price)}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {modes.map((m) => (
            <Badge key={m as string} tone="neutral">
              {m}
            </Badge>
          ))}
        </div>

        {whyPicked.length > 0 && (
          <div className="mt-4 flex flex-col gap-1">
            {whyPicked.map((w) => (
              <p key={w} className="text-sm text-success">
                ✓ {w}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={onPass} variant="outline" size="lg" className="flex-1">
          Pass
        </Button>
        <Button onClick={onChoose} size="lg" className="flex-[2]">
          Choose This
        </Button>
      </div>
    </main>
  );
}
