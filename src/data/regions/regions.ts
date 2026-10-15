import type { Region, RegionId } from '../../types/community';

/**
 * Nunavut's three regions. No verified boundary polygons are bundled yet, so
 * regions are presented as groupings of communities, never as drawn areas.
 * Census division codes come from the Statistics Canada 2021 DGUIDs of the
 * member communities (e.g. 2021A0005 6204 018 = Arctic Bay, division 6204).
 */
export const REGIONS: Region[] = [
  {
    id: 'qikiqtaaluk',
    name: 'Qikiqtaaluk',
    alternateNames: ['Baffin'],
    censusDivisionCode: '6204',
    description:
      'The largest of the three regions by number of communities, including Baffin Island, the High Arctic islands and the Belcher Islands. Iqaluit, the territorial capital, is in this region.',
    sourceIds: ['statcan-2021-fogs', 'wikipedia-secondary'],
    boundaryAvailable: false,
    style: { color: '#2f6fb0', shape: 'circle', abbreviation: 'QIK' },
  },
  {
    id: 'kivalliq',
    name: 'Kivalliq',
    alternateNames: ['Keewatin'],
    censusDivisionCode: '6205',
    description:
      'The central mainland region on the west coast of Hudson Bay, including Southampton Island.',
    sourceIds: ['statcan-2021-fogs', 'wikipedia-secondary'],
    boundaryAvailable: false,
    style: { color: '#b4541a', shape: 'square', abbreviation: 'KIV' },
  },
  {
    id: 'kitikmeot',
    name: 'Kitikmeot',
    alternateNames: [],
    censusDivisionCode: '6208',
    description:
      'The western region, including parts of Victoria Island, King William Island and the Boothia Peninsula.',
    sourceIds: ['statcan-2021-fogs', 'wikipedia-secondary'],
    boundaryAvailable: false,
    style: { color: '#1d7a5f', shape: 'diamond', abbreviation: 'KIT' },
  },
];

const byId = new Map(REGIONS.map((r) => [r.id, r]));

export function getRegion(id: RegionId): Region {
  const region = byId.get(id);
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}

export const REGION_IDS: readonly RegionId[] = REGIONS.map((r) => r.id);
