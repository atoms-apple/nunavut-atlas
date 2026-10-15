import type { GeoPoint } from './geo';

export type RegionId = 'qikiqtaaluk' | 'kivalliq' | 'kitikmeot';

/**
 * How strongly a value has been checked.
 * - `official-record`: read from the responsible authority's own record.
 * - `cross-checked`: two or more independent sources agree.
 * - `single-source`: one credible source; awaiting a second check.
 */
export type VerificationLevel = 'official-record' | 'cross-checked' | 'single-source';

export interface SourcedValue {
  sourceIds: string[];
  verification: VerificationLevel;
  /** Free-text caveats, e.g. disagreements between sources. */
  note?: string;
}

export interface CommunityLocation extends GeoPoint, SourcedValue {
  /** Approximate precision of the published coordinate. */
  precision: 'seconds' | 'arc-minute' | 'decimal';
}

export interface CommunityPopulation extends SourcedValue {
  count: number;
  censusYear: number;
}

export interface CommunityName extends SourcedValue {
  name: string;
  language?: 'Inuktitut' | 'Inuinnaqtun' | 'English';
  script?: 'latin' | 'syllabics';
}

export interface FormerName extends SourcedValue {
  name: string;
  /** Year the current name took effect, when known. */
  changedYear?: number;
}

export interface CommunityLink {
  label: string;
  url: string;
  sourceId: string;
}

export type CompletenessStatus = 'complete' | 'partial' | 'minimal';

export interface CommunityRecord {
  /** Stable, URL-safe identifier. Never change once published. */
  id: string;
  /** Official name as used by the Government of Nunavut and Statistics Canada. */
  name: string;
  regionId: RegionId;
  municipalStatus?: 'City' | 'Hamlet';
  /** Statistics Canada census subdivision code, where verified. */
  censusSubdivisionCode?: string;
  /** Inuktitut / Inuinnaqtun name forms. Empty when none has been verified. */
  indigenousNames: CommunityName[];
  formerNames: FormerName[];
  /** Null when no coordinate could be verified; the community is then listed but not mapped. */
  location: CommunityLocation | null;
  population: CommunityPopulation | null;
  description?: { text: string; sourceIds: string[] };
  links: CommunityLink[];
  /** ISO date this record was last reviewed. */
  lastReviewed: string;
}

/** A record after validation, with completeness computed rather than hand-entered. */
export interface Community extends CommunityRecord {
  completeness: CompletenessStatus;
  missingFields: string[];
}

export interface Region {
  id: RegionId;
  name: string;
  /** Former or alternative English names. */
  alternateNames: string[];
  /** Statistics Canada census division code. */
  censusDivisionCode: string;
  description: string;
  sourceIds: string[];
  /** Whether a verified boundary polygon is bundled. */
  boundaryAvailable: boolean;
  /** Marker styling: colour plus a non-colour cue (shape and abbreviation). */
  style: { color: string; shape: 'circle' | 'square' | 'diamond'; abbreviation: string };
}
