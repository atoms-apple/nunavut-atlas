/**
 * Basemap providers. This is the only place tile URLs live, so providers can
 * be swapped without touching map components.
 *
 * Before changing the default, check the provider's terms of use, attribution
 * requirements and any traffic limits. Never add a provider that requires a
 * secret key: anything in this file is shipped to every visitor's browser.
 */
export interface TileBasemap {
  id: string;
  kind: 'tiles';
  name: string;
  description: string;
  url: string;
  attribution: string;
  maxZoom: number;
  /** Maximum zoom the provider actually serves; Leaflet upscales beyond it. */
  maxNativeZoom?: number;
  sourceId: string;
}

export interface LocalBasemap {
  id: string;
  kind: 'local';
  name: string;
  description: string;
  sourceId: string;
}

export type Basemap = TileBasemap | LocalBasemap;

export const BASEMAPS: Basemap[] = [
  {
    id: 'osm',
    kind: 'tiles',
    name: 'OpenStreetMap',
    description: 'Community-maintained street and place map. Requires an internet connection.',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
    sourceId: 'osm-tiles',
  },
  {
    id: 'nasa-blue-marble',
    kind: 'tiles',
    name: 'Satellite relief (NASA Blue Marble)',
    description: 'Low-resolution shaded relief and bathymetry from NASA. No place labels. Requires an internet connection.',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
    attribution:
      'Imagery: <a href="https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs">NASA EOSDIS GIBS</a> Blue Marble',
    maxZoom: 10,
    maxNativeZoom: 8,
    sourceId: 'nasa-gibs-bluemarble',
  },
  {
    id: 'local',
    kind: 'local',
    name: 'Offline outline (bundled)',
    description: 'Simplified land outline stored with the atlas. Works without online map tiles.',
    sourceId: 'natural-earth-land',
  },
];

export const DEFAULT_BASEMAP_ID = 'osm';

export function getBasemap(id: string): Basemap {
  return BASEMAPS.find((b) => b.id === id) ?? (BASEMAPS[0] as Basemap);
}
