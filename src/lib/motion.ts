/**
 * One definition of "did this reader ask for reduced motion".
 *
 * Checked at interaction time, never cached: DevTools emulation and the OS
 * setting both change it while the page is open. Note that with
 * `html { scroll-behavior: smooth }` gated behind
 * `prefers-reduced-motion: no-preference` in index.css, a JS caller that
 * wants a guaranteed jump must pass `behavior: 'instant'` — `'auto'` defers
 * to the computed scroll-behavior.
 *
 * BOTH guards are load-bearing, and the second one was missing. A `window`
 * that exists does not imply a `window.matchMedia` that exists: jsdom has none,
 * and neither do some embedded browsers. `useMediaQuery` has always checked for
 * the function as well as the object (and its own comment names jsdom as the
 * case); this did not, so the first caller to reach it from inside a
 * requestAnimationFrame threw `window.matchMedia is not a function` where no
 * test could catch it — an unhandled rejection after the test that scheduled it
 * had already passed. Caught by CI, on this branch, at `ChainPlate.tsx`.
 *
 * Absent matchMedia means the preference cannot be read, which is not the same
 * as the reader having asked for reduced motion — so the answer is false and
 * the caller animates, exactly as it would for a reader who expressed no
 * preference.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** The scroll behavior a reader actually asked for. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'instant' : 'smooth';
}
