export interface PlaceResult {
  /** Short, human label — a locality/sublocality name, not the full street address. What
   * actually renders in tight UI like the location pill. */
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string | null;
}
