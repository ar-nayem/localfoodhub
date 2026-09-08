/** Great-circle distance between two coordinates, in kilometres — the standard haversine
 * formula. Good enough for "how far is this shop" at city scale; no need for anything
 * more precise (e.g. routing distance) at this stage. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius, km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "250 m" / "1.2 km" / "1,662 km" — never exposes raw coordinates, just the friendly
 * distance a customer actually wants to see. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  const value = km.toFixed(km < 10 ? 1 : 0);
  const [whole, frac] = value.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${withCommas}.${frac} km` : `${withCommas} km`;
}

/** Beyond this, a shop isn't realistically "nearby" — the map/list switch from a plain
 * distance readout to an honest "outside your area" state instead of a number that reads
 * as broken (a customer on the other side of the world seeing "1,662 km" with no context
 * looks like a bug, not a feature). */
export const SERVICE_AREA_RADIUS_KM = 50;
