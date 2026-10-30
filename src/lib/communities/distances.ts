import type { Community } from '../../types/community';
import { distanceKm } from '../geo/coordinates';

export interface Neighbour {
  community: Community;
  /** Great-circle distance between recorded coordinates, in km. */
  km: number;
}

/** Straight-line distance between two communities, or null if either has no location. */
export function distanceBetween(a: Community, b: Community): number | null {
  return a.location && b.location ? distanceKm(a.location, b.location) : null;
}

/**
 * The closest mapped communities to `origin`, nearest first. Excludes the
 * origin itself and communities without a location. Ties are broken by name.
 */
export function nearestCommunities(origin: Community, communities: readonly Community[], count = 5): Neighbour[] {
  if (!origin.location) return [];
  const neighbours: Neighbour[] = [];
  for (const c of communities) {
    if (c.id === origin.id) continue;
    const km = distanceBetween(origin, c);
    if (km !== null) neighbours.push({ community: c, km });
  }
  neighbours.sort((a, b) => a.km - b.km || a.community.name.localeCompare(b.community.name, 'en-CA'));
  return neighbours.slice(0, count);
}

const KM = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

/** Whole kilometres, e.g. "1,234 km". */
export function formatKm(km: number): string {
  return `${KM.format(Math.round(km))} km`;
}
