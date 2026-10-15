import { describe, expect, it } from 'vitest';
import { COMMUNITIES } from '../src/data/communities';
import { REGIONS, getRegion } from '../src/data/regions/regions';
import { buildCommunityEntries, buildRegionEntries, normalizeQuery, search, type SearchEntry } from '../src/lib/search/search';

const entries: SearchEntry[] = [
  ...buildCommunityEntries(COMMUNITIES, (c) => getRegion(c.regionId).name),
  ...buildRegionEntries(REGIONS),
];

const names = (q: string) => search(entries, q).map((r) => r.entry.name);

describe('search', () => {
  it('finds a known community', () => {
    expect(names('Iqaluit')[0]).toBe('Iqaluit');
  });

  it('ignores letter case', () => {
    expect(names('IQALUIT')[0]).toBe('Iqaluit');
    expect(names('rankin inlet')[0]).toBe('Rankin Inlet');
  });

  it('ignores surrounding whitespace', () => {
    expect(names('   Pond Inlet   ')[0]).toBe('Pond Inlet');
    expect(names('pond    inlet')[0]).toBe('Pond Inlet');
  });

  it('matches partial names, prefixes first', () => {
    const result = names('ku');
    expect(result.slice(0, 2).sort()).toEqual(['Kugaaruk', 'Kugluktuk']);
    expect(names('inlet')).toEqual(expect.arrayContaining(['Pond Inlet', 'Rankin Inlet', 'Chesterfield Inlet']));
  });

  it('returns an empty list for no match or an empty query', () => {
    expect(search(entries, 'zzzz')).toEqual([]);
    expect(search(entries, '   ')).toEqual([]);
    expect(search(entries, '')).toEqual([]);
  });

  it('matches recorded former names and reports the alias', () => {
    const [first] = search(entries, 'Frobisher Bay');
    expect(first?.entry.name).toBe('Iqaluit');
    expect(first?.matchedAlias).toEqual({ value: 'Frobisher Bay', label: 'Former name' });
    expect(names('Repulse Bay')[0]).toBe('Naujaat');
  });

  it('matches Inuktut names with or without apostrophes', () => {
    expect(names("Qamani'tuaq")[0]).toBe('Baker Lake');
    expect(names('qamanituaq')[0]).toBe('Baker Lake');
    expect(names('ᐊᕐᕕᐊᑦ')[0]).toBe('Arviat');
  });

  it('finds regions by current and former names', () => {
    expect(names('Kivalliq')[0]).toBe('Kivalliq Region');
    expect(names('Keewatin')[0]).toBe('Kivalliq Region');
  });

  it('flags results that share a display name', () => {
    const dup: SearchEntry[] = [
      { kind: 'community', id: 'a', name: 'Same', names: [{ value: 'Same' }], context: 'A' },
      { kind: 'feature', id: 'b', name: 'Same', names: [{ value: 'Same' }], context: 'B' },
      { kind: 'feature', id: 'c', name: 'Other', names: [{ value: 'Other' }], context: 'C' },
    ];
    const results = search(dup, 'same');
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ambiguous)).toBe(true);
    expect(results[0]?.entry.kind).toBe('community');
  });

  it('normalizes diacritics and punctuation', () => {
    expect(normalizeQuery('  Gjøa-Havén  ')).toBe('gjøa haven');
  });
});
