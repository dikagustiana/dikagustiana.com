/**
 * A sideways-scrolling row's right-edge fade (docs/prd/2026-10-fia-fixes item
 * 2): on while there is more to the right, off once the row is scrolled to its
 * end or fits. The fade itself is .fia-fade-right in index.css.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** Within this many pixels of the end, the row counts as scrolled to it. */
const END_SLACK = 2;

export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [faded, setFaded] = useState(false);
  const update = useCallback(() => {
    const el = ref.current;
    if (el) setFaded(el.scrollLeft + el.clientWidth < el.scrollWidth - END_SLACK);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [update]);
  return { ref, faded };
}
