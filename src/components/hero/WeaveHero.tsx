import { useRef, type CSSProperties } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { HeroWeave } from './HeroWeave';
import { BAND } from './weave/constants';

/** The hero's copy (docs/home-hero-v2.md R1, R2). */
const HERO_COPY = {
  title: ['Spreading intelligence.', 'Rebuilding industry.'],
  subline: 'Exploring how to accelerate both — and what it takes for Indonesia to industrialise again.',
} as const;

/**
 * The palette (docs/hero-weave-prd.md §2), defined on the hero's root. Dark
 * values follow the site's own dark-mode mechanism, Tailwind's `dark:`
 * variant on the `dark` class (tailwind.config.ts). The site is light only
 * (docs/DECISIONS.md, 2026-10-09) and nothing sets that class yet, so the dark
 * values wait for it.
 */
const TOKENS =
  '[--hero-bg:#F4F1EA] [--hero-ink:#1E2761] [--hero-accent:#C2694A] [--hero-accent-fiber:#D98B6E] [--hero-link:#0070C0] ' +
  'dark:[--hero-bg:#12162B] dark:[--hero-ink:#E8E4DA] dark:[--hero-accent:#D27C5C] dark:[--hero-accent-fiber:#E39A7E] dark:[--hero-link:#4FA3E0]';

/**
 * The hero's height (§2 "Hero sizing"): what is left of the screen under the
 * header once the Glimpse has its 240px, between 440 and 760px. --nav-h is
 * the header's own height, 64px and its 1px rule (Header.tsx). Small
 * viewport units where the browser has them, so a phone's toolbar never
 * pushes the Glimpse out of view; plain vh where it does not.
 */
const SIZING =
  '[--nav-h:65px] [--hero-h:clamp(440px,calc(100vh_-_var(--nav-h)_-_240px),760px)] ' +
  'supports-[height:100svh]:[--hero-h:clamp(440px,calc(100svh_-_var(--nav-h)_-_240px),760px)]';

/**
 * The background (§2 "Background gradient"): the header's navy melts into
 * the hero's cream over the top 110px, and the cream into the Glimpse's
 * background, the page's own, over the last fifth. No rule at either edge.
 */
const BACKGROUND: CSSProperties = {
  backgroundImage: `linear-gradient(180deg, hsl(var(--header-bg)) 0px, var(--hero-bg) ${BAND}px, var(--hero-bg) 80%, hsl(var(--background)) 100%)`,
};

/**
 * The headline's size (§2 "Typography", R1): clamp(2.75rem, 5.2vw, 5.25rem),
 * but never wider than its block lets one sentence sit on one line. The
 * longer sentence, "Spreading intelligence.", is 10.45em in Source Serif 4
 * at the headings' tracking; 10.6 leaves a hair. On a desktop the block is
 * 52% of the hero; on a phone it is the width less the container's 2rem
 * each side, so at 390px the two sentences still take a line each.
 */
const H1_SIZE = 'text-[length:clamp(2.75rem,5.2vw,5.25rem)]';
const H1_FIT = {
  desktop: 'supports-[width:1cqi]:text-[length:min(clamp(2.75rem,5.2vw,5.25rem),calc(52cqi_/_10.6))]',
  mobile: 'supports-[width:1cqi]:text-[length:min(clamp(2.75rem,5.2vw,5.25rem),calc((100cqi_-_4rem)_/_10.6))]',
} as const;

const MOBILE_QUERY = '(max-width: 767.98px)';

/**
 * The homepage hero, v2 (docs/home-hero-v2.md): the thesis in two lines and
 * one sentence of scope, over a woven cloth drawn on a canvas, intelligence
 * (navy warp) and industry (terracotta weft) becoming one.
 *
 * From 768px the text sits 130px down, clear of the navy band, in at most
 * 52% of the width, and the weave fills the hero behind it; no thread runs
 * under a line of text. Under 768px the text comes first and the weave is a
 * block in the hero's bottom 38%, woven but for a short fringe of warp at
 * its top where the nodes run; if the text needs more room, the hero grows
 * rather than let them meet.
 */
export function WeaveHero() {
  const mobile = useMediaQuery(MOBILE_QUERY);
  const text = useRef<HTMLDivElement>(null);

  return (
    <section
      aria-labelledby="weave-hero-title"
      data-layout={mobile ? 'stacked' : 'side'}
      style={BACKGROUND}
      className={`weave-hero relative isolate overflow-hidden text-[color:var(--hero-ink)] [container-type:inline-size] ${TOKENS} ${SIZING} ${
        mobile ? 'flex min-h-[var(--hero-h)] flex-col' : 'h-[var(--hero-h)]'
      }`}
    >
      <div
        ref={text}
        className={mobile ? 'container relative z-10 pb-6 pt-[130px]' : 'absolute left-[6%] top-[130px] z-10 max-w-[52%]'}
      >
        <h1
          id="weave-hero-title"
          className={`font-hero font-medium leading-[1.05] text-[color:var(--hero-ink)] ${H1_SIZE} ${mobile ? H1_FIT.mobile : H1_FIT.desktop}`}
        >
          {/* One sentence a line; the space keeps the accessible name and a
              copied selection two sentences, not one run-on word. */}
          <span className="block whitespace-nowrap">{HERO_COPY.title[0]}</span>{' '}
          <span className="block whitespace-nowrap">{HERO_COPY.title[1]}</span>
        </h1>
        <p className="mt-6 max-w-[36ch] font-sans text-[length:clamp(1.125rem,1.4vw,1.5rem)] leading-normal opacity-70">
          {HERO_COPY.subline}
        </p>
      </div>

      {mobile ? (
        <div className="relative mt-auto h-[calc(var(--hero-h)*0.38)] shrink-0">
          <HeroWeave mobile textRef={text} className="pointer-events-none absolute inset-0 block h-full w-full" />
        </div>
      ) : (
        <HeroWeave mobile={false} textRef={text} className="pointer-events-none absolute inset-0 block h-full w-full" />
      )}
    </section>
  );
}
