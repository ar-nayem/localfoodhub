import Link from "next/link";
import { Star, MapPin, Clock, QrCode } from "lucide-react";

export function ShopHeader({
  shop,
  dineInTable,
  openingHours,
}: {
  shop: {
    slug: string;
    name: string;
    category: string;
    description: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    rating: number;
    ratingCount: number;
    address: string;
    supportsDelivery: boolean;
    supportsPickup: boolean;
    supportsDineIn: boolean;
  };
  dineInTable: { id: string; label: string; area: string } | null;
  openingHours: { day: string; open: string; close: string }[];
}) {
  return (
    <div>
      <div className="relative aspect-[16/7] w-full bg-muted sm:rounded-b-2xl">
        {shop.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.coverUrl} alt={shop.name} className="h-full w-full object-cover sm:rounded-b-2xl" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">🍽️</div>
        )}
      </div>

      <div className="px-4 pt-4 sm:px-6">
        {dineInTable && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-primary/10 px-3.5 py-2.5 text-sm font-medium text-primary">
            <QrCode size={16} />
            You&apos;re ordering from {shop.name} — Table {dineInTable.label}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{shop.name}</h1>
            <p className="text-sm text-muted-foreground">{shop.category}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm font-medium">
            <Star size={14} className="fill-warning text-warning" />
            {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
            {shop.ratingCount > 0 && (
              <span className="text-muted-foreground">({shop.ratingCount})</span>
            )}
          </span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{shop.description}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {shop.address}
          </span>
          {openingHours[0] && (
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {openingHours[0].open}–{openingHours[0].close}
            </span>
          )}
        </div>

        <Link
          href="/scan"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <QrCode size={15} /> Scan QR
        </Link>
      </div>
    </div>
  );
}
