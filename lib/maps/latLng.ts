export type MarkerPosition =
  | google.maps.LatLng
  | google.maps.LatLngLiteral
  | google.maps.LatLngAltitude
  | google.maps.LatLngAltitudeLiteral
  | null
  | undefined;

/** `AdvancedMarkerElement.position` can come back as any of the shapes above depending on
 * how it was last set — normalize to a plain {lat,lng} once, everywhere. */
export function latLngOf(pos: MarkerPosition): { lat: number; lng: number } | null {
  if (!pos) return null;
  const lat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
  const lng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
  return { lat, lng };
}
