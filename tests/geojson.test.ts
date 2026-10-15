import { describe, expect, it } from 'vitest';
import { describeIssues, validateFeatureCollection } from '../src/lib/geo/geojson';

const point = (coordinates: unknown, extra: Record<string, unknown> = {}) => ({
  type: 'Feature',
  id: 'a',
  geometry: { type: 'Point', coordinates },
  properties: { name: 'A' },
  ...extra,
});
const fc = (...features: unknown[]) => ({ type: 'FeatureCollection', features });

describe('validateFeatureCollection', () => {
  it('accepts a valid collection', () => {
    const result = validateFeatureCollection(fc(point([-68.5, 63.7])), { requireIds: true, requiredProperties: ['name'] });
    expect(result.ok).toBe(true);
  });

  it('rejects input that is not a FeatureCollection', () => {
    const result = validateFeatureCollection({ type: 'Feature' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.message).toMatch(/FeatureCollection/);
  });

  it('reports out-of-range coordinates with a useful message', () => {
    const result = validateFeatureCollection(fc(point([-68.5, 163.7])));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.message).toMatch(/outside the valid longitude\/latitude range/);
  });

  it('flags projected coordinates', () => {
    const result = validateFeatureCollection(fc(point([2_345_678, 7_654_321])));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.message).toMatch(/projected coordinates/);
  });

  it('detects [lat, lon] order for Nunavut positions when asked', () => {
    const result = validateFeatureCollection(fc(point([63.7, -68.5])), { detectSwappedCoordinates: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.message).toMatch(/\[latitude, longitude\]/);
  });

  it('reports missing ids, duplicate ids and missing properties', () => {
    const result = validateFeatureCollection(
      fc(point([-68.5, 63.7]), point([-70, 64]), point([-71, 65], { id: undefined, properties: {} })),
      { requireIds: true, requiredProperties: ['name'] },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const messages = result.issues.map((i) => i.message).join('\n');
      expect(messages).toMatch(/Duplicate feature id "a"/);
      expect(messages).toMatch(/missing an "id"/);
      expect(messages).toMatch(/Missing required property "name"/);
    }
  });

  it('enforces allowed geometry types and nesting', () => {
    const line = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-70, 60], [-71, 61]] }, properties: {} };
    const badNesting = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [-70, 60] }, properties: {} };
    const result = validateFeatureCollection(fc(line, badNesting), { allowedGeometryTypes: ['Point'] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => /not allowed/.test(i.message))).toBe(true);
      expect(result.issues.some((i) => /not nested correctly/.test(i.message))).toBe(true);
    }
  });

  it('detects unclosed polygon rings', () => {
    const poly = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[-70, 60], [-71, 60], [-71, 61], [-70, 61]]] },
      properties: {},
    };
    const result = validateFeatureCollection(fc(poly));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.message).toMatch(/not closed/);
  });

  it('summarises many issues compactly', () => {
    const issues = [1, 2, 3, 4, 5].map((n) => ({ featureIndex: n, message: `m${n}` }));
    expect(describeIssues(issues)).toBe('Feature 1: m1 Feature 2: m2 Feature 3: m3 (+2 more)');
  });
});
