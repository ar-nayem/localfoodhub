import Link from "next/link";
import { Percent, MapPin, Clock } from "lucide-react";
import { FoodThumb } from "./FoodThumb";
import { formatMoney, safeJsonParse } from "@/lib/utils";
import type { SectionConfig } from "@/lib/storefront/theme";

interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  imageUrl: string | null;
}

interface PromoRow {
  title: string;
  type: string;
  value: number;
  code: string | null;
  imageUrl: string | null;
}

/** Renders the vendor's chosen optional sections (spec Section 112), in their configured
 * order, above the always-present menu — the menu itself isn't one of these, it's not
 * vendor-hideable (spec Section 139: the core ordering flow stays marketplace-owned). */
export function StorefrontSections({
  sectionsConfigJson,
  shopSlug,
  description,
  featuredProducts,
  activePromotions,
  openingHours,
  address,
}: {
  sectionsConfigJson: string;
  shopSlug: string;
  description: string;
  featuredProducts: FeaturedProduct[];
  activePromotions: PromoRow[];
  openingHours: { day: string; open: string; close: string }[];
  address: string;
}) {
  const config = safeJsonParse<SectionConfig[]>(sectionsConfigJson, []);
  const visible = config.filter((s) => s.visible).sort((a, b) => a.order - b.order);

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 px-4 pt-2 sm:px-6">
      {visible.map((section) => {
        if (section.key === "todaysSpecial" && activePromotions.length > 0) {
          return (
            <section key={section.key}>
              <h2 className="mb-2 text-sm font-semibold">Today&apos;s Special</h2>
              <div className="flex flex-col gap-2">
                {activePromotions.map((p) => (
                  <div
                    key={p.title}
                    className="flex items-center gap-3 overflow-hidden rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <Percent size={15} className="shrink-0 text-primary" />
                    )}
                    <span className="font-medium">{p.title}</span>
                    <span className="text-muted-foreground">
                      {p.type === "PERCENT" ? `${p.value}% off` : `${formatMoney(p.value)} off`}
                      {p.code && ` · code ${p.code}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        }
        if (section.key === "featured" && featuredProducts.length > 0) {
          return (
            <section key={section.key}>
              <h2 className="mb-2 text-sm font-semibold">Featured</h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {featuredProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/s/${shopSlug}/product/${p.id}`}
                    className="w-32 shrink-0 rounded-xl border border-border bg-surface p-2"
                  >
                    <div className="mb-1.5 h-20 w-full overflow-hidden rounded-lg">
                      <FoodThumb src={p.imageUrl} label={p.name} rounded="rounded-lg" glyphClassName="text-2xl" />
                    </div>
                    <p className="truncate text-xs font-medium">{p.name}</p>
                    <p className="text-xs font-semibold text-primary">{formatMoney(p.discountPrice ?? p.price)}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        }
        if (section.key === "about" && description) {
          return (
            <section key={section.key}>
              <h2 className="mb-2 text-sm font-semibold">About</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin size={14} /> {address}
              </p>
            </section>
          );
        }
        if (section.key === "hours" && openingHours.length > 0) {
          return (
            <section key={section.key}>
              <h2 className="mb-2 text-sm font-semibold">Opening Hours</h2>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                {openingHours.map((h) => (
                  <span key={h.day} className="flex items-center gap-1.5">
                    <Clock size={13} /> {h.day}: {h.open}–{h.close}
                  </span>
                ))}
              </div>
            </section>
          );
        }
        return null;
      })}
    </div>
  );
}
