"use client";

import { useEffect, useRef, useState } from "react";
import { X, Navigation, Loader2 } from "lucide-react";
import { loadGoogleMaps } from "@/lib/maps/loadGoogleMaps";
import { reverseGeocode } from "@/lib/maps/geocode";
import { PlaceAutocompleteInput } from "./PlaceAutocompleteInput";
import type { PlaceResult } from "@/lib/maps/types";
import { latLngOf } from "@/lib/maps/latLng";

/**
 * Map + draggable pin + Places search + "use my location", all in one modal — the same
 * picker reused for the customer's location, a vendor's shop location, and a saved
 * location's address. Uses `AdvancedMarkerElement` (the current, actively-maintained
 * marker API) rather than the legacy `Marker`, which Google stopped adding features to in
 * 2024 — that needs a `mapId`; `"DEMO_MAP_ID"` is Google's own no-setup placeholder for
 * exactly this (a real Map ID from Cloud Console only matters for custom map styling,
 * which this app doesn't need).
 */
export function GoogleLocationPickerModal({
  initial,
  title = "Choose a location",
  onConfirm,
  onClose,
}: {
  initial?: { lat: number; lng: number } | null;
  title?: string;
  onConfirm: (place: PlaceResult) => void;
  onClose: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [locating, setLocating] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapContainerRef.current) return;
        const center = initial ?? { lat: 23.7808, lng: 90.4067 };
        const map = new g.maps.Map(mapContainerRef.current, {
          center,
          zoom: initial ? 16 : 12,
          disableDefaultUI: true,
          zoomControl: true,
          mapId: "DEMO_MAP_ID",
        });
        const marker = new g.maps.marker.AdvancedMarkerElement({ map, position: center, gmpDraggable: true });
        marker.addListener("dragend", async () => {
          const pos = latLngOf(marker.position);
          if (!pos) return;
          const place = await reverseGeocode(pos.lat, pos.lng);
          if (place) setSelected(place);
        });
        mapRef.current = map;
        markerRef.current = marker;
        if (initial) reverseGeocode(initial.lat, initial.lng).then((p) => p && setSelected(p));
      })
      .catch(() => setLoadError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moveTo(place: PlaceResult) {
    setSelected(place);
    mapRef.current?.setCenter({ lat: place.lat, lng: place.lng });
    mapRef.current?.setZoom(16);
    if (markerRef.current) markerRef.current.position = { lat: place.lat, lng: place.lng };
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (place) moveTo(place);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {loadError ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Couldn&apos;t load the map right now. Please try again in a moment.
          </p>
        ) : (
          <>
            <div className="p-4 pb-2">
              <PlaceAutocompleteInput
                onSelect={moveTo}
                placeholder="Search for a place..."
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={useCurrentLocation}
                disabled={locating}
                className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-50"
              >
                {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                Use my current location
              </button>
            </div>
            <div ref={mapContainerRef} className="h-64 w-full shrink-0" />
            <div className="border-t border-border p-4">
              <p className="mb-3 truncate text-sm text-muted-foreground">
                {selected?.formattedAddress ?? "Drag the pin or search to choose a spot"}
              </p>
              <button
                onClick={() => selected && onConfirm(selected)}
                disabled={!selected}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Confirm Location
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
