import { useEffect, useState } from 'react';
import type { FeatureCollection } from '../types/geo';
import { describeIssues, validateFeatureCollection, type GeoJsonValidationOptions } from '../lib/geo/geojson';

export type ResourceState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };

const cache = new Map<string, Promise<FeatureCollection<unknown>>>();

/** Resolve a path in public/ against the deployed base path. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

async function load<P>(path: string, options: GeoJsonValidationOptions): Promise<FeatureCollection<P>> {
  const url = assetUrl(path);
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(`Could not download ${path}. Check your connection and try again.`);
  }
  if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(`${path} is not valid JSON.`);
  }
  const result = validateFeatureCollection<P>(json, options);
  if (!result.ok) throw new Error(`${path} failed validation: ${describeIssues(result.issues)}`);
  return result.data;
}

/**
 * Lazily fetch and validate a static GeoJSON file. Nothing is requested until
 * `enabled` is true, and each file is fetched at most once per page load.
 * A failed load is reported to the caller and never throws into rendering.
 */
export function useGeoJsonResource<P>(
  path: string | undefined,
  enabled: boolean,
  options: GeoJsonValidationOptions = {},
): ResourceState<FeatureCollection<P>> & { retry: () => void } {
  const [state, setState] = useState<ResourceState<FeatureCollection<P>>>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    if (!path || !enabled) return;
    let cancelled = false;
    let promise = cache.get(path) as Promise<FeatureCollection<P>> | undefined;
    if (!promise) {
      promise = load<P>(path, JSON.parse(optionsKey) as GeoJsonValidationOptions);
      cache.set(path, promise as Promise<FeatureCollection<unknown>>);
      promise.catch(() => cache.delete(path));
    }
    // Defer the loading state so effects do not set state synchronously.
    queueMicrotask(() => {
      if (!cancelled) setState((s) => (s.status === 'ready' ? s : { status: 'loading' }));
    });
    promise.then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data });
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [path, enabled, optionsKey, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

/** Test helper: forget cached downloads. */
export function clearGeoJsonCache(): void {
  cache.clear();
}
