"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps/loadGoogleMaps";
import type { PlaceResult } from "@/lib/maps/types";

interface Suggestion {
  text: string;
  toPlace(): {
    fetchFields(opts: { fields: string[] }): Promise<void>;
    displayName?: string | null;
    formattedAddress?: string | null;
    id?: string | null;
    location?: { lat(): number; lng(): number } | null;
  };
}

/**
 * Places search rendered as a plain app-styled `<input>` with our own dropdown list —
 * deliberately NOT `google.maps.places.Autocomplete` (Google's own console warning: not
 * available to Google Cloud projects created after March 1 2025, so unsafe to rely on for
 * a freshly-created key) and NOT `PlaceAutocompleteElement` either (a self-rendering
 * shadow-DOM custom element; tried it first, but its default theming didn't take our CSS
 * custom properties and rendered a dark box that clashed with this app's light surface —
 * confirmed live on menu.arnayem.top, not a local-only quirk).
 *
 * Instead this calls `AutocompleteSuggestion.fetchAutocompleteSuggestions` directly — the
 * current, non-deprecated Places API (New) data method with no required UI — and renders
 * the results in a list styled exactly like every other dropdown in this app.
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
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function search(text: string) {
    setValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const g = await loadGoogleMaps();
        const placesLib = (await g.maps.importLibrary("places")) as unknown as {
          AutocompleteSessionToken: new () => google.maps.places.AutocompleteSessionToken;
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions(req: {
              input: string;
              sessionToken: google.maps.places.AutocompleteSessionToken;
            }): Promise<{ suggestions: Suggestion[] }>;
          };
        };
        if (!sessionTokenRef.current) sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        const { suggestions: results } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text,
          sessionToken: sessionTokenRef.current,
        });
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }

  async function pick(s: Suggestion) {
    const place = s.toPlace();
    await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "id"] });
    const loc = place.location;
    if (!loc) return;
    onSelect({
      name: place.displayName || place.formattedAddress || s.text,
      formattedAddress: place.formattedAddress || place.displayName || s.text,
      lat: loc.lat(),
      lng: loc.lng(),
      placeId: place.id ?? null,
    });
    setValue(place.displayName || s.text);
    setSuggestions([]);
    setOpen(false);
    // A fresh session token per completed search — matches Google's billing guidance
    // (one token spans one search-to-selection, then starts over).
    sessionTokenRef.current = null;
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => search(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="block w-full truncate px-3.5 py-2.5 text-left text-sm hover:bg-muted"
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
