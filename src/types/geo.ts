/** WGS84 longitude/latitude in decimal degrees, in GeoJSON order: [lon, lat]. */
export type LonLat = readonly [lon: number, lat: number];

/** A geographic position with explicit property names, used in typed records. */
export interface GeoPoint {
  /** Latitude in decimal degrees (WGS84), -90..90. */
  lat: number;
  /** Longitude in decimal degrees (WGS84), -180..180. */
  lon: number;
}

/** Minimal GeoJSON types (RFC 7946). Coordinates are always [lon, lat]. */
export type Position = number[];

export type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'MultiPoint'; coordinates: Position[] }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'MultiLineString'; coordinates: Position[][] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

export type GeometryType = Geometry['type'];

export interface Feature<P = Record<string, unknown>, G extends Geometry = Geometry> {
  type: 'Feature';
  id?: string | number;
  geometry: G;
  properties: P;
}

export interface FeatureCollection<P = Record<string, unknown>, G extends Geometry = Geometry> {
  type: 'FeatureCollection';
  features: Feature<P, G>[];
}

/** [[south, west], [north, east]] in Leaflet order. */
export type LatLngBoundsTuple = [[number, number], [number, number]];

export type PointGeometry = Extract<Geometry, { type: 'Point' }>;
