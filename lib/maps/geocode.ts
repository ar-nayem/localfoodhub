"use client";

import { loadGoogleMaps } from "./loadGoogleMaps";
import type { PlaceResult } from "./types";

let geocoder: google.maps.Geocoder | null = null;

/** Turns a raw GPS fix into a real, human-readable place — this is what replaces
 * "guess the nearest shop's food-court name" with an actual answer to "where am I". */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
  // Every caller that gates a "Locating..." button on this must always come back — a
  // rejected geocode (ZERO_RESULTS, quota, network hiccup) used to throw past an
  // un-try/caught `await reverseGeocode(...)`, leaving the button stuck forever. Returning
  // null instead of throwing fixes every call site at once, at the one place it matters.
  try {
    const g = await loadGoogleMaps();
    geocoder ??= new g.maps.Geocoder();
    const res = await geocoder.geocode({ location: { lat, lng } });
    const first = res.results[0];
    if (!first) return null;

    const shortName =
      first.address_components.find((c) => c.types.includes("sublocality"))?.long_name ??
      first.address_components.find((c) => c.types.includes("locality"))?.long_name ??
      first.address_components.find((c) => c.types.includes("administrative_area_level_2"))?.long_name ??
      first.formatted_address;

    return {
      name: shortName,
      formattedAddress: first.formatted_address,
      lat,
      lng,
      placeId: first.place_id ?? null,
    };
  } catch {
    return null;
  }
}
