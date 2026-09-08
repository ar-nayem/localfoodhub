"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star, Navigation } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistance } from "@/lib/location/distance";
import { formatMoney } from "@/lib/utils";

export interface MapShop {
  id: string;
  slug: string;
  name: string;
  category: string;
  rating: number;
  ratingCount: number;
  status: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  minOrder: number;
}

/**
 * The Explore map. Leaflet + OpenStreetMap tiles — no API key, no billing, works the
 * moment the page loads. Only client-side (Leaflet touches `window`), so every caller
 * dynamic-imports this with `ssr: false`.
 *
 * Every marker here is also reachable through the plain shop list next to/below the map
 * (spec's own "map accessibility" rule) — this component never becomes the *only* way to
 * reach a shop, just an additional one.
 */
export function ExploreMap({
  shops,
  userCoords,
  selectedId,
  onSelect,
}: {
  shops: MapShop[];
  userCoords: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // One-time map setup.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = userCoords ? [userCoords.lat, userCoords.lng] : [23.73, 90.41];
      const map = L.map(containerRef.current).setView(center, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "You are here" marker, kept separate from shop markers so re-rendering the shop list
  // never has to touch it.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      if (userMarkerRef.current) userMarkerRef.current.remove();
      if (!userCoords) return;
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#20693F;border:3px solid white;box-shadow:0 0 0 2px rgba(32,105,63,0.3)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindTooltip("You are here", { direction: "top" });
    });
  }, [ready, userCoords]);

  // Shop markers — rebuilt whenever the (already-filtered) shop list changes.
  useEffect(() => {
    if (!ready || !mapRef.current || !layerRef.current) return;
    import("leaflet").then((L) => {
      layerRef.current?.clearLayers();
      markersRef.current.clear();
      const withCoords = shops.filter((s) => s.latitude != null && s.longitude != null);
      for (const shop of withCoords) {
        const marker = L.marker([shop.latitude!, shop.longitude!]).on("click", () => onSelectRef.current(shop.id));
        marker.addTo(layerRef.current!);
        markersRef.current.set(shop.id, marker);
      }
      if (withCoords.length > 0 && !userCoords) {
        const bounds = L.latLngBounds(withCoords.map((s) => [s.latitude!, s.longitude!] as [number, number]));
        mapRef.current!.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });
  }, [ready, shops, userCoords]);

  // Pan to whichever shop is selected from the list (clicking a list row, not just a marker).
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) mapRef.current.panTo(marker.getLatLng());
  }, [selectedId]);

  const selected = shops.find((s) => s.id === selectedId) ?? null;

  function recenter() {
    if (userCoords && mapRef.current) mapRef.current.setView([userCoords.lat, userCoords.lng], 14);
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {userCoords && (
        <button
          onClick={recenter}
          aria-label="Recenter on my location"
          className="absolute right-3 top-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-full bg-surface text-primary shadow-md"
        >
          <Navigation size={16} />
        </button>
      )}

      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-[1000]">
          <Link
            href={`/s/${selected.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-lg"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{selected.name}</p>
              <p className="truncate text-xs text-muted-foreground">{selected.category}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-0.5 font-medium">
                  <Star size={12} className="fill-warning text-warning" />
                  {selected.rating > 0 ? selected.rating.toFixed(1) : "New"}
                </span>
                {selected.distanceKm != null && (
                  <span className="text-muted-foreground">{formatDistance(selected.distanceKm)} away</span>
                )}
                {selected.minOrder > 0 && (
                  <span className="text-muted-foreground">Min {formatMoney(selected.minOrder)}</span>
                )}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              View Shop
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
