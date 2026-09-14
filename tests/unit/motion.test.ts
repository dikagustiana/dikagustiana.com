import { describe, it, expect, afterEach } from 'vitest';
import { prefersReducedMotion, scrollBehavior } from '@/lib/motion';

/**
 * A `window` that exists does not imply a `window.matchMedia` that exists.
 * jsdom has none, and neither do some embedded browsers — so the site's one
 * definition of "did this reader ask for reduced motion" threw
 * `window.matchMedia is not a function` for every caller, including three that
 * ship on the landing page. It surfaced from inside a requestAnimationFrame,
 * after the test that scheduled it had already passed, so it failed the run as
 * an unhandled error rather than as a red test. Caught by CI.
 *
 * Each case builds its own precondition rather than trusting the environment
 * to supply one: whether a given jsdom carries a matchMedia is exactly the
 * thing under test, so a test that assumed either way would pass or fail for
 * the wrong reason.
 */
describe('prefersReducedMotion', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  const without = () => delete (window as { matchMedia?: unknown }).matchMedia;
  afterEach(() => {
    if (original) Object.defineProperty(window, 'matchMedia', original);
    else without();
  });

  it('does not throw where matchMedia does not exist', () => {
    without();
    expect(typeof window.matchMedia).not.toBe('function');
    expect(() => prefersReducedMotion()).not.toThrow();
    expect(() => scrollBehavior()).not.toThrow();
  });

  it('answers false there — unreadable is not the same as asked for', () => {
    without();
    expect(prefersReducedMotion()).toBe(false);
    // So the caller animates, exactly as it would for a reader who expressed
    // no preference. It must not silently opt everyone into reduced motion.
    expect(scrollBehavior()).toBe('smooth');
  });

  it('reads the query where matchMedia does exist', () => {
    const seen: string[] = [];
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => {
        seen.push(query);
        return { matches: true } as MediaQueryList;
      },
    });
    expect(prefersReducedMotion()).toBe(true);
    expect(scrollBehavior()).toBe('instant');
    expect(seen).toContain('(prefers-reduced-motion: reduce)');
  });

  it('is read at call time, never cached', () => {
    let matches = false;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches }) as MediaQueryList,
    });
    expect(scrollBehavior()).toBe('smooth');
    matches = true;
    expect(scrollBehavior()).toBe('instant');
  });
});
