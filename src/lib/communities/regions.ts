import type { Community, RegionId } from '../../types/community';

export interface RegionSummary {
  communityCount: number;
  /** Sum of verified 2021 census counts, or null when no community has one. */
  populationSubtotal: number | null;
  withPopulation: number;
  withoutPopulation: number;
  /** By recorded latitude; null when no community in the region is mapped. */
  northernmost: Community | null;
  southernmost: Community | null;
}

/**
 * Figures derived from a region's community records. The population
 * subtotal covers only communities with a verified 2021 count, so it is not
 * an official regional total and must always be shown with its coverage.
 */
export function regionSummary(regionId: RegionId, communities: readonly Community[]): RegionSummary {
  const members = communities.filter((c) => c.regionId === regionId);
  const counted = members.filter((c) => c.population?.censusYear === 2021);
  const mapped = members.filter((c) => c.location);
  const byLatitude = [...mapped].sort((a, b) => (a.location?.lat ?? 0) - (b.location?.lat ?? 0));
  return {
    communityCount: members.length,
    populationSubtotal: counted.length ? counted.reduce((sum, c) => sum + (c.population?.count ?? 0), 0) : null,
    withPopulation: counted.length,
    withoutPopulation: members.length - counted.length,
    northernmost: byLatitude.at(-1) ?? null,
    southernmost: byLatitude[0] ?? null,
  };
}
