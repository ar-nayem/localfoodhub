"use client";

import { X, Navigation, Search } from "lucide-react";
import { isGoogleMapsConfigured } from "@/lib/maps/loadGoogleMaps";
import { PlaceAutocompleteInput } from "./PlaceAutocompleteInput";
import type { PlaceResult } from "@/lib/maps/types";

/**
 * The one location-picking sheet, shared by the header's LocationPill and Explore's
 * "search another area" flow — same shell, same search-any-place behavior, so the
 * customer only ever has to learn one location UI in this app. Search is the primary,
 * always-visible action when Google Maps is configured: earlier this had a second
 * "Browse by area" list of every seeded Location underneath, which with only one real
 * Location in the marketplace rendered as a single, oddly-lonely row that read as broken,
 * not as a feature — real search replaces it outright rather than sitting beside it.
 * `fallback` is only rendered when Google isn't configured, since search-any-place isn't
 * possible without it and *something* has to remain the way to pick a place.
 */
export function LocationSearchSheet({
  title = "Choose a location",
  onUseCurrentLocation,
  onPlaceSelected,
  onClose,
  notice,
  fallback,
}: {
  title?: string;
  onUseCurrentLocation: () => void;
  onPlaceSelected: (place: PlaceResult) => void;
  onClose: () => void;
  /** Status text — permission denied, out of range, etc. Rendered above the fallback. */
  notice?: React.ReactNode;
  /** Rendered only when Google Maps isn't configured — e.g. the plain area list. */
  fallback?: React.ReactNode;
}) {
  const googleReady = isGoogleMapsConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {googleReady && (
          <div className="relative mb-3">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <PlaceAutocompleteInput
              placeholder="Search any city, area, or address..."
              onSelect={onPlaceSelected}
              className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        )}

        <button
          onClick={onUseCurrentLocation}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-muted"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Navigation size={15} />
          </span>
          Use my current location
        </button>

        {notice && <div className="mt-3">{notice}</div>}
        {!googleReady && fallback && <div className="mt-4">{fallback}</div>}
      </div>
    </div>
  );
}
