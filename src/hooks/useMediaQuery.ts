import { useCallback, useSyncExternalStore } from 'react';

/**
 * One media query, read synchronously on the first render.
 *
 * useSyncExternalStore reads matchMedia during render, so a component that
 * picks a layout from the answer draws the right one the first time — no
 * flash of the other layout, no effect-then-setState round trip. Where
 * matchMedia does not exist (jsdom, an old embedded browser) the fallback is
 * returned and never changes.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return fallback;
    return window.matchMedia(query).matches;
  }, [query, fallback]);
  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}
