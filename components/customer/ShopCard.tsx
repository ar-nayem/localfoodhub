import Link from "next/link";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils";

export interface ShopCardData {
  slug: string;
  name: string;
  category: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  rating: number;
  ratingCount: number;
  prepTimeMinutes: number;
  deliveryFee: number;
  minOrder: number;
  status: string;
  supportsDelivery: boolean;
  supportsPickup: boolean;
  supportsDineIn: boolean;
}

export function ShopCard({ shop }: { shop: ShopCardData }) {
  const modes = [
    shop.supportsDelivery && "Delivery",
    shop.supportsPickup && "Pickup",
    shop.supportsDineIn && "Dine-in",
  ].filter(Boolean);

  return (
    <Link
      href={`/s/${shop.slug}`}
      className="block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-transform active:scale-[0.99]"
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {shop.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.coverUrl} alt={shop.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
        )}
        {shop.status !== "ACTIVE" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge tone="neutral" className="bg-white/90">
              Closed
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{shop.name}</p>
          <span className="flex shrink-0 items-center gap-0.5 text-sm font-medium">
            <Star size={14} className="fill-warning text-warning" />
            {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{shop.category}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={13} /> {shop.prepTimeMinutes}-{shop.prepTimeMinutes + 10} min
          </span>
          {shop.deliveryFee > 0 && <span>{formatMoney(shop.deliveryFee)} delivery</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {modes.map((m) => (
            <Badge key={m as string} tone="primary">
              {m}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
