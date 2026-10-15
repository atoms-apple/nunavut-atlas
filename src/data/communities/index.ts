import raw from './communities.json';
import { parseCommunityDataset } from '../../lib/validation/community';
import { DATA_SOURCES } from '../sources/sources';
import { REGION_IDS } from '../regions/regions';

/**
 * Community records are bundled with the application (they are small and
 * essential) and validated once at startup. Invalid records are excluded and
 * reported in the Data panel rather than breaking the atlas.
 */
const result = parseCommunityDataset(raw, {
  knownSourceIds: new Set(DATA_SOURCES.map((s) => s.id)),
  knownRegionIds: new Set(REGION_IDS),
});

export const COMMUNITIES = result.communities;
export const COMMUNITY_DATA_ERRORS = result.errors;

const byId = new Map(COMMUNITIES.map((c) => [c.id, c]));
export function getCommunity(id: string) {
  return byId.get(id);
}
