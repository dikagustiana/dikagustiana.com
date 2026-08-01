/**
 * One definition of "did this reader ask for reduced motion".
 *
 * Checked at interaction time, never cached: DevTools emulation and the OS
 * setting both change it while the page is open. Note that with
 * `html { scroll-behavior: smooth }` gated behind
 * `prefers-reduced-motion: no-preference` in index.css, a JS caller that
 * wants a guaranteed jump must pass `behavior: 'instant'` — `'auto'` defers
 * to the computed scroll-behavior.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** The scroll behavior a reader actually asked for. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'instant' : 'smooth';
}
