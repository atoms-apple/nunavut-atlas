import { describe, expect, it } from 'vitest';
import { COMMUNITIES, getCommunity } from '../src/data/communities';
import { DATA_SOURCES } from '../src/data/sources/sources';
import { getRegion } from '../src/data/regions/regions';
import {
  BOM,
  CSV_COLUMNS,
  buildAttribution,
  buildCsv,
  buildGeoJson,
  csvField,
  exportFilename,
  referencedSourceIds,
} from '../src/lib/communities/export';
import { validateFeatureCollection } from '../src/lib/geo/geojson';
import type { Community } from '../src/types/community';

const regionName = (c: Community) => getRegion(c.regionId).name;
const community = (id: string) => getCommunity(id) as Community;

/** Minimal RFC 4180 parser for checking round trips. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') continue;
    else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  return rows;
}

describe('csvField', () => {
  it('leaves plain values alone and quotes when needed', () => {
    expect(csvField('Iqaluit')).toBe('Iqaluit');
    expect(csvField(7429)).toBe('7429');
    expect(csvField(-68.516667)).toBe('-68.516667');
    expect(csvField('Arctic Bay, Hamlet')).toBe('"Arctic Bay, Hamlet"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('two\nlines')).toBe('"two\nlines"');
    expect(csvField(' leading space')).toBe('" leading space"');
  });

  it('writes missing values as empty cells, never zero', () => {
    expect(csvField(null)).toBe('');
  });
});

describe('buildCsv', () => {
  const csv = buildCsv(COMMUNITIES, regionName);
  const rows = parseCsv(csv.slice(BOM.length));

  it('starts with a UTF-8 byte-order mark and the agreed header', () => {
    expect(csv.startsWith(BOM)).toBe(true);
    expect(rows[0]).toEqual([...CSV_COLUMNS]);
    expect(rows).toHaveLength(COMMUNITIES.length + 1);
    expect(rows.every((r) => r.length === CSV_COLUMNS.length)).toBe(true);
  });

  const col = (row: string[], name: (typeof CSV_COLUMNS)[number]) => row[CSV_COLUMNS.indexOf(name)];
  const rowFor = (id: string) => rows.find((r) => r[0] === id) as string[];

  it('writes verified values and leaves missing ones empty', () => {
    const iqaluit = rowFor('iqaluit');
    expect(col(iqaluit, 'population_2021')).toBe('7429');
    expect(col(iqaluit, 'coordinate_verification')).toBe('official-record');
    expect(col(iqaluit, 'coordinate_source_ids')).toBe('nrcan-cgndb;geonames-cities500');
    expect(col(iqaluit, 'former_names')).toBe('Frobisher Bay');
    expect(col(iqaluit, 'census_subdivision_code')).toBe('');

    const kinngait = rowFor('kinngait');
    expect(col(kinngait, 'population_2021')).toBe('');
    expect(col(kinngait, 'population_source_ids')).toBe('');
    expect(col(kinngait, 'not_yet_added')).toContain('verified census population');
  });

  it('keeps syllabics intact and marks unreviewed names', () => {
    expect(col(rowFor('arviat'), 'inuktut_names')).toBe('ᐊᕐᕕᐊᑦ (awaiting review)');
    expect(col(rowFor('baker-lake'), 'inuktut_names')).toBe("Qamani'tuaq (awaiting review); ᖃᒪᓂᑦᑐᐊᖅ (awaiting review)");
  });

  it('round-trips commas and quotes inside values', () => {
    const tricky: Community = { ...community('iqaluit'), name: 'Comma, "Quoted" Place' };
    const parsed = parseCsv(buildCsv([tricky], regionName).slice(BOM.length));
    expect(col(parsed[1] as string[], 'name')).toBe('Comma, "Quoted" Place');
  });

  it('exports rows in the order given', () => {
    const order = [community('whale-cove'), community('arctic-bay')];
    const parsed = parseCsv(buildCsv(order, regionName).slice(BOM.length));
    expect(parsed.slice(1).map((r) => r[0])).toEqual(['whale-cove', 'arctic-bay']);
  });
});

describe('buildGeoJson', () => {
  it('writes [longitude, latitude] points that pass the atlas validator', () => {
    const { collection, omitted } = buildGeoJson(COMMUNITIES, regionName);
    expect(omitted).toEqual([]);
    expect(collection.features).toHaveLength(COMMUNITIES.length);
    const iq = collection.features.find((f) => f.id === 'iqaluit');
    expect(iq?.geometry.coordinates).toEqual([community('iqaluit').location?.lon, community('iqaluit').location?.lat]);
    expect(iq?.properties.population_2021).toBe(7429);

    const result = validateFeatureCollection(JSON.parse(JSON.stringify(collection)), {
      allowedGeometryTypes: ['Point'],
      requireIds: true,
      requiredProperties: ['id', 'name', 'region'],
      detectSwappedCoordinates: true,
    });
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it('leaves out communities without a verified location and reports them', () => {
    const unmapped: Community = { ...community('kinngait'), location: null };
    const { collection, omitted } = buildGeoJson([community('iqaluit'), unmapped], regionName);
    expect(collection.features.map((f) => f.id)).toEqual(['iqaluit']);
    expect(omitted.map((c) => c.id)).toEqual(['kinngait']);
  });

  it('uses null, not zero, for missing values', () => {
    const { collection } = buildGeoJson([community('kinngait')], regionName);
    expect(collection.features[0]?.properties.population_2021).toBeNull();
  });
});

describe('buildAttribution', () => {
  it('lists every source the exported rows cite, and the licence note', () => {
    const rows = [community('iqaluit'), community('arviat')];
    const text = buildAttribution(rows, DATA_SOURCES, '2026-10-30');
    for (const id of referencedSourceIds(rows)) {
      const source = DATA_SOURCES.find((s) => s.id === id);
      expect(text).toContain(`== ${source?.name}`);
      expect(text).toContain(`Licence: ${source?.license}`);
    }
    expect(text).toContain('MIT-licensed');
    expect(text).toContain('Keep this file with the exported data.');
    expect(text).toContain('Generated on 2026-10-30 for 2 communities.');
    // Sources not cited by these rows are left out.
    expect(text).not.toContain('OpenStreetMap');
  });
});

describe('exportFilename', () => {
  it('uses the local date', () => {
    const d = new Date(2026, 9, 5);
    expect(exportFilename('csv', d)).toBe('nunavut-atlas-communities-2026-10-05.csv');
    expect(exportFilename('geojson', d)).toBe('nunavut-atlas-communities-2026-10-05.geojson');
    expect(exportFilename('attribution', d)).toBe('nunavut-atlas-communities-2026-10-05-attribution.txt');
  });
});
