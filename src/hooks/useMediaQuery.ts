import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

function subscribeToViewport(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);
  return () => {
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
  };
}

/** Current window.innerHeight, updated on resize and orientation change. */
export function useViewportHeight(): number {
  return useSyncExternalStore(
    subscribeToViewport,
    () => (typeof window !== 'undefined' ? window.innerHeight : 0),
    () => 0,
  );
}
