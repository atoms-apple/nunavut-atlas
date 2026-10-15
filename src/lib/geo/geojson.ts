import type { Feature, FeatureCollection, GeometryType } from '../../types/geo';
import { isFiniteNumber, isValidLatitude, isValidLongitude, looksLikeSwappedNunavutPosition } from './coordinates';

export interface GeoJsonIssue {
  /** Index of the feature, or -1 for collection-level problems. */
  featureIndex: number;
  featureId?: string | number;
  message: string;
}

export interface GeoJsonValidationOptions {
  /** Geometry types accepted for this layer. */
  allowedGeometryTypes?: GeometryType[];
  /** Property keys every feature must have (non-null). */
  requiredProperties?: string[];
  /** Require a unique `id` on every feature. */
  requireIds?: boolean;
  /** Flag positions that look like [lat, lon] for Nunavut. */
  detectSwappedCoordinates?: boolean;
}

export type GeoJsonValidationResult<P> =
  | { ok: true; data: FeatureCollection<P>; issues: [] }
  | { ok: false; issues: GeoJsonIssue[] };

const GEOMETRY_TYPES: GeometryType[] = [
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Walk nested coordinate arrays and yield each position. */
function* positions(coords: unknown): Generator<unknown[]> {
  if (!Array.isArray(coords)) return;
  if (coords.length > 0 && !Array.isArray(coords[0])) {
    yield coords;
    return;
  }
  for (const c of coords) yield* positions(c);
}

const EXPECTED_DEPTH: Record<GeometryType, number> = {
  Point: 0,
  MultiPoint: 1,
  LineString: 1,
  MultiLineString: 2,
  Polygon: 2,
  MultiPolygon: 3,
};

function depth(coords: unknown): number {
  let d = -1;
  let cur: unknown = coords;
  while (Array.isArray(cur)) {
    d += 1;
    cur = cur[0];
  }
  return d;
}

/**
 * Validate an unknown value as a GeoJSON FeatureCollection in WGS84
 * longitude/latitude order. Returns every problem found rather than the first.
 */
export function validateFeatureCollection<P = Record<string, unknown>>(
  input: unknown,
  options: GeoJsonValidationOptions = {},
): GeoJsonValidationResult<P> {
  const issues: GeoJsonIssue[] = [];
  const allowed = options.allowedGeometryTypes ?? GEOMETRY_TYPES;

  if (!isRecord(input) || input.type !== 'FeatureCollection') {
    return { ok: false, issues: [{ featureIndex: -1, message: 'Expected a GeoJSON FeatureCollection.' }] };
  }
  if (!Array.isArray(input.features)) {
    return { ok: false, issues: [{ featureIndex: -1, message: 'FeatureCollection has no "features" array.' }] };
  }

  const seenIds = new Set<string | number>();
  input.features.forEach((raw: unknown, i: number) => {
    const push = (message: string, featureId?: string | number) =>
      issues.push({ featureIndex: i, ...(featureId !== undefined ? { featureId } : {}), message });

    if (!isRecord(raw) || raw.type !== 'Feature') {
      push('Not a GeoJSON Feature.');
      return;
    }
    const id = typeof raw.id === 'string' || typeof raw.id === 'number' ? raw.id : undefined;
    if (options.requireIds) {
      if (id === undefined) push('Feature is missing an "id".');
      else if (seenIds.has(id)) push(`Duplicate feature id "${id}".`, id);
    }
    if (id !== undefined) seenIds.add(id);

    const geometry = raw.geometry;
    if (!isRecord(geometry) || typeof geometry.type !== 'string') {
      push('Feature has no geometry.', id);
      return;
    }
    const type = geometry.type as GeometryType;
    if (!GEOMETRY_TYPES.includes(type)) {
      push(`Unsupported geometry type "${String(geometry.type)}".`, id);
      return;
    }
    if (!allowed.includes(type)) {
      push(`Geometry type "${type}" is not allowed for this layer (expected ${allowed.join(', ')}).`, id);
    }
    if (depth(geometry.coordinates) !== EXPECTED_DEPTH[type]) {
      push(`Coordinates are not nested correctly for a ${type}.`, id);
      return;
    }

    let swappedReported = false;
    for (const pos of positions(geometry.coordinates)) {
      const [lon, lat] = pos;
      if (pos.length < 2 || !isFiniteNumber(lon) || !isFiniteNumber(lat)) {
        push('Position is not a pair of numbers.', id);
        break;
      }
      if (!isValidLongitude(lon) || !isValidLatitude(lat)) {
        const hint =
          Math.abs(lon) > 360 || Math.abs(lat) > 360
            ? ' Values this large suggest projected coordinates (e.g. metres); reproject to WGS84 longitude/latitude.'
            : !isValidLatitude(lat) && isValidLatitude(lon)
              ? ' The values may be in [latitude, longitude] order.'
              : '';
        push(`Position [${lon}, ${lat}] is outside the valid longitude/latitude range.${hint}`, id);
        break;
      }
      if (options.detectSwappedCoordinates && !swappedReported && looksLikeSwappedNunavutPosition(pos as number[])) {
        push(`Position [${lon}, ${lat}] looks like [latitude, longitude]; GeoJSON requires [longitude, latitude].`, id);
        swappedReported = true;
      }
    }

    if (type === 'Polygon' || type === 'MultiPolygon') {
      const polygons = (type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as number[][][][];
      const open = polygons.some((rings) =>
        rings.some((ring) => {
          const first = ring[0];
          const last = ring[ring.length - 1];
          return ring.length < 4 || !first || !last || first[0] !== last[0] || first[1] !== last[1];
        }),
      );
      if (open) push('Polygon ring is not closed or has fewer than four positions.', id);
    }

    const props = raw.properties;
    if (options.requiredProperties?.length) {
      if (!isRecord(props)) {
        push('Feature has no properties object.', id);
      } else {
        for (const key of options.requiredProperties) {
          if (props[key] === undefined || props[key] === null || props[key] === '') {
            push(`Missing required property "${key}".`, id);
          }
        }
      }
    }
  });

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, data: input as unknown as FeatureCollection<P>, issues: [] };
}

export function describeIssues(issues: GeoJsonIssue[], max = 3): string {
  const shown = issues.slice(0, max).map((i) => (i.featureIndex >= 0 ? `Feature ${i.featureIndex}: ${i.message}` : i.message));
  const more = issues.length > max ? ` (+${issues.length - max} more)` : '';
  return shown.join(' ') + more;
}

export type { Feature };
