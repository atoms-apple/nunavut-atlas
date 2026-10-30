import type { Community } from '../../types/community';
import type { DataSource } from '../../types/source';
import type { FeatureCollection, PointGeometry } from '../../types/geo';
import { missingFieldLabels } from './fields';

/**
 * Builders for the files the community table exports. Everything here is
 * pure so it can be tested; the browser download lives in download.ts.
 * Missing values stay empty (CSV) or null (GeoJSON), never zero or a guess.
 */

export const CSV_COLUMNS = [
  'id',
  'name',
  'region',
  'municipal_status',
  'census_subdivision_code',
  'latitude',
  'longitude',
  'coordinate_verification',
  'coordinate_source_ids',
  'population_2021',
  'population_source_ids',
  'inuktut_names',
  'former_names',
  'last_reviewed',
  'not_yet_added',
] as const;

export type ExportColumn = (typeof CSV_COLUMNS)[number];
export type ExportRecord = Record<ExportColumn, string | number | null>;

const AWAITING_REVIEW = 'awaiting review';

/** One flat record per community, shared by the CSV and GeoJSON exports. */
export function exportRecord(c: Community, regionName: string): ExportRecord {
  const population2021 = c.population && c.population.censusYear === 2021 ? c.population : null;
  return {
    id: c.id,
    name: c.name,
    region: regionName,
    municipal_status: c.municipalStatus ?? null,
    census_subdivision_code: c.censusSubdivisionCode ?? null,
    latitude: c.location?.lat ?? null,
    longitude: c.location?.lon ?? null,
    coordinate_verification: c.location?.verification ?? null,
    coordinate_source_ids: c.location ? c.location.sourceIds.join(';') : null,
    population_2021: population2021?.count ?? null,
    population_source_ids: population2021 ? population2021.sourceIds.join(';') : null,
    inuktut_names:
      c.indigenousNames.length > 0
        ? c.indigenousNames
            .map((n) => (n.verification === 'official-record' ? n.name : `${n.name} (${AWAITING_REVIEW})`))
            .join('; ')
        : null,
    former_names: c.formerNames.length > 0 ? c.formerNames.map((n) => n.name).join('; ') : null,
    last_reviewed: c.lastReviewed,
    not_yet_added: c.missingFields.length > 0 ? missingFieldLabels(c.missingFields).join('; ') : null,
  };
}

/** Quote a CSV field when needed (RFC 4180): commas, quotes, line breaks or edge spaces. */
export function csvField(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 byte-order mark, so Excel opens syllabics correctly. */
export const BOM = '﻿';

export function buildCsv(communities: readonly Community[], regionName: (c: Community) => string): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const c of communities) {
    const record = exportRecord(c, regionName(c));
    lines.push(CSV_COLUMNS.map((col) => csvField(record[col])).join(','));
  }
  return BOM + lines.join('\r\n') + '\r\n';
}

export interface GeoJsonExport {
  collection: FeatureCollection<ExportRecord, PointGeometry>;
  /** Communities left out because they have no verified location. */
  omitted: Community[];
}

export function buildGeoJson(communities: readonly Community[], regionName: (c: Community) => string): GeoJsonExport {
  const omitted: Community[] = [];
  const features: GeoJsonExport['collection']['features'] = [];
  for (const c of communities) {
    if (!c.location) {
      omitted.push(c);
      continue;
    }
    features.push({
      type: 'Feature',
      id: c.id,
      // GeoJSON order: [longitude, latitude].
      geometry: { type: 'Point', coordinates: [c.location.lon, c.location.lat] },
      properties: exportRecord(c, regionName(c)),
    });
  }
  return { collection: { type: 'FeatureCollection', features }, omitted };
}

/** Every source id that the given communities' values cite. */
export function referencedSourceIds(communities: readonly Community[]): string[] {
  const ids = new Set<string>();
  for (const c of communities) {
    c.location?.sourceIds.forEach((id) => ids.add(id));
    c.population?.sourceIds.forEach((id) => ids.add(id));
    c.description?.sourceIds.forEach((id) => ids.add(id));
    c.indigenousNames.forEach((n) => n.sourceIds.forEach((id) => ids.add(id)));
    c.formerNames.forEach((n) => n.sourceIds.forEach((id) => ids.add(id)));
    c.links.forEach((l) => ids.add(l.sourceId));
  }
  return [...ids];
}

export function buildAttribution(
  communities: readonly Community[],
  sources: readonly DataSource[],
  generatedOn: string,
): string {
  const ids = new Set(referencedSourceIds(communities));
  const used = sources.filter((s) => ids.has(s.id));
  const lines = [
    'Nunavut Atlas: attribution and licences for exported community data',
    `Generated on ${generatedOn} for ${communities.length} ${communities.length === 1 ? 'community' : 'communities'}.`,
    'Keep this file with the exported data.',
    '',
    'The Nunavut Atlas code is MIT-licensed. The data is not covered by that licence:',
    'each dataset below keeps its own licence and attribution requirements.',
    'Source: https://github.com/atoms-apple/nunavut-atlas',
    '',
  ];
  for (const s of used) {
    lines.push(`== ${s.name}`);
    lines.push(`Publisher: ${s.publisher}`);
    lines.push(`Licence: ${s.license}`);
    if (s.licenseUrl) lines.push(`Licence URL: ${s.licenseUrl}`);
    if (s.attribution) lines.push(`Attribution: ${s.attribution}`);
    lines.push(`Source URL: ${s.url}`);
    lines.push(`Accessed: ${s.accessed}`);
    lines.push('Limitations:');
    for (const l of s.limitations) lines.push(`  - ${l}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Local date as YYYY-MM-DD. */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function exportFilename(kind: 'csv' | 'geojson' | 'attribution', date: Date): string {
  const base = `nunavut-atlas-communities-${isoDate(date)}`;
  return kind === 'attribution' ? `${base}-attribution.txt` : `${base}.${kind}`;
}
