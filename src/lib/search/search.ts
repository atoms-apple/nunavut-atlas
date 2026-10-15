import type { Community, Region } from '../../types/community';
import type { Feature, PointGeometry } from '../../types/geo';
import type { PhysicalFeatureProperties } from '../../types/layer';

export type SearchKind = 'community' | 'feature' | 'region';

export interface SearchEntry {
  kind: SearchKind;
  /** Identifier of the community, feature or region. */
  id: string;
  /** Primary display name. */
  name: string;
  /** All names that should match, including the primary one. */
  names: { value: string; label?: string }[];
  /** Short context shown under the name (e.g. region, feature type). */
  context: string;
}

export interface SearchResult {
  entry: SearchEntry;
  /** The name that matched, when it is not the primary name. */
  matchedAlias?: { value: string; label?: string };
  score: number;
  /** True when another result has the same display name. */
  ambiguous: boolean;
}

/**
 * Normalize for matching: case-insensitive, trims and collapses whitespace,
 * removes diacritics and apostrophe-like marks so that "Qamani'tuaq",
 * "Qamaniʼtuaq" and "qamanituaq" all match. Syllabics are left untouched.
 */
export function normalizeQuery(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’ʼ`´]/g, '')
    .replace(/[-_.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-CA');
}

function scoreName(candidate: string, query: string): number | null {
  const n = normalizeQuery(candidate);
  if (n === query) return 0;
  if (n.startsWith(query)) return 1;
  if (n.split(' ').some((word) => word.startsWith(query))) return 2;
  if (n.includes(query)) return 3;
  return null;
}

const KIND_ORDER: Record<SearchKind, number> = { community: 0, region: 1, feature: 2 };

export function search(entries: readonly SearchEntry[], rawQuery: string, limit = 12): SearchResult[] {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const results: SearchResult[] = [];
  for (const entry of entries) {
    let best: { score: number; alias?: SearchEntry['names'][number] } | null = null;
    entry.names.forEach((name, index) => {
      const s = scoreName(name.value, query);
      if (s === null) return;
      // Aliases rank just below the primary name at the same match quality.
      const score = s * 2 + (index === 0 ? 0 : 1);
      if (!best || score < best.score) best = { score, ...(index === 0 ? {} : { alias: name }) };
    });
    if (best) {
      const b: { score: number; alias?: SearchEntry['names'][number] } = best;
      results.push({ entry, score: b.score, ambiguous: false, ...(b.alias ? { matchedAlias: b.alias } : {}) });
    }
  }

  results.sort(
    (a, b) =>
      a.score - b.score ||
      KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] ||
      a.entry.name.localeCompare(b.entry.name, 'en-CA'),
  );

  const limited = results.slice(0, limit);
  const nameCounts = new Map<string, number>();
  for (const r of limited) {
    const key = normalizeQuery(r.entry.name);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  return limited.map((r) => ({ ...r, ambiguous: (nameCounts.get(normalizeQuery(r.entry.name)) ?? 0) > 1 }));
}

const CATEGORY_LABEL: Record<PhysicalFeatureProperties['category'], string> = {
  island: 'Island',
  'island-group': 'Island group',
  peninsula: 'Peninsula',
  bay: 'Bay',
  strait: 'Strait',
  sound: 'Sound',
  gulf: 'Gulf',
  channel: 'Channel',
  other: 'Physical feature',
};

export function categoryLabel(category: PhysicalFeatureProperties['category']): string {
  return CATEGORY_LABEL[category];
}

export function buildCommunityEntries(communities: readonly Community[], regionName: (c: Community) => string): SearchEntry[] {
  return communities.map((c) => ({
    kind: 'community',
    id: c.id,
    name: c.name,
    names: [
      { value: c.name },
      ...c.indigenousNames.map((n) => ({ value: n.name, label: n.language ?? 'Indigenous-language name' })),
      ...c.formerNames.map((n) => ({ value: n.name, label: 'Former name' })),
    ],
    context: `Community · ${regionName(c)} Region`,
  }));
}

export function buildRegionEntries(regions: readonly Region[]): SearchEntry[] {
  return regions.map((r) => ({
    kind: 'region',
    id: r.id,
    name: `${r.name} Region`,
    names: [{ value: r.name }, ...r.alternateNames.map((value) => ({ value, label: 'Former or alternative name' }))],
    context: 'Region (grouping of communities)',
  }));
}

export function buildFeatureEntries(features: readonly Feature<PhysicalFeatureProperties, PointGeometry>[]): SearchEntry[] {
  return features.map((f) => ({
    kind: 'feature',
    id: String(f.id),
    name: f.properties.name,
    names: [{ value: f.properties.name }],
    context: `${categoryLabel(f.properties.category)} · Natural Earth label point`,
  }));
}
