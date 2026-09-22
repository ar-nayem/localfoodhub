"use client";

import { useEffect, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

type Status = "idle" | "locating" | "granted" | "denied" | "unavailable";

const CACHE_KEY = "shokherkhabar_geo_coords";
const CACHE_MAX_AGE_MS = 15 * 60 * 1000; // 15 min — real enough for "nearby shops", no reason to re-poll GPS every render

/**
 * Browser geolocation with a graceful fallback path built in. Never leaves the app
 * unusable: `status` tells the caller whether it has a real position, is waiting on the
 * permission prompt, or needs to fall back to manual location selection.
 *
 * Coordinates are cached in sessionStorage rather than re-requested on every mount — this
 * is what stops every page navigation from re-prompting/re-hitting the GPS. `refresh()` is
 * there for a caller that explicitly wants a fresh fix (e.g. a "use my current location"
 * button), not called automatically.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  function readCache(): Coords | null {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Coords & { at: number };
      if (Date.now() - parsed.at > CACHE_MAX_AGE_MS) return null;
      return { lat: parsed.lat, lng: parsed.lng };
    } catch {
      return null;
    }
  }

  function writeCache(c: Coords) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...c, at: Date.now() }));
    } catch {
      // Private browsing / storage disabled — coords just won't survive a reload, which
      // only means one extra permission round-trip, not a broken feature.
    }
  }

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        writeCache(c);
        setCoords(c);
        setStatus("granted");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: CACHE_MAX_AGE_MS }
    );
  }

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setCoords(cached);
      setStatus("granted");
      return;
    }
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Manual override — lets a "set my location" fallback UI (search/select/pin-drop) work
   * even when the browser API is denied or unavailable. */
  function setManual(c: Coords) {
    writeCache(c);
    setCoords(c);
    setStatus("granted");
  }

  return { coords, status, refresh: locate, setManual };
}
