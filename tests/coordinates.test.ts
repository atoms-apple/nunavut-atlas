import { describe, expect, it } from 'vitest';
import {
  boundsOfPoints,
  distanceKm,
  formatDegreesMinutes,
  isValidLatitude,
  isValidLongitude,
  isWithinNunavutEnvelope,
  looksLikeSwappedNunavutPosition,
  toLeafletLatLng,
  fromGeoJsonPosition,
} from '../src/lib/geo/coordinates';

describe('coordinate validation', () => {
  it('accepts valid latitude and longitude ranges', () => {
    expect(isValidLatitude(63.75)).toBe(true);
    expect(isValidLongitude(-68.52)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
  });

  it('rejects out-of-range, non-finite and non-numeric values', () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
    expect(isValidLatitude(Number.NaN)).toBe(false);
    expect(isValidLongitude(Infinity)).toBe(false);
    expect(isValidLatitude('63.7')).toBe(false);
    expect(isValidLatitude(null)).toBe(false);
  });

  it('knows whether a point is in the Nunavut area', () => {
    expect(isWithinNunavutEnvelope({ lat: 63.75, lon: -68.52 })).toBe(true); // Iqaluit
    expect(isWithinNunavutEnvelope({ lat: 56.53, lon: -79.23 })).toBe(true); // Sanikiluaq
    expect(isWithinNunavutEnvelope({ lat: 45.42, lon: -75.69 })).toBe(false); // Ottawa
    expect(isWithinNunavutEnvelope({ lat: -68.52, lon: 63.75 })).toBe(false); // swapped
  });
});

describe('GeoJSON coordinate order', () => {
  it('reads GeoJSON positions as [longitude, latitude]', () => {
    expect(fromGeoJsonPosition([-68.5167, 63.75])).toEqual({ lat: 63.75, lon: -68.5167 });
  });

  it('converts to Leaflet [latitude, longitude] order', () => {
    expect(toLeafletLatLng({ lat: 63.75, lon: -68.5167 })).toEqual([63.75, -68.5167]);
  });

  it('detects a Nunavut position written as [lat, lon]', () => {
    expect(looksLikeSwappedNunavutPosition([63.75, -68.5167])).toBe(true);
    expect(looksLikeSwappedNunavutPosition([-68.5167, 63.75])).toBe(false);
  });
});

describe('formatting and measurement', () => {
  it('formats degrees and minutes with hemisphere', () => {
    expect(formatDegreesMinutes(63.75, 'lat')).toBe('63°45′ N');
    expect(formatDegreesMinutes(-68.516667, 'lon')).toBe('68°31′ W');
    expect(formatDegreesMinutes(64.9999, 'lat')).toBe('65°00′ N');
  });

  it('computes great-circle distance', () => {
    // Iqaluit to Rankin Inlet is roughly 1,200 km.
    const d = distanceKm({ lat: 63.75, lon: -68.516667 }, { lat: 62.80906, lon: -92.08534 });
    expect(d).toBeGreaterThan(1150);
    expect(d).toBeLessThan(1250);
    expect(distanceKm({ lat: 70, lon: -80 }, { lat: 70, lon: -80 })).toBe(0);
  });

  it('computes bounds of points, or null for none', () => {
    expect(boundsOfPoints([])).toBeNull();
    expect(
      boundsOfPoints([
        { lat: 60, lon: -100 },
        { lat: 70, lon: -80 },
      ]),
    ).toEqual([
      [60, -100],
      [70, -80],
    ]);
  });
});
