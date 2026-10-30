import { describe, expect, it } from 'vitest';
import { COMMUNITIES } from '../src/data/communities';
import { getRegion } from '../src/data/regions/regions';
import {
  DEFAULT_FILTERS,
  filterCommunities,
  nextSort,
  sortCommunities,
  tableRows,
} from '../src/lib/communities/table';
import type { Community } from '../src/types/community';

const regionName = (c: Community) => getRegion(c.regionId).name;
const names = (list: Community[]) => list.map((c) => c.name);
const withoutPopulation = COMMUNITIES.filter((c) => !c.population).map((c) => c.name).sort();

describe('sortCommunities', () => {
  it('sorts by name both ways', () => {
    const asc = names(sortCommunities(COMMUNITIES, { key: 'name', direction: 'ascending' }, regionName));
    expect(asc[0]).toBe('Arctic Bay');
    expect(asc.at(-1)).toBe('Whale Cove');
    const desc = names(sortCommunities(COMMUNITIES, { key: 'name', direction: 'descending' }, regionName));
    expect(desc).toEqual([...asc].reverse());
  });

  it('puts missing populations last in both directions', () => {
    for (const direction of ['ascending', 'descending'] as const) {
      const sorted = sortCommunities(COMMUNITIES, { key: 'population', direction }, regionName);
      const tail = names(sorted.slice(-withoutPopulation.length)).sort();
      expect(tail, direction).toEqual(withoutPopulation);
      const counts = sorted.flatMap((c) => (c.population ? [c.population.count] : []));
      const expected = [...counts].sort((a, b) => (direction === 'ascending' ? a - b : b - a));
      expect(counts, direction).toEqual(expected);
    }
    expect(sortCommunities(COMMUNITIES, { key: 'population', direction: 'descending' }, regionName)[0]?.name).toBe('Iqaluit');
  });

  it('sorts by latitude', () => {
    const north = sortCommunities(COMMUNITIES, { key: 'latitude', direction: 'descending' }, regionName);
    expect(north[0]?.name).toBe('Grise Fiord');
    expect(north.at(-1)?.name).toBe('Sanikiluaq');
  });

  it('sorts by region, then by name', () => {
    const sorted = sortCommunities(COMMUNITIES, { key: 'region', direction: 'ascending' }, regionName);
    expect(regionName(sorted[0] as Community)).toBe('Kitikmeot');
    expect(regionName(sorted.at(-1) as Community)).toBe('Qikiqtaaluk');
    const kitikmeot = sorted.filter((c) => c.regionId === 'kitikmeot').map((c) => c.name);
    expect(kitikmeot).toEqual([...kitikmeot].sort());
  });

  it('keeps communities without a location last when sorting by latitude', () => {
    const iqaluit = COMMUNITIES.find((c) => c.id === 'iqaluit') as Community;
    const unmapped: Community = { ...iqaluit, id: 'unmapped', name: 'Unmapped', location: null };
    for (const direction of ['ascending', 'descending'] as const) {
      const sorted = sortCommunities([unmapped, ...COMMUNITIES], { key: 'latitude', direction }, regionName);
      expect(sorted.at(-1)?.id).toBe('unmapped');
    }
  });

  it('does not change the input array', () => {
    const copy = [...COMMUNITIES];
    sortCommunities(COMMUNITIES, { key: 'population', direction: 'descending' }, regionName);
    expect(COMMUNITIES).toEqual(copy);
  });
});

describe('filterCommunities', () => {
  it('returns everything with the default filters', () => {
    expect(filterCommunities(COMMUNITIES, DEFAULT_FILTERS)).toHaveLength(COMMUNITIES.length);
  });

  it('filters by region, verified population and coordinate verification together', () => {
    const kivalliq = filterCommunities(COMMUNITIES, { ...DEFAULT_FILTERS, region: 'kivalliq' });
    expect(kivalliq.every((c) => c.regionId === 'kivalliq')).toBe(true);
    const withPop = filterCommunities(COMMUNITIES, { ...DEFAULT_FILTERS, verifiedPopulationOnly: true });
    expect(withPop).toHaveLength(COMMUNITIES.filter((c) => c.population).length);
    const single = filterCommunities(COMMUNITIES, { ...DEFAULT_FILTERS, verification: 'single-source' });
    expect(names(single).sort()).toEqual(['Clyde River', 'Igloolik', 'Kinngait']);
    const combined = filterCommunities(COMMUNITIES, {
      region: 'qikiqtaaluk',
      verifiedPopulationOnly: true,
      verification: 'single-source',
    });
    expect(names(combined).sort()).toEqual(['Clyde River', 'Igloolik']);
  });
});

describe('tableRows and nextSort', () => {
  it('filters then sorts', () => {
    const rows = tableRows(
      COMMUNITIES,
      { ...DEFAULT_FILTERS, region: 'kitikmeot' },
      { key: 'population', direction: 'descending' },
      regionName,
    );
    expect(rows[0]?.name).toBe('Cambridge Bay');
    expect(rows.at(-1)?.name).toBe('Gjoa Haven');
  });

  it('toggles direction on the same column and picks a sensible first direction', () => {
    expect(nextSort({ key: 'name', direction: 'ascending' }, 'name')).toEqual({ key: 'name', direction: 'descending' });
    expect(nextSort({ key: 'name', direction: 'ascending' }, 'population')).toEqual({ key: 'population', direction: 'descending' });
    expect(nextSort({ key: 'population', direction: 'descending' }, 'latitude')).toEqual({ key: 'latitude', direction: 'ascending' });
  });
});
