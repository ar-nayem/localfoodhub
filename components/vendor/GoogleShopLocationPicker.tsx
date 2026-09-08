"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { loadGoogleMaps } from "@/lib/maps/loadGoogleMaps";
import { reverseGeocode } from "@/lib/maps/geocode";
import { latLngOf } from "@/lib/maps/latLng";
import { PlaceAutocompleteInput } from "@/components/shared/PlaceAutocompleteInput";
import type { PlaceResult } from "@/lib/maps/types";

/**
 * Google-backed replacement for components/vendor/LocationPicker.tsx (Leaflet), used when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set — same {latitude, longitude, onChange} contract
 * plus an optional onPlaceResolved for auto-filling the address field and storing the
 * Google Place ID (spec Section 19-21). app/vendor/settings/page.tsx picks whichever of
 * the two to render; the Leaflet version keeps working unchanged when no key is set.
 */
export function GoogleShopLocationPicker({
  latitude,
  longitude,
  onChange,
  onPlaceResolved,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  onPlaceResolved?: (place: PlaceResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onPlaceResolvedRef = useRef(onPlaceResolved);
  onPlaceResolvedRef.current = onPlaceResolved;
  const [locating, setLocating] = useState(false);

  async function commit(lat: number, lng: number) {
    onChangeRef.current(lat, lng);
    const place = await reverseGeocode(lat, lng);
    if (place) onPlaceResolvedRef.current?.(place);
  }

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const start = { lat: latitude ?? 23.73, lng: longitude ?? 90.41 };
      const map = new g.maps.Map(containerRef.current, {
        center: start,
        zoom: latitude ? 16 : 13,
        disableDefaultUI: true,
        zoomControl: true,
        mapId: "DEMO_MAP_ID",
      });
      const marker = new g.maps.marker.AdvancedMarkerElement({ map, position: start, gmpDraggable: true });
      marker.addListener("dragend", () => {
        const pos = latLngOf(marker.position);
        if (pos) commit(pos.lat, pos.lng);
      });
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.position = e.latLng;
        commit(e.latLng.lat(), e.latLng.lng());
      });
      mapRef.current = map;
      markerRef.current = marker;
    });
    return () => {
      cancelled = true;
    };
    // Set up once — external lat/lng changes are synced via the effect below, not by
    // rebuilding the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (latitude == null || longitude == null || !markerRef.current) return;
    markerRef.current.position = { lat: latitude, lng: longitude };
  }, [latitude, longitude]);

  function moveTo(place: PlaceResult) {
    onChange(place.lat, place.lng);
    onPlaceResolved?.(place);
    mapRef.current?.setCenter({ lat: place.lat, lng: place.lng });
    mapRef.current?.setZoom(16);
    if (markerRef.current) markerRef.current.position = { lat: place.lat, lng: place.lng };
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        await commit(lat, lng);
        mapRef.current?.setCenter({ lat, lng });
        mapRef.current?.setZoom(16);
        if (markerRef.current) markerRef.current.position = { lat, lng };
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Search, click the map, or drag the pin to set your exact shop location.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={locating}>
          <Crosshair size={14} className="mr-1" />
          {locating ? "Locating..." : "Use my location"}
        </Button>
      </div>
      <div className="relative mt-2">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <PlaceAutocompleteInput
          placeholder="Search your shop's address..."
          onSelect={moveTo}
          className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div ref={containerRef} className="mt-2 h-64 w-full overflow-hidden rounded-xl border border-border" />
    </div>
  );
}
