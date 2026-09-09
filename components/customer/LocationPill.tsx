"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { SERVICE_AREA_RADIUS_KM } from "@/lib/location/distance";
import { isGoogleMapsConfigured } from "@/lib/maps/loadGoogleMaps";
import { reverseGeocode } from "@/lib/maps/geocode";
import { LocationSearchSheet } from "@/components/shared/LocationSearchSheet";
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
        <LocationSearchSheet
          title="Choose your location"
          onClose={() => setPicking(false)}
          onPlaceSelected={pickPlace}
          onUseCurrentLocation={() => {
            refresh();
            setPicking(false);
          }}
          notice={
            status === "denied" ? (
              <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                Location access was denied — {googleReady ? "search above, or " : ""}pick an
                area below, or allow location access in your browser to detect it automatically.
              </p>
            ) : !googleReady && status === "granted" && outOfRange && !resolvedName ? (
              <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                We couldn&apos;t find a food court near your current location — pick an area
                below to browse it anyway.
              </p>
            ) : undefined
          }
          fallback={
            !locations ? (
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
            )
          }
        />
      )}
    </>
  );
}
