import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_SOURCES } from '../src/data/sources/sources';
import { LAYERS } from '../src/data/layers/registry';
import { BASEMAPS } from '../src/config/basemaps';
import { REGIONS } from '../src/data/regions/regions';
import { COMMUNITIES } from '../src/data/communities';
import { validateFeatureCollection } from '../src/lib/geo/geojson';
import type { PhysicalFeatureProperties } from '../src/types/layer';

const publicDir = resolve(__dirname, '../public');
const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(publicDir, path), 'utf8'));
const sourceIds = new Set(DATA_SOURCES.map((s) => s.id));

describe('data source register', () => {
  it('has unique ids and complete metadata', () => {
    expect(sourceIds.size).toBe(DATA_SOURCES.length);
    for (const s of DATA_SOURCES) {
      expect(s.url, s.id).toMatch(/^https:\/\//);
      expect(s.license.trim(), s.id).not.toBe('');
      expect(s.accessed, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.limitations.length, s.id).toBeGreaterThan(0);
    }
  });

  it('is referenced correctly by layers, basemaps, regions and records', () => {
    const referenced = [
      ...LAYERS.flatMap((l) => l.sourceIds),
      ...BASEMAPS.map((b) => b.sourceId),
      ...REGIONS.flatMap((r) => r.sourceIds),
      ...COMMUNITIES.flatMap((c) => c.links.map((l) => l.sourceId)),
    ];
    for (const id of referenced) expect(sourceIds.has(id), id).toBe(true);
  });
});

describe('layer registry', () => {
  it('only marks layers available when they have sources and data', () => {
    for (const layer of LAYERS) {
      if (layer.status === 'available') {
        expect(layer.sourceIds.length, layer.id).toBeGreaterThan(0);
        if (layer.storage === 'static-file') {
          expect(layer.dataPath, layer.id).toBeDefined();
          expect(existsSync(resolve(publicDir, layer.dataPath ?? '')), layer.id).toBe(true);
        }
      } else {
        expect(layer.defaultVisible, layer.id).toBe(false);
        expect(layer.plannedNote, layer.id).toBeTruthy();
      }
    }
  });

  it('does not draw region polygons while no verified boundary exists', () => {
    expect(REGIONS.every((r) => !r.boundaryAvailable)).toBe(true);
    expect(LAYERS.find((l) => l.id === 'region-boundaries')?.status).toBe('planned');
  });
});

describe('bundled GeoJSON files', () => {
  it('nunavut-boundary.geojson is valid WGS84 polygon data', () => {
    const result = validateFeatureCollection(readJson('data/nunavut-boundary.geojson'), {
      allowedGeometryTypes: ['Polygon', 'MultiPolygon'],
    });
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it('context-land.geojson is valid WGS84 polygon data', () => {
    const result = validateFeatureCollection(readJson('data/context-land.geojson'), {
      allowedGeometryTypes: ['Polygon', 'MultiPolygon'],
    });
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it('physical-features.geojson has valid, uniquely identified label points', () => {
    const result = validateFeatureCollection<PhysicalFeatureProperties>(readJson('data/physical-features.geojson'), {
      allowedGeometryTypes: ['Point'],
      requiredProperties: ['name', 'category', 'realm', 'sourceId'],
      requireIds: true,
      detectSwappedCoordinates: true,
    });
    expect(result.ok ? [] : result.issues).toEqual([]);
    if (result.ok) {
      const names = result.data.features.map((f) => f.properties.name);
      expect(names).toEqual(expect.arrayContaining(['Baffin Island', 'Ellesmere Island', 'Hudson Bay', 'Foxe Basin']));
      for (const f of result.data.features) expect(sourceIds.has(f.properties.sourceId)).toBe(true);
    }
  });

  it('keeps bundled files small enough for quick loading', () => {
    for (const file of ['data/nunavut-boundary.geojson', 'data/context-land.geojson', 'data/physical-features.geojson']) {
      expect(readFileSync(resolve(publicDir, file)).byteLength, file).toBeLessThan(300 * 1024);
    }
  });
});
