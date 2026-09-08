"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ChevronDown, X } from "lucide-react";
import { useGeolocation } from "@/lib/location/useGeolocation";

interface LocationRow {
  id: string;
  name: string;
  slug: string;
}

/**
 * Real location detection, with an honest fallback — there's no geocoding service wired
 * up (that would need its own API key/provider decision), so "resolve GPS coordinates to
 * a place name" works by finding the nearest shop that has coordinates and using *its*
 * food-court Location name, rather than pretending to reverse-geocode an arbitrary point.
 * Denied/unavailable falls back to the platform's default Location, and the pill always
 * offers a manual picker — the fallback the customer can act on themselves.
 */
export function LocationPill() {
  const { coords, status } = useGeolocation();
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationRow[] | null>(null);
  const [picking, setPicking] = useState(false);

  // Default location name, fetched once regardless of geolocation outcome — this is what
  // renders for a denied/unavailable permission instead of a blank pill.
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((rows: LocationRow[]) => setLocations(rows))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    if (!coords) return;
    const params = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng), radiusKm: "50" });
    fetch(`/api/shops?${params.toString()}`)
      .then((r) => r.json())
      .then((shops: { location?: { name: string } | null }[]) => {
        const nearest = shops.find((s) => s.location?.name);
        if (nearest?.location) setResolvedName(nearest.location.name);
      })
      .catch(() => undefined);
  }, [coords]);

  const defaultLocationName = locations?.[0]?.name ?? "Set your location";
  const label =
    status === "locating" && !resolvedName
      ? "Detecting your location..."
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
              <h2 className="text-lg font-semibold">Set your location</h2>
              <button onClick={() => setPicking(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {status === "denied" && (
              <p className="mb-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                Location access was denied — pick an area below, or allow location access
                in your browser to detect it automatically.
              </p>
            )}

            {!locations ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading areas...</p>
            ) : locations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No areas available yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
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
