import { describe, expect, it } from 'vitest';
import { COMMUNITIES, getCommunity } from '../src/data/communities';
import { distanceBetween, formatKm, nearestCommunities } from '../src/lib/communities/distances';
import { distanceKm } from '../src/lib/geo/coordinates';
import type { Community } from '../src/types/community';

const community = (id: string) => getCommunity(id) as Community;

describe('nearestCommunities', () => {
  it('returns the 5 closest, nearest first, excluding the community itself', () => {
    const result = nearestCommunities(community('rankin-inlet'), COMMUNITIES);
    expect(result).toHaveLength(5);
    expect(result.map((n) => n.community.id)).not.toContain('rankin-inlet');
    const kms = result.map((n) => n.km);
    expect(kms).toEqual([...kms].sort((a, b) => a - b));
    // Whale Cove and Chesterfield Inlet are Rankin Inlet's neighbours on the Hudson Bay coast.
    expect(result.slice(0, 2).map((n) => n.community.id).sort()).toEqual(['chesterfield-inlet', 'whale-cove']);
  });

  it('matches distanceKm for each result', () => {
    const origin = community('iqaluit');
    for (const n of nearestCommunities(origin, COMMUNITIES)) {
      expect(n.km).toBeCloseTo(distanceKm(origin.location!, n.community.location!), 6);
    }
  });

  it('skips communities without a location', () => {
    const unmapped: Community = { ...community('kimmirut'), location: null };
    const list = COMMUNITIES.map((c) => (c.id === 'kimmirut' ? unmapped : c));
    expect(nearestCommunities(community('iqaluit'), list).map((n) => n.community.id)).not.toContain('kimmirut');
  });

  it('returns nothing for an origin without a location, and respects the count', () => {
    expect(nearestCommunities({ ...community('iqaluit'), location: null }, COMMUNITIES)).toEqual([]);
    expect(nearestCommunities(community('iqaluit'), COMMUNITIES, 2)).toHaveLength(2);
  });
});

describe('distanceBetween and formatKm', () => {
  it('returns null when a location is missing', () => {
    expect(distanceBetween(community('iqaluit'), { ...community('arviat'), location: null })).toBeNull();
    expect(distanceBetween(community('iqaluit'), community('iqaluit'))).toBe(0);
  });

  it('formats whole kilometres with separators', () => {
    expect(formatKm(1234.4)).toBe('1,234 km');
    expect(formatKm(87.6)).toBe('88 km');
  });
});
