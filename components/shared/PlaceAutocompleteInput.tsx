"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/maps/loadGoogleMaps";
import type { PlaceResult } from "@/lib/maps/types";

// Minimal shape of the parts of the `gmp-place-autocomplete` custom element and its
// select event this file actually touches — @types/google.maps doesn't yet cover the
// newer Places UI Kit elements, so this stands in rather than reaching for `any`.
interface PlaceAutocompleteElement extends HTMLElement {
  value?: string;
}
interface PlacePrediction {
  toPlace(): {
    fetchFields(opts: { fields: string[] }): Promise<void>;
    displayName?: string | null;
    formattedAddress?: string | null;
    id?: string | null;
    location?: { lat(): number; lng(): number } | null;
  };
}

/**
 * `google.maps.places.PlaceAutocompleteElement` — the current Places UI Kit search box,
 * not the classic `google.maps.places.Autocomplete` widget. That widget is confirmed
 * unavailable to Google Cloud projects created after March 1 2025 (Google's own console
 * warning), so it isn't a safe choice for a freshly-created key; this is the one Google
 * actually points new integrations at (the same component the spec's own reference links
 * describe). It's a self-rendering custom element (shadow DOM), so this wraps it rather
 * than binding to a plain `<input>` the way the classic widget allowed — the CSS custom
 * properties below are Google's documented theming hooks for matching a host app's look.
 */
export function PlaceAutocompleteInput({
  placeholder = "Search for a place...",
  onSelect,
  className,
}: {
  placeholder?: string;
  onSelect: (place: PlaceResult) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    let el: PlaceAutocompleteElement | null = null;
    let handler: ((e: Event) => void) | null = null;

    loadGoogleMaps()
      .then(async (g) => {
        if (cancelled || !containerRef.current) return;
        const placesLib = (await g.maps.importLibrary("places")) as unknown as {
          PlaceAutocompleteElement: new (opts?: Record<string, unknown>) => PlaceAutocompleteElement;
        };
        if (cancelled || !containerRef.current) return;

        el = new placesLib.PlaceAutocompleteElement({});
        el.setAttribute("placeholder", placeholder);
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(el);

        handler = async (e: Event) => {
          const { placePrediction } = e as unknown as { placePrediction: PlacePrediction };
          if (!placePrediction) return;
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "id"] });
          const loc = place.location;
          if (!loc) return;
          onSelectRef.current({
            name: place.displayName || place.formattedAddress || "Selected location",
            formattedAddress: place.formattedAddress || place.displayName || "",
            lat: loc.lat(),
            lng: loc.lng(),
            placeId: place.id ?? null,
          });
        };
        el.addEventListener("gmp-select", handler);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (el && handler) el.removeEventListener("gmp-select", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={
        {
          "--gmpx-color-surface": "var(--surface)",
          "--gmpx-color-on-surface": "var(--foreground)",
          "--gmpx-color-on-surface-variant": "var(--muted-foreground)",
          "--gmpx-color-primary": "var(--primary)",
          "--gmpx-font-family": "inherit",
          "--gmpx-font-size-base": "0.875rem",
        } as React.CSSProperties
      }
    />
  );
}
