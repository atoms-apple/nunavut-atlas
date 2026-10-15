import { useCallback, useState } from 'react';
import { readPreference, writePreference } from '../lib/storage/preferences';

export function useSessionPreference<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readPreference(key, fallback, isValid));
  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        writePreference(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return [value, update];
}
