import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DESKTOP, MOBILE } from './weave/config';
import { buildWeave, fitComposition, type Fit } from './weave/geometry';
import { useAnimationGate } from './weave/useAnimationGate';
import { WeaveSvg } from './weave/WeaveSvg';

/** The hero's copy, exactly as the PRD gives it (docs/hero-weave-prd.md §1). */
const HERO_COPY = {
  title: ['Spreading intelligence.', 'Rebuilding manufacturing.'],
  subline: 'Exploring how to accelerate both.',
} as const;

/**
 * The palette (PRD §2), defined on the hero's root. Dark values follow the
 * site's own dark-mode mechanism, Tailwind's `dark:` variant on the `dark`
 * class (tailwind.config.ts). The site is light only (docs/DECISIONS.md,
 * 2026-10-09) and nothing sets that class yet, so the dark values wait for it.
 */
const TOKENS =
  '[--hero-bg:#F4F1EA] [--hero-ink:#1E2761] [--hero-accent:#C2694A] [--hero-accent-fiber:#D98B6E] [--hero-link:#0070C0] ' +
  'dark:[--hero-bg:#12162B] dark:[--hero-ink:#E8E4DA] dark:[--hero-accent:#D27C5C] dark:[--hero-accent-fiber:#E39A7E] dark:[--hero-link:#4FA3E0]';

const MOBILE_QUERY = '(max-width: 639.98px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

/** Clear space between the headline and the nearest thread, in CSS pixels. */
const GAP = { desktop: 40, tablet: 28 } as const;
/**
 * The share of the woven width that may run past the right edge before the
 * composition is scaled down instead: the cloth bleeds off the edge anyway,
 * and a little more of it bleeding keeps it large beside a wide headline.
 */
const MAX_CROP = 0.1;

/** Not yet measured (the first render, or no layout at all, as in jsdom). */
const UNMEASURED = 'unmeasured' as const;

/**
 * The homepage hero (docs/hero-weave-prd.md): the thesis on the left, a woven
 * cloth on the right, intelligence (navy warp) and manufacturing (terracotta
 * weft) as two equal forces that become one cloth.
 *
 * From 640px the 1600 × 900 composition sits behind the headline, anchored
 * bottom-right. The PRD places the headline in 45% of the width (60% on a
 * tablet), but at its specified size its second line alone is about 13em,
 * some 58% of the width at 4.5vw, so the block is as wide as its two lines
 * and the composition is fitted to it instead: as large as the hero allows,
 * running a little past the right edge if it must, and scaled down before
 * any thread reaches the text (fitComposition). The warps are drawn on above
 * the canvas, so they still enter from the hero's top edge when the
 * composition is smaller than the hero. Under 640px the text sits at the top
 * and a separate 900 × 900 composition, the woven corner and short loose
 * ends, sits below it.
 */
export function WeaveHero() {
  const mobile = useMediaQuery(MOBILE_QUERY);
  const desktop = useMediaQuery(DESKTOP_QUERY, true);
  const root = useRef<HTMLElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const running = useAnimationGate(root);
  const [placed, setPlaced] = useState<Placement | typeof UNMEASURED>(UNMEASURED);

  const composition = mobile ? MOBILE : DESKTOP;
  // Drawn with the full extension, the weave's keep-out is the strictest one,
  // so the fit made from it holds for any shorter extension.
  const full = useMemo(() => buildWeave(composition), [composition]);

  useLayoutEffect(() => {
    const hero = root.current;
    const block = text.current;
    if (mobile || !hero || !block) return;
    let live = true;
    const measure = () => {
      if (!live) return;
      const h = hero.getBoundingClientRect();
      const b = block.getBoundingClientRect();
      if (h.width === 0 || h.height === 0) return;
      const next = fitComposition(full, {
        width: h.width,
        height: h.height,
        textRight: b.right - h.left,
        textBottom: b.bottom - h.top,
        gap: desktop ? GAP.desktop : GAP.tablet,
        maxCrop: MAX_CROP,
      });
      setPlaced((prev) => (samePlacement(prev, next, h.height) ? prev : { fit: next, height: h.height }));
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(hero);
    ro?.observe(block);
    // The headline's face arriving after the first paint changes its width.
    document.fonts?.ready.then(measure);
    return () => {
      live = false;
      ro?.disconnect();
    };
  }, [mobile, desktop, full]);

  // The warps are drawn up to the hero's top edge (with a little to spare), and no further.
  const fit = mobile || placed === UNMEASURED ? UNMEASURED : placed.fit;
  const extendAbove =
    fit !== UNMEASURED && fit && placed !== UNMEASURED
      ? Math.ceil((placed.height / fit.scale - DESKTOP.height + 40) / 100) * 100
      : composition.warp.extendAbove;
  const weave = useMemo(
    () => (extendAbove === composition.warp.extendAbove ? full : buildWeave(composition, { extendAbove })),
    [composition, extendAbove, full],
  );

  const side = !mobile;
  let svgStyle: CSSProperties | undefined;
  if (side && fit !== UNMEASURED) {
    svgStyle = fit
      ? { right: -fit.shift, width: DESKTOP.width * fit.scale, height: DESKTOP.height * fit.scale }
      : { display: 'none' };
  }

  return (
    <section
      ref={root}
      aria-labelledby="weave-hero-title"
      data-layout={side ? 'side' : 'stacked'}
      data-motion={running ? 'running' : 'still'}
      className={`weave-hero relative isolate overflow-hidden bg-[var(--hero-bg)] text-[color:var(--hero-ink)] ${TOKENS} ${
        side ? 'h-[min(90vh,900px)]' : 'flex min-h-[min(90vh,900px)] flex-col'
      }`}
    >
      <div
        ref={text}
        className={side ? 'absolute left-[8%] top-[22%] z-10 w-max' : 'container relative z-10 pb-8 pt-12'}
      >
        <h1
          id="weave-hero-title"
          className="font-hero text-[clamp(2.25rem,4.5vw,4rem)] font-medium leading-[1.1] text-[color:var(--hero-ink)]"
        >
          {/* Two lines, broken after the first full stop; the space keeps the
              accessible name and a copied selection one sentence apart. */}
          <span className={side ? 'block whitespace-nowrap' : 'block'}>{HERO_COPY.title[0]}</span>{' '}
          <span className={side ? 'block whitespace-nowrap' : 'block'}>{HERO_COPY.title[1]}</span>
        </h1>
        <p className="mt-6 font-sans text-[clamp(1rem,1.4vw,1.25rem)] leading-normal opacity-70">{HERO_COPY.subline}</p>
      </div>

      <WeaveSvg
        weave={weave}
        running={running}
        className={
          side
            ? 'pointer-events-none absolute bottom-0 right-0 h-full w-full overflow-visible'
            : 'pointer-events-none mt-auto block aspect-square w-full'
        }
        style={svgStyle}
      />
    </section>
  );
}

/** Where the composition sits, and the hero height it was fitted to. */
interface Placement {
  fit: Fit | null;
  height: number;
}

function samePlacement(a: Placement | typeof UNMEASURED, b: Fit | null, height: number): boolean {
  if (a === UNMEASURED || Math.abs(a.height - height) >= 0.5) return false;
  if (a.fit === null || b === null) return a.fit === b;
  return Math.abs(a.fit.scale - b.scale) < 1e-4 && Math.abs(a.fit.shift - b.shift) < 0.5;
}
