"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Map as MapIcon, List as ListIcon, MapPinOff } from "lucide-react";
import { SearchBar } from "@/components/customer/SearchBar";
import { ShopCard, type ShopCardData } from "@/components/customer/ShopCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { isOrderTypeActive } from "@/lib/constants";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { formatDistance, SERVICE_AREA_RADIUS_KM } from "@/lib/location/distance";
import type { MapShop } from "@/components/customer/ExploreMap";

// Leaflet touches `window` at import time — client-only.
const ExploreMap = dynamic(() => import("@/components/customer/ExploreMap").then((m) => m.ExploreMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

const MODE_FILTERS = [
  { value: "", label: "All" },
  { value: "delivery", label: "Delivery", mode: "DELIVERY" },
  { value: "pickup", label: "Pickup" },
  { value: "dine-in", label: "Dine-in" },
].filter((f) => isOrderTypeActive((f as { mode?: string }).mode ?? ""));

type ShopWithDistance = ShopCardData & { latitude: number | null; longitude: number | null; distanceKm: number | null };

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

  const { coords } = useGeolocation();
  const [shops, setShops] = useState<ShopWithDistance[] | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (mode) search.set("mode", mode);
    if (category) search.set("category", category);
    // Every result still carries a distance once we have a fix — the map isn't the only
    // consumer of it, the plain list shows it too.
    if (coords) {
      search.set("lat", String(coords.lat));
      search.set("lng", String(coords.lng));
    }
    // `coords` starts null and flips to a real fix moments later, firing this effect twice
    // in quick succession. Without this guard the *first* (no-coords) response can land
    // after the second (with-coords) one and clobber good distance data with nulls.
    let ignore = false;
    setShops(null);
    fetch(`/api/shops?${search.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore) setShops(data);
      });
    return () => {
      ignore = true;
    };
  }, [q, mode, category, coords]);

  function setMode(next: string) {
    const search = new URLSearchParams(params.toString());
    if (next) search.set("mode", next);
    else search.delete("mode");
    router.push(`/explore?${search.toString()}`);
  }

  const mapShops = useMemo<MapShop[]>(
    () =>
      (shops ?? []).map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        category: s.category,
        rating: s.rating,
        ratingCount: s.ratingCount,
        status: s.status,
        latitude: s.latitude,
        longitude: s.longitude,
        distanceKm: s.distanceKm,
        minOrder: s.minOrder,
      })),
    [shops]
  );

  // Nearest real shop, straight-line. Only meaningful once we actually have a GPS fix —
  // no fix means no honest claim about how far anything is.
  const nearestKm = useMemo(() => {
    if (!coords || !shops) return null;
    const known = shops.map((s) => s.distanceKm).filter((d): d is number => d != null);
    return known.length ? Math.min(...known) : null;
  }, [coords, shops]);
  const outsideServiceArea = nearestKm != null && nearestKm > SERVICE_AREA_RADIUS_KM;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Discover food around you</h1>
        <div className="flex shrink-0 rounded-full border border-border p-0.5">
          <button
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <ListIcon size={14} /> List
          </button>
          <button
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            <MapIcon size={14} /> Map
          </button>
        </div>
      </div>

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

      {outsideServiceArea && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <MapPinOff size={18} className="mt-0.5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-semibold">You&apos;re outside our current service area</p>
            <p className="text-muted-foreground">
              Our nearest shop is {formatDistance(nearestKm!)} away, so delivery won&apos;t reach you here — browse
              below anyway, or come back when you&apos;re closer.
            </p>
          </div>
        </div>
      )}

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
      ) : view === "list" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <div key={shop.slug} className="relative">
              <ShopCard shop={shop} />
              {shop.distanceKm != null && !outsideServiceArea && (
                <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                  {formatDistance(shop.distanceKm)}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Map view — mobile stacks list under the map; desktop splits list/map side by
        // side. The map is never the only way to a shop: every marker's shop is also a
        // row in this same list, one scroll away.
        <div className="flex flex-col gap-4 lg:h-[70vh] lg:flex-row">
          <div className="h-72 shrink-0 overflow-hidden rounded-2xl border border-border lg:order-2 lg:h-full lg:flex-1">
            <ExploreMap shops={mapShops} userCoords={coords} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto lg:order-1 lg:w-80 lg:shrink-0">
            {shops.map((shop) => (
              <button
                key={shop.slug}
                onClick={() => setSelectedId(shop.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  selectedId === shop.id ? "border-primary bg-primary/5" : "border-border bg-surface"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{shop.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{shop.category}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{shop.rating > 0 ? `★ ${shop.rating.toFixed(1)}` : "New"}</span>
                    {shop.distanceKm != null && !outsideServiceArea && <span>{formatDistance(shop.distanceKm)}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
