import type { Community, RegionId, VerificationLevel } from '../../types/community';

export type SortKey = 'name' | 'region' | 'population' | 'latitude';
export type SortDirection = 'ascending' | 'descending';

export interface TableSort {
  key: SortKey;
  direction: SortDirection;
}

export interface TableFilters {
  region: RegionId | 'all';
  /** Keep only communities with a verified census population. */
  verifiedPopulationOnly: boolean;
  /** Coordinate verification level, or 'any' (which also keeps unmapped communities). */
  verification: VerificationLevel | 'any';
}

export const DEFAULT_SORT: TableSort = { key: 'name', direction: 'ascending' };
export const DEFAULT_FILTERS: TableFilters = { region: 'all', verifiedPopulationOnly: false, verification: 'any' };

export function filterCommunities(communities: readonly Community[], filters: TableFilters): Community[] {
  return communities.filter((c) => {
    if (filters.region !== 'all' && c.regionId !== filters.region) return false;
    if (filters.verifiedPopulationOnly && !c.population) return false;
    if (filters.verification !== 'any' && c.location?.verification !== filters.verification) return false;
    return true;
  });
}

const compareText = (a: string, b: string) => a.localeCompare(b, 'en-CA');

/** Numeric value used for sorting, or null when the value is not yet added. */
function numericValue(c: Community, key: 'population' | 'latitude'): number | null {
  return key === 'population' ? (c.population?.count ?? null) : (c.location?.lat ?? null);
}

/**
 * Sort communities for the table. Missing populations or coordinates always
 * sort last, whatever the direction. Ties fall back to the community name.
 */
export function sortCommunities(
  communities: readonly Community[],
  sort: TableSort,
  regionName: (c: Community) => string,
): Community[] {
  const factor = sort.direction === 'ascending' ? 1 : -1;
  return [...communities].sort((a, b) => {
    let result: number;
    switch (sort.key) {
      case 'name':
        return factor * compareText(a.name, b.name);
      case 'region':
        result = compareText(regionName(a), regionName(b));
        return result !== 0 ? factor * result : compareText(a.name, b.name);
      case 'population':
      case 'latitude': {
        const va = numericValue(a, sort.key);
        const vb = numericValue(b, sort.key);
        if (va === null && vb === null) return compareText(a.name, b.name);
        if (va === null) return 1;
        if (vb === null) return -1;
        result = va - vb;
        return result !== 0 ? factor * result : compareText(a.name, b.name);
      }
    }
  });
}

/** Filter, then sort: the rows the table shows (and that exports contain). */
export function tableRows(
  communities: readonly Community[],
  filters: TableFilters,
  sort: TableSort,
  regionName: (c: Community) => string,
): Community[] {
  return sortCommunities(filterCommunities(communities, filters), sort, regionName);
}

/** Next sort state when a column header is activated. */
export function nextSort(current: TableSort, key: SortKey): TableSort {
  if (current.key === key) {
    return { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' };
  }
  // Numbers read most usefully largest-first.
  return { key, direction: key === 'population' ? 'descending' : 'ascending' };
}
