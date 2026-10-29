import { useEffect, useState, type RefObject } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/** Below this share of the hero in view, the weave holds still (docs/hero-weave-prd.md §3). */
export const MIN_VISIBLE = 0.1;

/**
 * Whether the weave may move: not for a reader who asked for reduced motion,
 * not while less than a tenth of the hero is on screen, and not while the tab
 * is hidden. The render loop runs only while this is true; the threads stay
 * where they were when it stopped and go on from there.
 *
 * Where IntersectionObserver does not exist the hero counts as in view; where
 * matchMedia does not exist, motion counts as allowed.
 */
export function useAnimationGate(target: RefObject<Element>): boolean {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [inView, setInView] = useState(true);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const el = target.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= MIN_VISIBLE),
      { threshold: [0, MIN_VISIBLE] },
    );
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
