import Link from "next/link";
import { Truck, ShoppingBag, UtensilsCrossed, QrCode, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { SearchBar } from "@/components/customer/SearchBar";
import { ShopCard } from "@/components/customer/ShopCard";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const MODE_CARDS = [
  { href: "/explore?mode=delivery", label: "Order Delivery", icon: Truck },
  { href: "/explore?mode=pickup", label: "Order Pickup", icon: ShoppingBag },
  { href: "/explore?mode=dine-in", label: "Eat Here", icon: UtensilsCrossed },
  { href: "/scan", label: "Scan QR", icon: QrCode },
];

export default async function HomePage() {
  const [shops, categories] = await Promise.all([
    prisma.shop.findMany({ where: { status: "ACTIVE" }, orderBy: { rating: "desc" }, take: 8 }),
    prisma.shop.groupBy({ by: ["category"], where: { status: "ACTIVE" }, _count: true }),
  ]);
  const featured = shops.slice(0, 4);
  const newShops = [...shops].reverse().slice(0, 4);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{brand.tagline}</h1>
        <p className="mt-1 text-muted-foreground">{brand.subheading}</p>
        <div className="mt-4">
          <SearchBar />
        </div>
      </section>

      <section className="mb-8">
        <Link
          href="/discover"
          className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-secondary px-6 py-5 text-secondary-foreground shadow-sm transition-transform active:scale-[0.99] sm:px-8 sm:py-6"
        >
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-secondary-foreground/70">
              <Sparkles size={14} /> Explore
            </p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">What should you eat today?</h2>
            <p className="mt-1 text-sm text-secondary-foreground/80">
              Can&apos;t decide? Answer a few quick questions and let us find something.
            </p>
          </div>
          <span className="hidden shrink-0 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold sm:block">
            Explore Now →
          </span>
        </Link>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MODE_CARDS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-sm transition-transform active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon size={20} />
            </div>
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </section>

      {categories.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Food categories</h2>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {categories.map((c) => (
              <Link
                key={c.category}
                href={`/explore?category=${encodeURIComponent(c.category)}`}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
                  {categoryIcon(c.category)}
                </span>
                <span className="line-clamp-2 text-xs font-medium leading-tight">{c.category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Featured local shops</h2>
          <Link href="/explore" className="text-sm font-medium text-primary">
            See all
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
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">New on the marketplace</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newShops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        </section>
      )}

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

// Presentation-only heuristic — a small icon per category keeps the rail visually
// scannable without needing vendor-uploaded category art everywhere.
function categoryIcon(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("bangladeshi") || c.includes("local")) return "🍛";
  if (c.includes("chinese") || c.includes("noodle")) return "🍜";
  if (c.includes("café") || c.includes("cafe") || c.includes("coffee")) return "☕";
  if (c.includes("burger") || c.includes("fast food")) return "🍔";
  if (c.includes("pizza")) return "🍕";
  if (c.includes("dessert") || c.includes("bakery")) return "🍰";
  if (c.includes("drink") || c.includes("juice")) return "🥤";
  if (c.includes("chicken")) return "🍗";
  if (c.includes("seafood")) return "🦐";
  if (c.includes("healthy") || c.includes("vegetarian") || c.includes("vegan")) return "🥗";
  return "🍽️";
}
