import { Star, QrCode, Truck, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { FoodThumb } from "./FoodThumb";
import { FavoriteHeart } from "./FavoriteHeart";
import { BackButton } from "./BackButton";
import { cn } from "@/lib/utils";
import { isOrderTypeActive } from "@/lib/constants";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Real open/closed state from the shop's own opening hours — returns null when the shop
 * hasn't set any, so the UI omits the line instead of guessing. */
function openState(hours: { day: string; open: string; close: string }[]) {
  if (hours.length === 0) return null;
  const now = new Date();
  const today = hours.find((h) => h.day.toLowerCase() === DAYS[now.getDay()].toLowerCase()) ?? hours[0];
  if (!today) return null;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  const isOpen = close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;
  return { isOpen, close: today.close, open: today.open };
}

function label12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = (h ?? 0) >= 12 ? "PM" : "AM";
  const hour = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

export function ShopHeader({
  shop,
  dineInTable,
  openingHours,
  bannerText,
  bannerCta,
}: {
  shop: {
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    rating: number;
    ratingCount: number;
    address: string;
    prepTimeMinutes: number;
    supportsDelivery: boolean;
    supportsPickup: boolean;
    supportsDineIn: boolean;
  };
  dineInTable: { id: string; label: string; area: string } | null;
  openingHours: { day: string; open: string; close: string }[];
  bannerText?: string | null;
  bannerCta?: string | null;
}) {
  const hours = openState(openingHours);
  const prep = shop.prepTimeMinutes;

  const modes = [
    shop.supportsDelivery && isOrderTypeActive("DELIVERY") && {
      icon: Truck,
      label: "Delivery",
      detail: `${prep + 10}-${prep + 20} min`,
    },
    shop.supportsPickup && {
      icon: ShoppingBag,
      label: "Takeaway",
      detail: `${prep}-${prep + 10} min`,
    },
    shop.supportsDineIn && {
      icon: UtensilsCrossed,
      label: "Dine-in",
      detail: dineInTable ? `Table ${dineInTable.label}` : "Scan at table",
    },
  ].filter(Boolean) as { icon: typeof Truck; label: string; detail: string }[];

  return (
    <div>
      <div className="relative aspect-[16/9] w-full sm:aspect-[16/6] sm:rounded-b-3xl sm:overflow-hidden">
        <FoodThumb
          src={shop.coverUrl}
          label={shop.category}
          rounded="rounded-none"
          glyphClassName="text-6xl"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <BackButton />
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur">
              <FavoriteHeart shopId={shop.id} />
            </span>
          </div>
        </div>

        {/* Sits clear of the identity card that overlaps the bottom of this cover. */}
        {bannerText && (
          <div className="absolute inset-x-0 bottom-12 px-4">
            <p className="text-sm font-bold text-white drop-shadow sm:text-base">{bannerText}</p>
            {bannerCta && (
              <span className="mt-1 inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                {bannerCta}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative px-4 sm:px-6">
        {/* Shop identity card, lifted over the cover like the reference layout. */}
        <div className="-mt-8 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border">
              <FoodThumb
                src={shop.logoUrl}
                label={shop.category}
                rounded="rounded-2xl"
                glyphClassName="text-2xl"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold leading-tight">{shop.name}</h1>
              <p className="truncate text-sm text-muted-foreground">{shop.category}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="flex items-center gap-1 font-medium">
                  <Star size={14} className="fill-warning text-warning" />
                  {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
                  {shop.ratingCount > 0 && (
                    <span className="text-muted-foreground">({shop.ratingCount})</span>
                  )}
                </span>
                {hours && (
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      hours.isOpen ? "text-success" : "text-error"
                    )}
                  >
                    {hours.isOpen ? `Open · Closes ${label12h(hours.close)}` : `Closed · Opens ${label12h(hours.open)}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {modes.length > 0 && (
            <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
              {modes.map(({ icon: Icon, label, detail }) => (
                <div key={label} className="flex flex-col items-center gap-1 px-1 text-center">
                  <Icon size={17} className="text-primary" />
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                  <span className="text-[11px] leading-tight text-muted-foreground">{detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {dineInTable && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/10 px-3.5 py-2.5 text-sm font-medium text-primary">
            <QrCode size={16} />
            You&apos;re ordering at Table {dineInTable.label} · {dineInTable.area}
          </div>
        )}
      </div>
    </div>
  );
}
