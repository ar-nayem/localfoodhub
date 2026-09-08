"use client";

// Google Maps Platform loader — Maps JavaScript API + Places (legacy Autocomplete widget,
// still fully supported/maintained by Google, not the deprecated piece of the old Places
// API) + Geocoding, all bundled in the one script tag Google's own docs recommend.
//
// Gated entirely behind NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: every caller in this app checks
// isGoogleMapsConfigured() first and falls back to the existing Leaflet/manual-entry flow
// when it's false, so the app works identically whether or not a key has been set —
// exactly the same "graceful degradation" pattern already used for browser geolocation
// itself (lib/location/useGeolocation.ts).

declare global {
  interface Window {
    google?: typeof google;
    __lfhGoogleMapsLoaded?: () => void;
  }
}

let loadPromise: Promise<typeof google> | null = null;

export function isGoogleMapsConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Google Maps API key is not configured"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-maps-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google!));
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }
    window.__lfhGoogleMapsLoaded = () => resolve(window.google!);
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,marker&loading=async&callback=__lfhGoogleMapsLoaded`;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loadPromise;
}
