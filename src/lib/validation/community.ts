import type {
  Community,
  CommunityLink,
  CommunityLocation,
  CommunityName,
  CommunityPopulation,
  CommunityRecord,
  CompletenessStatus,
  FormerName,
  RegionId,
  VerificationLevel,
} from '../../types/community';
import { isValidLatitude, isValidLongitude, isWithinNunavutEnvelope } from '../geo/coordinates';

export interface ValidationContext {
  knownSourceIds: ReadonlySet<string>;
  knownRegionIds: ReadonlySet<RegionId>;
}

export interface RecordError {
  recordIndex: number;
  recordId?: string;
  message: string;
}

export interface CommunityParseResult {
  communities: Community[];
  errors: RecordError[];
}

const VERIFICATION: ReadonlySet<string> = new Set<VerificationLevel>(['official-record', 'cross-checked', 'single-source']);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

class RecordValidator {
  readonly errors: string[] = [];
  constructor(private readonly ctx: ValidationContext) {}

  fail(message: string): void {
    this.errors.push(message);
  }

  sourceIds(value: unknown, where: string): string[] {
    if (!Array.isArray(value) || value.length === 0) {
      this.fail(`${where}: at least one source id is required.`);
      return [];
    }
    const ids = value.filter((v): v is string => typeof v === 'string');
    for (const id of ids) {
      if (!this.ctx.knownSourceIds.has(id)) this.fail(`${where}: unknown source id "${id}".`);
    }
    return ids;
  }

  verification(value: unknown, where: string): VerificationLevel {
    if (typeof value !== 'string' || !VERIFICATION.has(value)) {
      this.fail(`${where}: invalid verification level "${String(value)}".`);
      return 'single-source';
    }
    return value as VerificationLevel;
  }

  optionalNote(value: unknown): { note?: string } {
    return typeof value === 'string' && value.trim() ? { note: value } : {};
  }

  location(value: unknown): CommunityLocation | null {
    if (value === null || value === undefined) return null;
    if (!isRecord(value)) {
      this.fail('location: expected an object or null.');
      return null;
    }
    const { lat, lon } = value;
    if (!isValidLatitude(lat)) {
      this.fail(`location: latitude ${String(lat)} is not between -90 and 90.`);
      return null;
    }
    if (!isValidLongitude(lon)) {
      this.fail(`location: longitude ${String(lon)} is not between -180 and 180.`);
      return null;
    }
    if (!isWithinNunavutEnvelope({ lat, lon })) {
      const swapped = isValidLatitude(lon) && isWithinNunavutEnvelope({ lat: lon, lon: lat });
      this.fail(
        `location: (${lat}, ${lon}) is outside the Nunavut area.` + (swapped ? ' Latitude and longitude appear to be swapped.' : ''),
      );
      return null;
    }
    const precision = value.precision;
    if (precision !== 'seconds' && precision !== 'arc-minute' && precision !== 'decimal') {
      this.fail(`location: invalid precision "${String(precision)}".`);
    }
    return {
      lat,
      lon,
      precision: precision === 'seconds' || precision === 'arc-minute' ? precision : 'decimal',
      sourceIds: this.sourceIds(value.sourceIds, 'location'),
      verification: this.verification(value.verification, 'location'),
      ...this.optionalNote(value.note),
    };
  }

  population(value: unknown): CommunityPopulation | null {
    if (value === null || value === undefined) return null;
    if (!isRecord(value)) {
      this.fail('population: expected an object or null.');
      return null;
    }
    const { count, censusYear } = value;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      this.fail(`population: count ${String(count)} must be a non-negative integer.`);
      return null;
    }
    if (typeof censusYear !== 'number' || !Number.isInteger(censusYear) || censusYear < 1900 || censusYear > 2100) {
      this.fail(`population: census year ${String(censusYear)} is not valid.`);
      return null;
    }
    return {
      count,
      censusYear,
      sourceIds: this.sourceIds(value.sourceIds, 'population'),
      verification: this.verification(value.verification, 'population'),
      ...this.optionalNote(value.note),
    };
  }

  names(value: unknown): CommunityName[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((n, i): CommunityName[] => {
      if (!isRecord(n) || typeof n.name !== 'string' || !n.name.trim()) {
        this.fail(`indigenousNames[${i}]: name is required.`);
        return [];
      }
      const language = n.language === 'Inuktitut' || n.language === 'Inuinnaqtun' || n.language === 'English' ? n.language : undefined;
      const script = n.script === 'latin' || n.script === 'syllabics' ? n.script : undefined;
      return [
        {
          name: n.name,
          ...(language ? { language } : {}),
          ...(script ? { script } : {}),
          sourceIds: this.sourceIds(n.sourceIds, `indigenousNames[${i}]`),
          verification: this.verification(n.verification, `indigenousNames[${i}]`),
          ...this.optionalNote(n.note),
        },
      ];
    });
  }

  formerNames(value: unknown): FormerName[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((n, i): FormerName[] => {
      if (!isRecord(n) || typeof n.name !== 'string' || !n.name.trim()) {
        this.fail(`formerNames[${i}]: name is required.`);
        return [];
      }
      return [
        {
          name: n.name,
          ...(typeof n.changedYear === 'number' ? { changedYear: n.changedYear } : {}),
          sourceIds: this.sourceIds(n.sourceIds, `formerNames[${i}]`),
          verification: this.verification(n.verification, `formerNames[${i}]`),
          ...this.optionalNote(n.note),
        },
      ];
    });
  }

  links(value: unknown): CommunityLink[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((l, i): CommunityLink[] => {
      if (!isRecord(l) || typeof l.url !== 'string' || typeof l.label !== 'string' || typeof l.sourceId !== 'string') {
        this.fail(`links[${i}]: label, url and sourceId are required.`);
        return [];
      }
      if (!/^https:\/\//.test(l.url)) {
        this.fail(`links[${i}]: only https URLs are allowed.`);
        return [];
      }
      this.sourceIds([l.sourceId], `links[${i}]`);
      return [{ label: l.label, url: l.url, sourceId: l.sourceId }];
    });
  }
}

export function computeCompleteness(record: CommunityRecord): { completeness: CompletenessStatus; missingFields: string[] } {
  const missing: string[] = [];
  if (!record.location) missing.push('location');
  if (!record.population) missing.push('population');
  if (record.indigenousNames.length === 0) missing.push('indigenousNames');
  if (!record.description) missing.push('description');
  if (record.links.length === 0) missing.push('links');
  const completeness: CompletenessStatus = !record.location ? 'minimal' : missing.length === 0 ? 'complete' : 'partial';
  return { completeness, missingFields: missing };
}

/**
 * Validate a single unknown value as a community record. Returns the record
 * or the list of problems; invalid records are excluded from the atlas
 * rather than shown with wrong data.
 */
export function parseCommunityRecord(
  raw: unknown,
  ctx: ValidationContext,
): { ok: true; community: Community } | { ok: false; errors: string[] } {
  const v = new RecordValidator(ctx);
  if (!isRecord(raw)) return { ok: false, errors: ['Record is not an object.'] };

  const id = raw.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) v.fail(`id "${String(id)}" must be lowercase words separated by hyphens.`);
  const name = raw.name;
  if (typeof name !== 'string' || !name.trim()) v.fail('name is required.');
  const regionId = raw.regionId;
  if (typeof regionId !== 'string' || !ctx.knownRegionIds.has(regionId as RegionId)) v.fail(`regionId "${String(regionId)}" is not a known region.`);
  const lastReviewed = raw.lastReviewed;
  if (typeof lastReviewed !== 'string' || !ISO_DATE.test(lastReviewed)) v.fail('lastReviewed must be an ISO date (YYYY-MM-DD).');
  const csd = raw.censusSubdivisionCode;
  if (csd !== undefined && (typeof csd !== 'string' || !/^62\d{5}$/.test(csd))) v.fail(`censusSubdivisionCode "${String(csd)}" must be a 7-digit Nunavut code (62xxxxx).`);
  const status = raw.municipalStatus;
  if (status !== undefined && status !== 'City' && status !== 'Hamlet') v.fail(`municipalStatus "${String(status)}" is not recognised.`);

  let description: CommunityRecord['description'];
  if (raw.description !== undefined) {
    const d = raw.description;
    if (isRecord(d) && typeof d.text === 'string' && d.text.trim()) {
      description = { text: d.text, sourceIds: v.sourceIds(d.sourceIds, 'description') };
    } else {
      v.fail('description must have text and sourceIds.');
    }
  }

  const record: CommunityRecord = {
    id: String(id),
    name: String(name),
    regionId: regionId as RegionId,
    ...(status === 'City' || status === 'Hamlet' ? { municipalStatus: status } : {}),
    ...(typeof csd === 'string' ? { censusSubdivisionCode: csd } : {}),
    indigenousNames: v.names(raw.indigenousNames),
    formerNames: v.formerNames(raw.formerNames),
    location: v.location(raw.location),
    population: v.population(raw.population),
    ...(description ? { description } : {}),
    links: v.links(raw.links),
    lastReviewed: String(lastReviewed),
  };

  if (v.errors.length > 0) return { ok: false, errors: v.errors };
  return { ok: true, community: { ...record, ...computeCompleteness(record) } };
}

/** Validate a dataset of the shape { communities: [...] }. */
export function parseCommunityDataset(input: unknown, ctx: ValidationContext): CommunityParseResult {
  const communities: Community[] = [];
  const errors: RecordError[] = [];
  const list = isRecord(input) && Array.isArray(input.communities) ? input.communities : null;
  if (!list) {
    return { communities, errors: [{ recordIndex: -1, message: 'Dataset must be an object with a "communities" array.' }] };
  }
  const seenIds = new Set<string>();
  const seenNames = new Map<string, string>();
  list.forEach((raw: unknown, i: number) => {
    const result = parseCommunityRecord(raw, ctx);
    const recordId = isRecord(raw) && typeof raw.id === 'string' ? raw.id : undefined;
    if (!result.ok) {
      for (const message of result.errors) errors.push({ recordIndex: i, ...(recordId ? { recordId } : {}), message });
      return;
    }
    const c = result.community;
    if (seenIds.has(c.id)) {
      errors.push({ recordIndex: i, recordId: c.id, message: `Duplicate id "${c.id}".` });
      return;
    }
    const key = c.name.toLocaleLowerCase('en-CA');
    const existing = seenNames.get(key);
    if (existing) {
      errors.push({ recordIndex: i, recordId: c.id, message: `Duplicate name "${c.name}" (also used by "${existing}").` });
      return;
    }
    seenIds.add(c.id);
    seenNames.set(key, c.id);
    communities.push(c);
  });
  communities.sort((a, b) => a.name.localeCompare(b.name, 'en-CA'));
  return { communities, errors };
}

export type { CommunityRecord };
