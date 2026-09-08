"use client";

import { loadGoogleMaps } from "./loadGoogleMaps";
import type { PlaceResult } from "./types";

let geocoder: google.maps.Geocoder | null = null;

/** Turns a raw GPS fix into a real, human-readable place — this is what replaces
 * "guess the nearest shop's food-court name" with an actual answer to "where am I". */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
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
}
