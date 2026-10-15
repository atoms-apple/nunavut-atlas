import { useCallback, useEffect, useState } from 'react';

export type SelectionKind = 'community' | 'feature' | 'region';
export interface Selection {
  kind: SelectionKind;
  id: string;
}

const KINDS: ReadonlySet<string> = new Set<SelectionKind>(['community', 'feature', 'region']);

/** Parse "#/community/iqaluit" style hashes. Hash routing works on any static host. */
export function parseSelectionHash(hash: string): Selection | null {
  const match = /^#\/([a-z]+)\/([a-z0-9-]+)$/.exec(hash);
  if (!match) return null;
  const [, kind, id] = match;
  if (!kind || !id || !KINDS.has(kind)) return null;
  return { kind: kind as SelectionKind, id };
}

export function selectionToHash(selection: Selection | null): string {
  return selection ? `#/${selection.kind}/${selection.id}` : '';
}

export function useHashSelection(): [Selection | null, (next: Selection | null) => void] {
  const [selection, setSelection] = useState<Selection | null>(() => parseSelectionHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setSelection(parseSelectionHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const update = useCallback((next: Selection | null) => {
    setSelection(next);
    const hash = selectionToHash(next);
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    try {
      window.history.replaceState(null, '', url);
    } catch {
      // Sandboxed frames can refuse history changes; selection still works without the URL.
    }
  }, []);

  return [selection, update];
}
