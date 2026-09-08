"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ChevronDown, X, Navigation, Search } from "lucide-react";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { SERVICE_AREA_RADIUS_KM } from "@/lib/location/distance";
import { isGoogleMapsConfigured } from "@/lib/maps/loadGoogleMaps";
import { reverseGeocode } from "@/lib/maps/geocode";
import { PlaceAutocompleteInput } from "@/components/shared/PlaceAutocompleteInput";
import type { PlaceResult } from "@/lib/maps/types";

interface LocationRow {
  id: string;
  name: string;
  slug: string;
}

/**
 * Real location detection. With Google Maps configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * set), a GPS fix is reverse-geocoded to an actual place name — never a guess. Without a
 * key, this falls back to the previous honest-but-limited behavior: finding the nearest
 * shop-with-coordinates and using *its* food-court name, since there's no other way to
 * turn raw coordinates into words. Either way, this pill must never show a specific place
 * name the customer didn't actually arrive at (via GPS) or choose (via search/picker) —
 * that was the original bug: a demo food-court name reading as if it were detected.
 */
export function LocationPill() {
  const { coords, status, refresh, setManual } = useGeolocation();
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationRow[] | null>(null);
  const [picking, setPicking] = useState(false);
  // True once a real fix came back with nothing inside SERVICE_AREA_RADIUS_KM — only
  // meaningful in the no-Google fallback path (see resolveLabel below); with real
  // reverse geocoding every fix resolves to *some* honest place name regardless of
  // whether any shop is nearby, so this stops applying once Google is configured.
  const [outOfRange, setOutOfRange] = useState(false);

  const googleReady = isGoogleMapsConfigured();

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((rows: LocationRow[]) => setLocations(rows))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;

    if (googleReady) {
      reverseGeocode(coords.lat, coords.lng)
        .then((place) => {
          if (!cancelled && place) setResolvedName(place.name);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }

    const params = new URLSearchParams({
      lat: String(coords.lat),
      lng: String(coords.lng),
      radiusKm: String(SERVICE_AREA_RADIUS_KM),
    });
    fetch(`/api/shops?${params.toString()}`)
      .then((r) => r.json())
      .then((shops: { location?: { name: string } | null; distanceKm: number | null }[]) => {
        if (cancelled) return;
        const nearest = shops.find((s) => s.location?.name && s.distanceKm != null);
        if (nearest?.location) {
          setResolvedName(nearest.location.name);
          setOutOfRange(false);
        } else {
          setOutOfRange(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [coords, googleReady]);

  function pickPlace(place: PlaceResult) {
    setManual({ lat: place.lat, lng: place.lng });
    setResolvedName(place.name);
    setOutOfRange(false);
    setPicking(false);
  }

  const defaultLocationName = locations?.[0]?.name ?? "Set your location";
  const label =
    status === "locating" && !resolvedName
      ? "Detecting your location..."
      : !googleReady && outOfRange && !resolvedName
        ? "Outside service area"
        : resolvedName ?? defaultLocationName;

  return (
    <>
      <button onClick={() => setPicking(true)} className="flex min-w-0 items-center gap-2 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin size={17} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[11px] text-muted-foreground">Your Location</span>
          <span className="flex items-center gap-1 truncate text-sm font-semibold">
            <span className="truncate">{label}</span>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
          </span>
        </span>
      </button>

      {picking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setPicking(false)}>
          <div
            className="w-full max-w-sm rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choose your location</h2>
              <button onClick={() => setPicking(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <button
              onClick={() => {
                refresh();
                setPicking(false);
              }}
              className="mb-3 flex w-full items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm font-medium text-primary"
            >
              <Navigation size={15} /> Use my current location
            </button>

            {googleReady && (
              <div className="relative mb-3">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <PlaceAutocompleteInput
                  placeholder="Search for a place..."
                  onSelect={pickPlace}
                  className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3.5 text-sm outline-none focus:border-primary"
                />
              </div>
            )}

            {status === "denied" && (
              <p className="mb-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                Location access was denied — {googleReady ? "search above, or " : ""}pick an
                area below, or allow location access in your browser to detect it automatically.
              </p>
            )}

            {!googleReady && status === "granted" && outOfRange && !resolvedName && (
              <p className="mb-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                We couldn&apos;t find a food court near your current location — pick an area
                below to browse it anyway.
              </p>
            )}

            {!locations ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading areas...</p>
            ) : locations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No areas available yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Browse by area</p>
                {locations.map((loc) => (
                  <Link
                    key={loc.id}
                    href={`/explore?location=${loc.id}`}
                    onClick={() => setPicking(false)}
                    className="rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted"
                  >
                    {loc.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
