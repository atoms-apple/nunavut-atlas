import { DATA_SOURCES } from '../src/data/sources/sources';
import { REGION_IDS } from '../src/data/regions/regions';
import type { ValidationContext } from '../src/lib/validation/community';

export const ctx: ValidationContext = {
  knownSourceIds: new Set(DATA_SOURCES.map((s) => s.id)),
  knownRegionIds: new Set(REGION_IDS),
};

/** A minimal valid community record for tests to modify. */
export function validRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'test-community',
    name: 'Test Community',
    regionId: 'kivalliq',
    indigenousNames: [],
    formerNames: [],
    location: { lat: 62.8, lon: -92.1, precision: 'decimal', sourceIds: ['nrcan-cgndb'], verification: 'official-record' },
    population: { count: 100, censusYear: 2021, sourceIds: ['statcan-2021-fogs'], verification: 'official-record' },
    links: [],
    lastReviewed: '2026-10-14',
    ...overrides,
  };
}
