# Weave Hero, Phase 1: verification

Spec: `docs/hero-weave-prd.md`. Decisions and deviations: `docs/DECISIONS.md`, 2026-10-29.

Every criterion below was checked in a real browser against the production bundle: `vite build`, served by
`vite preview`, in headless Chromium (build 1243), in a Linux container. Supabase was pointed at a dead
local URL, as the e2e suite does. The raw numbers are in `verification-results.json` beside this file;
the screenshots are in `screenshots/`.

## Acceptance criteria

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | The headline is a real `h1`, selectable, readable without JS | **Pass** | The page has one `main h1`, text "Spreading intelligence. Rebuilding manufacturing.", `user-select: auto`. A mouse drag across it selects exactly that sentence. With JavaScript disabled, the `<noscript>` block shows the same `h1` and subline in the hero's type (`screenshots/no-js-1440.png`). |
| 2 | The first frame is a complete static weave, before any animation | **Pass** | With `requestAnimationFrame` stubbed so that no frame ever runs, the page still draws 14 loose warps, 6 loose wefts (12 `<use>`), the 10 woven, gap and patch paths, and 22 nodes (`screenshots/first-frame-no-raf-1440.png`). Unit: `weaveHero.test.tsx`, "the first frame". |
| 3 | Loose threads move continuously; the woven region does not; no seam | **Pass** | 3,840 attribute writes per second, i.e. 64 per frame at 60 fps (20 `d`, 22 × `cx`/`cy`). Between two screenshots 2.4 s apart, 0 of 322,340 pixels changed in the woven region and 57,773 of 486,360 changed among the loose wefts. Seam scan at four moments: 0 background pixels on the centre line of 11 warps through their weave entry, and 0 along 6 wefts through theirs (x = 990). Unit: `falloff` is 0 at the entry and flat there (`weaveMotion.test.ts`); the loose point equals the entry at every moment and leaves it along the woven line (`weaveGeometry.test.ts`). |
| 4 | Over-under alternates correctly at every crossing | **Pass** | Pixel check at all 66 crossings visible at 1440 × 900: 66 correct (navy where the warp is over, terracotta where the weft is over). Unit: the parity alternates along every warp and every weft, and a patch sits at exactly the warp-over crossings, on both compositions. |
| 5 | Reduced motion: fully static | **Pass** | `prefers-reduced-motion: reduce`: `data-motion="still"`, 0 attribute writes in 2 s, and two screenshots 1.5 s apart are byte-identical. Unit: no frame is ever requested. |
| 6 | Pauses off-screen or in a hidden tab | **Pass** | Running: 2,304 writes in 600 ms. With 5% of the hero in view: still, 0 writes. With 15% in view: running again. With the tab reported hidden (`visibilitychange`): still, 0 writes. Visible again: running. |
| 7 | Steady 60 fps on a mid-range laptop; no new runtime dependency over 10 KB gzipped | **Pass, with a note** | 300 frames at 60.2 fps (p95 16.7 ms, none over 20 ms). Under a 4× CPU slowdown: 59.9 fps, 1 frame over 20 ms. At 4×, all main-thread work is 472 ms per second (about 7.9 ms a frame against a 16.7 ms budget); script is 157 ms per second. This is a container CPU slowed 4× as a stand-in, not a physical mid-range laptop. No JavaScript dependency was added: the hero's own code adds 4.4 KB gzipped to the homepage chunk (59.80 → 64.21 KB). The one new package is `@fontsource/source-serif-4`, which the PRD itself specifies. It ships a 21.5 KB woff2 (one weight, latin) and a 300-byte `@font-face`. If the 10 KB budget is meant to cover fonts, that file is over it. |
| 8 | No sideways scroll at 360px; text never overlaps threads | **Pass** | At 360 × 740, `scrollWidth` is 360. Across 21 viewports from 360 × 740 to 2560 × 1440, short and tall, every point of every path and node was sampled at four moments of the motion. The smallest gap between text and any thread's stroke was **29 px**, at 640 × 900; 60.6 px at 1440 × 900. No viewport scrolled sideways. |
| 9 | Lighthouse performance and accessibility on Home do not drop | **Pass** | Three runs each, before (main @ `b7e9f4b`) and after, under the same conditions. Mobile performance 79 / 81 / 81 before and 81 / 81 / 80 after (median 81 both times). Desktop 99 before and after. Accessibility 98 before and after. CLS 0.011 → 0 on mobile and 0.001 → 0 on desktop. The one accessibility audit that fails, `heading-order` (an `h4` in the map and one in the footer), failed before too. The LCP element is now the hero's headline. |

## Visual check: 1440, 1024, 768 and 375, light and dark

`screenshots/hero-{light,dark}-{1440,1024,768,375}.png`. Dark mode was set by adding the site's `dark`
class by hand. The site is light only, so readers do not see the dark hero (DECISIONS).

- **1440 × 900.** Two lines at 64px. The composition is drawn at 0.84 px per unit (the hero's own scale is
  0.9) and runs 50 px past the right edge, so 11 of the 14 warps show (the last three, x ≥ 1552, run off
  the edge with the cloth), their spacing tightening to the right. Loose warps
  come from the top edge with their nodes; loose wefts start near x ≈ 240, below the subline.
- **1024 × 768.** Two lines at 46px; scale 0.56. Same arrangement, smaller.
- **768 × 1024.** Tablet. Two lines at the 36px floor. The composition is scaled to 0.40 and shifted right.
  The warps run from the top edge down a column right of the text into a small cloth in the corner. It is
  the weakest composition of the four, as "scales down and shifts right" makes it.
- **375 × 812.** Mobile. The text is at the top; the headline wraps to four lines, since at 36px two do
  not fit a phone. Below it is the 900 × 900 composition: the woven corner and short loose ends. Nothing
  is cropped through the cloth's middle.

**Not done: comparison with `docs/hero-reference.png`.** That image was neither in the repository nor in
the brief. The composition follows the written illustration spec only.

## Checks run

- `npx eslint . --max-warnings=35`: 0 errors, 22 warnings, none in the new files.
- `npm run typecheck`: clean.
- `npx vitest run`: 1,695 passed. `assert-test-count`: floor 1,691.
- `npm run check:world`, `npm run build`, and both Python suites: green.
- Playwright, default config: two full runs, 116 and 117 of 119 passing. `books.spec.ts:71` failed in
  both, and fails the same way on `main`. Two tests failed once each under full parallel load, a different
  one per run, and pass when run alone, on this branch and on `main`. `fsli.spec.ts:218` passed 2 of 2
  on the branch and passed on `main`. `glimpse.spec.ts:593` (reduced motion) passed 5 of 5 at each width
  on the branch and on `main`; it reads the row's transform one frame after a click.
- Playwright, world config: the three failures (`world.spec.ts:68`, `:184`, `:321`) fail identically on
  `main`.
- The repo pins `@playwright/test` 1.56.1, whose browser is not installed in this container. The suites
  ran through a config outside the repo that points at the installed Chromium. The repo's config is
  unchanged.
