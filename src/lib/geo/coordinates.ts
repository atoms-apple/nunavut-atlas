import type { GeoPoint, LatLngBoundsTuple, LonLat } from '../../types/geo';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidLatitude(lat: unknown): lat is number {
  return isFiniteNumber(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lon: unknown): lon is number {
  return isFiniteNumber(lon) && lon >= -180 && lon <= 180;
}

/**
 * Approximate envelope around Nunavut, including the Belcher Islands and the
 * northern tip of Ellesmere Island. Used to catch swapped or mistyped
 * coordinates, not as a boundary.
 */
export const NUNAVUT_ENVELOPE = { south: 51, north: 84, west: -125, east: -60 } as const;

export function isWithinNunavutEnvelope({ lat, lon }: GeoPoint): boolean {
  const e = NUNAVUT_ENVELOPE;
  return lat >= e.south && lat <= e.north && lon >= e.west && lon <= e.east;
}

/** Convert a GeoJSON position [lon, lat] into an explicit point. */
export function fromGeoJsonPosition(position: LonLat): GeoPoint {
  const [lon, lat] = position;
  return { lat, lon };
}

/** Convert to Leaflet's [lat, lon] order. */
export function toLeafletLatLng({ lat, lon }: GeoPoint): [number, number] {
  return [lat, lon];
}

/**
 * Heuristic for coordinates written in the wrong order. For Nunavut, a
 * GeoJSON position whose first value looks like a latitude (51..84) and whose
 * second looks like a western longitude (-125..-60) has almost certainly been
 * written [lat, lon].
 */
export function looksLikeSwappedNunavutPosition(position: readonly number[]): boolean {
  const [a, b] = position;
  if (!isFiniteNumber(a) || !isFiniteNumber(b)) return false;
  const e = NUNAVUT_ENVELOPE;
  return a >= e.south && a <= e.north && b >= e.west && b <= e.east;
}

/** Great-circle distance in kilometres (haversine, mean Earth radius). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Format decimal degrees as degrees and minutes with hemisphere, e.g. 63°45′ N. */
export function formatDegreesMinutes(value: number, axis: 'lat' | 'lon'): string {
  const hemisphere = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutes = Math.round((abs - degrees) * 60);
  if (minutes === 60) {
    degrees += 1;
    minutes = 0;
  }
  return `${degrees}°${String(minutes).padStart(2, '0')}′ ${hemisphere}`;
}

export function formatDecimal(point: GeoPoint, digits = 4): string {
  return `${point.lat.toFixed(digits)}, ${point.lon.toFixed(digits)}`;
}

export function boundsOfPoints(points: GeoPoint[]): LatLngBoundsTuple | null {
  if (points.length === 0) return null;
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  for (const { lat, lon } of points) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lon);
    east = Math.max(east, lon);
  }
  return [
    [south, west],
    [north, east],
  ];
}
