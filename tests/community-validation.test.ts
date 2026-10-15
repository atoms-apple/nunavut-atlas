import { describe, expect, it } from 'vitest';
import { parseCommunityDataset, parseCommunityRecord } from '../src/lib/validation/community';
import { ctx, validRecord } from './helpers';

describe('parseCommunityRecord', () => {
  it('parses a valid record and computes completeness', () => {
    const result = parseCommunityRecord(validRecord(), ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.community.name).toBe('Test Community');
      expect(result.community.completeness).toBe('partial');
      expect(result.community.missingFields).toEqual(['indigenousNames', 'description', 'links']);
    }
  });

  it('accepts a record with no population and reports it as missing', () => {
    const result = parseCommunityRecord(validRecord({ population: null }), ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.community.population).toBeNull();
      expect(result.community.missingFields).toContain('population');
    }
  });

  it('accepts a record with no verified location as minimal', () => {
    const result = parseCommunityRecord(validRecord({ location: null }), ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.community.completeness).toBe('minimal');
  });

  it('rejects invalid latitude', () => {
    const result = parseCommunityRecord(
      validRecord({ location: { lat: 123, lon: -92, precision: 'decimal', sourceIds: ['nrcan-cgndb'], verification: 'official-record' } }),
      ctx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/latitude 123/);
  });

  it('detects swapped latitude and longitude', () => {
    const result = parseCommunityRecord(
      validRecord({ location: { lat: -92.1, lon: 62.8, precision: 'decimal', sourceIds: ['nrcan-cgndb'], verification: 'official-record' } }),
      ctx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/swapped|outside|latitude/);
  });

  it('rejects coordinates outside Nunavut', () => {
    const result = parseCommunityRecord(
      validRecord({ location: { lat: 45.42, lon: -75.69, precision: 'decimal', sourceIds: ['nrcan-cgndb'], verification: 'official-record' } }),
      ctx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/outside the Nunavut area/);
  });

  it('rejects unknown sources, regions and bad identifiers', () => {
    const result = parseCommunityRecord(
      validRecord({
        id: 'Not A Slug',
        regionId: 'nowhere',
        population: { count: 10, censusYear: 2021, sourceIds: ['made-up-source'], verification: 'official-record' },
      }),
      ctx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.errors.join('\n');
      expect(text).toMatch(/id "Not A Slug"/);
      expect(text).toMatch(/regionId "nowhere"/);
      expect(text).toMatch(/unknown source id "made-up-source"/);
    }
  });

  it('rejects non-integer or negative populations', () => {
    const result = parseCommunityRecord(
      validRecord({ population: { count: -5, censusYear: 2021, sourceIds: ['statcan-2021-fogs'], verification: 'official-record' } }),
      ctx,
    );
    expect(result.ok).toBe(false);
  });

  it('only allows https links', () => {
    const result = parseCommunityRecord(validRecord({ links: [{ label: 'x', url: 'http://example.com', sourceId: 'nrcan-cgndb' }] }), ctx);
    expect(result.ok).toBe(false);
  });
});

describe('parseCommunityDataset', () => {
  it('keeps valid records and reports invalid ones without throwing', () => {
    const result = parseCommunityDataset(
      {
        communities: [
          validRecord(),
          validRecord({ id: 'broken', name: 'Broken', location: { lat: 'north' } }),
        ],
      },
      ctx,
    );
    expect(result.communities.map((c) => c.id)).toEqual(['test-community']);
    expect(result.errors[0]?.recordId).toBe('broken');
  });

  it('rejects duplicate ids and duplicate names', () => {
    const result = parseCommunityDataset(
      {
        communities: [
          validRecord(),
          validRecord(),
          validRecord({ id: 'other-id', name: 'test community' }),
        ],
      },
      ctx,
    );
    expect(result.communities).toHaveLength(1);
    expect(result.errors.map((e) => e.message).join('\n')).toMatch(/Duplicate id[\s\S]*Duplicate name/);
  });

  it('handles a malformed dataset', () => {
    const result = parseCommunityDataset({ items: [] }, ctx);
    expect(result.communities).toEqual([]);
    expect(result.errors[0]?.message).toMatch(/"communities" array/);
  });
});
