import { useEffect, useState, type RefObject } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Whether the weave may move (docs/home-hero-v2.md R8, R9): not for a reader
 * who asked for reduced motion, not while the canvas is wholly off screen
 * (an IntersectionObserver at threshold 0), and not while the tab is hidden.
 * The render loop runs only while this is true; the weave holds where it was
 * when it stopped and goes on from there.
 *
 * Where IntersectionObserver does not exist the canvas counts as in view;
 * where matchMedia does not exist, motion counts as allowed.
 */
export function useAnimationGate(target: RefObject<Element>): boolean {
  const reduced = useMediaQuery(REDUCED_MOTION);
  const [inView, setInView] = useState(true);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const el = target.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return !reduced && inView && !hidden;
}
