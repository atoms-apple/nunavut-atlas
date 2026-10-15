/**
 * Tiny wrapper around sessionStorage for non-sensitive interface preferences
 * (visible layers, basemap). Failures (private mode, disabled storage) are
 * ignored: preferences are a convenience, never a requirement.
 */
const PREFIX = 'nunavut-atlas:';

export function readPreference<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writePreference(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable; preference simply is not remembered.
  }
}
