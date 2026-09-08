import Link from "next/link";
import Image from "next/image";
import { Truck, ShoppingBag, UtensilsCrossed, QrCode, Star, Tag, Utensils } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { SearchBar } from "@/components/customer/SearchBar";
import { ShopCard } from "@/components/customer/ShopCard";
import { FoodThumb } from "@/components/customer/FoodThumb";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";
import { isOrderTypeActive } from "@/lib/constants";

export const dynamic = "force-dynamic";

// The quick-access row. Every tile goes somewhere real — no placeholder collections.
const QUICK_TILES = [
  { href: "/explore", label: "Food", icon: Utensils, tint: "bg-[#FDF1DF] text-[#C9772A]" },
  // Delivery tile is gated on FEATURES.delivery — hidden for this launch.
  { href: "/explore?mode=delivery", label: "Delivery", icon: Truck, tint: "bg-[#E4F1E6] text-primary", mode: "DELIVERY" },
  { href: "/explore?mode=dine-in", label: "Dine-in", icon: UtensilsCrossed, tint: "bg-[#FCE9E4] text-[#C0562F]" },
  { href: "/explore?mode=pickup", label: "Takeaway", icon: ShoppingBag, tint: "bg-[#E7EEF9] text-[#3A6EA5]" },
  { href: "/explore?deals=1", label: "Offers", icon: Tag, tint: "bg-[#FBE4E8] text-[#C2415C]" },
].filter((t) => isOrderTypeActive(t.mode ?? ""));

export default async function HomePage() {
  const [shops, categories, picks] = await Promise.all([
    prisma.shop.findMany({ where: { status: "ACTIVE" }, orderBy: { rating: "desc" }, take: 8 }),
    prisma.shop.groupBy({ by: ["category"], where: { status: "ACTIVE" }, _count: true }),
    prisma.product.findMany({
      where: { status: "AVAILABLE", shop: { status: "ACTIVE" } },
      include: { shop: { select: { name: true, slug: true, rating: true, ratingCount: true } } },
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
      take: 8,
    }),
  ]);
  const featured = shops.slice(0, 4);
  const newShops = [...shops].reverse().slice(0, 4);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-1 sm:px-6 sm:pt-6">
      {/* Desktop keeps its own heading; mobile leads straight into search per the app's
          mobile header already showing location + alerts. */}
      <section className="mb-4">
        <h1 className="hidden text-2xl font-bold tracking-tight sm:block sm:text-3xl">{brand.tagline}</h1>
        <p className="hidden text-muted-foreground sm:mt-1 sm:block">{brand.subheading}</p>
        <div className="sm:mt-4">
          <SearchBar />
        </div>
      </section>

      {/* Explore / discovery — moved to the top, right under search, ahead of the
          quick-access row and Today's Picks. The whole banner is one link into the
          existing /discover flow. The artwork carries its own copy and its own
          "Explore Now" button, so there is deliberately no second interactive element
          inside: tapping the headline, the food photo, the button or any empty space
          all do the same thing.

          The source PNG has ~23% white margin above and below the artwork; the fixed
          aspect ratio plus object-cover trims that off in CSS so the file itself stays
          exactly as supplied. */}
      <section className="mb-6">
        <Link
          href="/discover"
          aria-label="Explore food recommendations"
          className="group relative block aspect-[2.7/1] w-full overflow-hidden rounded-2xl transition-transform active:scale-[0.99]"
        >
          <Image
            src="/explore-banner.png"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1152px"
            className="object-cover object-center transition-opacity group-hover:opacity-95"
          />
        </Link>
      </section>

      {/* Quick access */}
      <section className="mb-6">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {QUICK_TILES.map(({ href, label, icon: Icon, tint }) => (
            <Link key={label} href={href} className="flex flex-col items-center gap-1.5 text-center">
              <span className={`flex h-14 w-full max-w-[3.75rem] items-center justify-center rounded-2xl ${tint}`}>
                <Icon size={22} />
              </span>
              <span className="text-[11px] font-medium leading-tight sm:text-xs">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Today's picks */}
      {picks.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-bold sm:text-lg">Today&apos;s Picks for You</h2>
            <Link href="/explore" className="text-sm font-medium text-primary">
              See All
            </Link>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
            {picks.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                href={`/s/${p.shop.slug}/product/${p.id}`}
                className="w-[9.5rem] shrink-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm sm:w-auto"
              >
                <div className="aspect-[4/3] w-full">
                  <FoodThumb src={p.imageUrl} label={p.name} rounded="rounded-none" glyphClassName="text-4xl" />
                </div>
                <div className="p-2.5">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.shop.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium">
                    <Star size={12} className="fill-warning text-warning" />
                    {p.shop.rating > 0 ? p.shop.rating.toFixed(1) : "New"}
                    {p.shop.ratingCount > 0 && (
                      <span className="text-muted-foreground">({p.shop.ratingCount})</span>
                    )}
                    <span className="ml-auto font-semibold text-foreground">
                      {formatMoney(p.discountPrice ?? p.price)}
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-bold sm:text-lg">Food categories</h2>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {categories.map((c) => (
              <Link
                key={c.category}
                href={`/explore?category=${encodeURIComponent(c.category)}`}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <span className="h-14 w-14 overflow-hidden rounded-full">
                  <FoodThumb label={c.category} rounded="rounded-full" glyphClassName="text-2xl" />
                </span>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight">{c.category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-bold sm:text-lg">Popular Near You</h2>
          <Link href="/explore" className="text-sm font-medium text-primary">
            See All
          </Link>
        </div>
        {featured.length === 0 ? (
          <EmptyShops />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </section>

      {newShops.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-bold sm:text-lg">New on the marketplace</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newShops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        </section>
      )}

      {/* QR promo — the platform's signature entry point. */}
      <section className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <QrCode size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">Scan to Order</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Dine-in or takeaway — scan a {brand.name} code to jump straight in.
          </p>
        </div>
        <Link
          href="/scan"
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Scan
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-secondary p-6 text-secondary-foreground sm:p-8">
        <h2 className="text-xl font-bold">Own a local food business?</h2>
        <p className="mt-1 max-w-md text-sm text-secondary-foreground/80">
          Get discovered, manage dine-in tables with QR ordering, and track sales — all in
          one dashboard.
        </p>
        <Link href="/apply">
          <Button variant="outline" className="mt-4 border-white/30 bg-transparent text-white hover:bg-white/10">
            Join the marketplace
          </Button>
        </Link>
      </section>
    </main>
  );
}

function EmptyShops() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
      No shops here yet. Check back soon.
    </div>
  );
}
