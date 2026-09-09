export interface PlaceResult {
  /** Short, human label — a locality/sublocality name, not the full street address. What
   * actually renders in tight UI like the location pill. */
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string | null;
}

/** No structured address-component API is wired up beyond what reverseGeocode already
 * pulls — this just carves a "city" label out of the tail of a full formatted address for
 * display/grouping, e.g. an address-book row's subtitle. Approximate by design: it only
 * ever feeds a label, never anything read by order/business logic. */
export function splitCityFromAddress(formatted: string): string {
  const parts = formatted.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return formatted;
  return (parts.length >= 3 ? parts[parts.length - 3] : parts[Math.max(0, parts.length - 2)]) || parts[0];
}
