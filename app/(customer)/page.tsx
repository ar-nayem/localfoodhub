import Link from "next/link";
import { Truck, ShoppingBag, UtensilsCrossed, QrCode, Sparkles, Star, Tag, Utensils } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { SearchBar } from "@/components/customer/SearchBar";
import { ShopCard } from "@/components/customer/ShopCard";
import { FoodThumb } from "@/components/customer/FoodThumb";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

// The quick-access row. Every tile goes somewhere real — no placeholder collections.
const QUICK_TILES = [
  { href: "/explore", label: "Food", icon: Utensils, tint: "bg-[#FDF1DF] text-[#C9772A]" },
  { href: "/explore?mode=delivery", label: "Delivery", icon: Truck, tint: "bg-[#E4F1E6] text-primary" },
  { href: "/explore?mode=dine-in", label: "Dine-in", icon: UtensilsCrossed, tint: "bg-[#FCE9E4] text-[#C0562F]" },
  { href: "/explore?mode=pickup", label: "Takeaway", icon: ShoppingBag, tint: "bg-[#E7EEF9] text-[#3A6EA5]" },
  { href: "/explore?deals=1", label: "Offers", icon: Tag, tint: "bg-[#FBE4E8] text-[#C2415C]" },
];

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

      {/* Hero — desktop only. The mobile home screen goes straight from search to the
          quick-access row; the poster is not shown there. */}
      <section className="mb-5 hidden sm:block">
        <div className="relative overflow-hidden rounded-3xl bg-secondary px-5 py-6 text-secondary-foreground sm:px-8 sm:py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full opacity-30 blur-2xl"
            style={{ background: "radial-gradient(circle, #7BC47F, transparent 70%)" }}
          />
          <div className="relative max-w-[16rem] sm:max-w-md">
            <h2 className="text-[26px] font-bold leading-[1.15] sm:text-4xl">
              Good Food
              <br />
              Brings
              <br className="sm:hidden" /> People Together
            </h2>
            <p className="mt-2 text-sm text-secondary-foreground/80">
              Discover amazing local food around you.
            </p>
            <Link
              href="/explore"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-secondary"
            >
              Explore Now <span aria-hidden>→</span>
            </Link>
          </div>
          <span
            aria-hidden
            className="absolute -bottom-3 right-2 text-[5.5rem] leading-none opacity-90 sm:right-10 sm:text-[8rem]"
          >
            🍜
          </span>
        </div>
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

      {/* Explore / discovery */}
      <section className="mb-6">
        <Link
          href="/discover"
          className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 transition-transform active:scale-[0.99] sm:px-8 sm:py-6"
        >
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles size={14} /> Explore
            </p>
            <h2 className="mt-1 text-lg font-bold sm:text-2xl">Not sure what to eat?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Answer a few quick questions and let us surprise you.
            </p>
          </div>
          <span className="hidden shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:block">
            Explore Now →
          </span>
        </Link>
      </section>

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
            Dine-in, takeaway or delivery — scan a {brand.name} code to jump straight in.
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
