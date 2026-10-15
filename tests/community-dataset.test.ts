import { describe, expect, it } from 'vitest';
import raw from '../src/data/communities/communities.json';
import { COMMUNITIES, COMMUNITY_DATA_ERRORS, getCommunity } from '../src/data/communities';
import { parseCommunityDataset } from '../src/lib/validation/community';
import { ctx } from './helpers';

/** Official municipal names as listed in the project brief and Statistics Canada. */
const EXPECTED = [
  'Arctic Bay', 'Arviat', 'Baker Lake', 'Cambridge Bay', 'Chesterfield Inlet', 'Clyde River', 'Coral Harbour',
  'Gjoa Haven', 'Grise Fiord', 'Igloolik', 'Iqaluit', 'Kimmirut', 'Kinngait', 'Kugaaruk', 'Kugluktuk', 'Naujaat',
  'Pangnirtung', 'Pond Inlet', 'Qikiqtarjuaq', 'Rankin Inlet', 'Resolute', 'Sanikiluaq', 'Sanirajak', 'Taloyoak',
  'Whale Cove',
];

describe('bundled community dataset', () => {
  it('validates with no errors', () => {
    const result = parseCommunityDataset(raw, ctx);
    expect(result.errors).toEqual([]);
    expect(COMMUNITY_DATA_ERRORS).toEqual([]);
  });

  it('contains exactly the 25 municipalities', () => {
    expect(COMMUNITIES.map((c) => c.name).sort()).toEqual([...EXPECTED].sort());
  });

  it('assigns communities to regions consistently with census division codes', () => {
    const prefix = { qikiqtaaluk: '6204', kivalliq: '6205', kitikmeot: '6208' } as const;
    for (const c of COMMUNITIES) {
      if (c.censusSubdivisionCode) expect(c.censusSubdivisionCode.startsWith(prefix[c.regionId]), c.name).toBe(true);
    }
    const counts = COMMUNITIES.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.regionId]: (acc[c.regionId] ?? 0) + 1 }), {});
    expect(counts).toEqual({ qikiqtaaluk: 13, kivalliq: 7, kitikmeot: 5 });
  });

  it('has sourced coordinates for every mapped community', () => {
    for (const c of COMMUNITIES) {
      if (!c.location) continue;
      expect(c.location.sourceIds.length, c.name).toBeGreaterThan(0);
    }
  });

  it('gives Iqaluit its verified details', () => {
    const iqaluit = getCommunity('iqaluit');
    expect(iqaluit?.population).toMatchObject({ count: 7429, censusYear: 2021 });
    expect(iqaluit?.location?.lat).toBeCloseTo(63.75, 2);
    expect(iqaluit?.location?.lon).toBeCloseTo(-68.5167, 3);
    expect(iqaluit?.regionId).toBe('qikiqtaaluk');
  });

  it('never fills unverified populations', () => {
    for (const id of ['baker-lake', 'gjoa-haven', 'kinngait', 'naujaat', 'sanirajak']) {
      expect(getCommunity(id)?.population, id).toBeNull();
    }
  });

  it('uses 2021 census populations only', () => {
    for (const c of COMMUNITIES) if (c.population) expect(c.population.censusYear).toBe(2021);
  });
});
