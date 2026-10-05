import Link from "next/link";
import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { FavoriteHeart } from "./FavoriteHeart";
import { formatMoney } from "@/lib/utils";
import { foodImageSource } from "@/lib/customer/foodArtwork";
import { isOrderTypeActive } from "@/lib/constants";

export interface ShopCardData {
  id: string;
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

export function ShopCard({ shop, preferCuratedArtwork = false }: { shop: ShopCardData; preferCuratedArtwork?: boolean }) {
  const cover = foodImageSource(shop.coverUrl, shop.category);
  const modes = [
    shop.supportsDelivery && isOrderTypeActive("DELIVERY") && "Delivery",
    shop.supportsPickup && "Pickup",
    shop.supportsDineIn && "Dine-in",
  ].filter(Boolean);

  return (
    <Link
      href={`/s/${shop.slug}`}
      className="block overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {cover && !preferCuratedArtwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={shop.name} className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/food-artwork/bangladeshi-restaurant.png" alt={shop.name} className="h-full w-full object-cover" />
        )}
        {(!shop.coverUrl || cover !== shop.coverUrl || preferCuratedArtwork) && (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-1 text-[9px] font-medium text-white">Illustrative image</span>
        )}
        {shop.status !== "ACTIVE" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge tone="neutral" className="bg-white/90">
              Closed
            </Badge>
          </div>
        )}
        <div className="absolute right-2 top-2">
          <FavoriteHeart shopId={shop.id} />
        </div>
      </div>
      <div className="p-3 sm:p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {shop.logoUrl && (
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shop.logoUrl} alt="" className="h-full w-full object-cover" />
              </span>
            )}
            <p className="line-clamp-2 text-sm font-semibold text-foreground sm:text-base">{shop.name}</p>
          </div>
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium">
            <Star size={14} className="fill-warning text-warning" />
            {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{shop.category}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={13} /> {shop.prepTimeMinutes}-{shop.prepTimeMinutes + 10} min
          </span>
          {isOrderTypeActive("DELIVERY") && shop.supportsDelivery && shop.deliveryFee > 0 && <span>{formatMoney(shop.deliveryFee)} delivery</span>}
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
