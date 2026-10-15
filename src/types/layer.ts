import type { DataClassification } from './source';

export type LayerStatus =
  /** A dataset is bundled and can be shown. */
  | 'available'
  /** Planned; no suitable dataset has been added yet. */
  | 'planned';

export type LayerStorage = 'bundled' | 'static-file' | 'online';

export interface LayerDefinition {
  id: string;
  name: string;
  description: string;
  status: LayerStatus;
  storage: LayerStorage;
  classification: DataClassification;
  sourceIds: string[];
  /** Visible on first load. */
  defaultVisible: boolean;
  /** Path relative to the site base for static-file layers. */
  dataPath?: string;
  /** Explanation shown for planned layers. */
  plannedNote?: string;
  legend?: { symbol: 'community' | 'outline' | 'label-point'; label: string };
}

export type PhysicalFeatureCategory =
  | 'island'
  | 'island-group'
  | 'peninsula'
  | 'bay'
  | 'strait'
  | 'sound'
  | 'gulf'
  | 'channel'
  | 'other';

export interface PhysicalFeatureProperties {
  name: string;
  category: PhysicalFeatureCategory;
  realm: 'land' | 'marine';
  sourceName: string;
  wikidata: string | null;
  /** Natural Earth scalerank (lower = more prominent); used to thin labels when zoomed out. */
  labelRank?: number;
  sourceId: string;
}
