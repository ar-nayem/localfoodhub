"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { Button } from "@/components/ui/Button";

/**
 * Click-anywhere-to-place-a-marker location picker for a vendor's shop. Leaflet only runs
 * client-side (it touches `window`), so this whole component is dynamically imported with
 * `ssr: false` wherever it's used, and the actual Leaflet import happens inside an effect
 * rather than at module scope for the same reason.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Leaflet's default marker icon references image files by relative URL, which
      // breaks under bundlers unless pointed at real asset URLs explicitly.
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const start: [number, number] = [latitude ?? 23.73, longitude ?? 90.41];
      const map = L.map(containerRef.current).setView(start, latitude ? 16 : 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(start, { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current(pos.lat, pos.lng);
      });
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Only set up once — lat/lng updates after that move the marker via the effect below,
    // not by tearing the map down and rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync if latitude/longitude change from outside this component
  // (e.g. the numeric inputs next to the map, or the initial fetch resolving later).
  useEffect(() => {
    if (latitude == null || longitude == null || !markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng([latitude, longitude]);
  }, [latitude, longitude]);

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onChange(lat, lng);
        markerRef.current?.setLatLng([lat, lng]);
        mapRef.current?.setView([lat, lng], 16);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Click the map, or drag the pin, to set your exact shop location.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={locating}>
          <Crosshair size={14} className="mr-1" />
          {locating ? "Locating..." : "Use my location"}
        </Button>
      </div>
      <div ref={containerRef} className="mt-2 h-64 w-full overflow-hidden rounded-xl border border-border" />
    </div>
  );
}
