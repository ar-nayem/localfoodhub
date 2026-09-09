"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MapPin, ChevronDown } from "lucide-react";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { SERVICE_AREA_RADIUS_KM } from "@/lib/location/distance";
import { isGoogleMapsConfigured } from "@/lib/maps/loadGoogleMaps";
import { reverseGeocode } from "@/lib/maps/geocode";

/**
 * Real location detection. With Google Maps configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * set), a GPS fix is reverse-geocoded to an actual place name — never a guess. Without a
 * key, this falls back to the previous honest-but-limited behavior: finding the nearest
 * shop-with-coordinates and using *its* food-court name, since there's no other way to
 * turn raw coordinates into words. Either way, this pill must never show a specific place
 * name the customer didn't actually arrive at (via GPS) or choose (via search/picker) —
 * that was the original bug: a demo food-court name reading as if it were detected.
 *
 * Tapping it navigates to /location — a full page (current-location tracking, saved
 * addresses, add new) rather than a cramped sheet, per the Meituan reference the product
 * is matching.
 */
export function LocationPill() {
  const router = useRouter();
  const pathname = usePathname();
  const { coords, status } = useGeolocation();
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  // True once a real fix came back with nothing inside SERVICE_AREA_RADIUS_KM — only
  // meaningful in the no-Google fallback path; with real reverse geocoding every fix
  // resolves to *some* honest place name regardless of whether any shop is nearby, so this
  // stops applying once Google is configured.
  const [outOfRange, setOutOfRange] = useState(false);

  const googleReady = isGoogleMapsConfigured();

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

  const label =
    status === "locating" && !resolvedName
      ? "Detecting your location..."
      : !googleReady && outOfRange && !resolvedName
        ? "Outside service area"
        : resolvedName ?? "Set your location";

  return (
    <button
      onClick={() => router.push(`/location?returnTo=${encodeURIComponent(pathname || "/")}`)}
      className="flex min-w-0 items-center gap-2 text-left"
    >
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
  );
}
