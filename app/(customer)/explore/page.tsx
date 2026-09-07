"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SearchBar } from "@/components/customer/SearchBar";
import { ShopCard, type ShopCardData } from "@/components/customer/ShopCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { isOrderTypeActive } from "@/lib/constants";

const MODE_FILTERS = [
  { value: "", label: "All" },
  { value: "delivery", label: "Delivery", mode: "DELIVERY" },
  { value: "pickup", label: "Pickup" },
  { value: "dine-in", label: "Dine-in" },
].filter((f) => isOrderTypeActive((f as { mode?: string }).mode ?? ""));

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") || "";
  const mode = params.get("mode") || "";
  const category = params.get("category") || "";

  const [shops, setShops] = useState<ShopCardData[] | null>(null);

  useEffect(() => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (mode) search.set("mode", mode);
    if (category) search.set("category", category);
    setShops(null);
    fetch(`/api/shops?${search.toString()}`)
      .then((r) => r.json())
      .then(setShops);
  }, [q, mode, category]);

  function setMode(next: string) {
    const search = new URLSearchParams(params.toString());
    if (next) search.set("mode", next);
    else search.delete("mode");
    router.push(`/explore?${search.toString()}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <h1 className="mb-4 text-xl font-bold">Discover food around you</h1>
      <SearchBar initialValue={q} />

      <div className="my-4 flex gap-2 overflow-x-auto pb-1">
        {MODE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setMode(f.value)}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium",
              mode === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
        {category && (
          <span className="whitespace-nowrap rounded-full border border-border bg-muted px-4 py-1.5 text-sm">
            {category}
          </span>
        )}
      </div>

      {!shops ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No food shops match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <ShopCard key={shop.slug} shop={shop} />
          ))}
        </div>
      )}
    </main>
  );
}
