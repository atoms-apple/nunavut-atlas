import type { LatLngBoundsTuple } from '../types/geo';

/**
 * Initial view framing Nunavut, from the Belcher Islands (about 56°N) to
 * northern Ellesmere Island (about 83°N). Leaflet uses Web Mercator, which
 * greatly enlarges the High Arctic, so the frame is slightly trimmed in the
 * north to keep the populated south visible.
 */
export const NUNAVUT_INITIAL_BOUNDS: LatLngBoundsTuple = [
  [56, -118],
  [79, -62],
];

export const MAP_MIN_ZOOM = 2;
export const MAP_MAX_ZOOM = 12;

/** Zoom used when flying to a selected community. */
export const COMMUNITY_FOCUS_ZOOM = 7;
/** Zoom used when flying to a selected physical feature label point. */
export const FEATURE_FOCUS_ZOOM = 5;

/** Number of failed tiles, with none loaded, before the basemap is reported unavailable. */
export const TILE_FAILURE_THRESHOLD = 4;
