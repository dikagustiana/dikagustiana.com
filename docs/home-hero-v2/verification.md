# Home Hero v2: verification

Spec: `docs/home-hero-v2.md`. Decisions and deviations: `docs/DECISIONS.md`, 2026-10-30.

Every check ran in a real browser against the production bundle: `vite build`, served by `vite preview`,
in headless Chromium (build 1243), in a Linux container. Supabase was replaced by a local stand-in that
serves eight published essays, so the Glimpse draws real cards. The "before" build is `main` at `1ae9a57`
(the v1 hero, without the map). Raw numbers are in `verification-results.json` and `frame-cost.txt`;
screenshots are in `screenshots/`.

## Requirements

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| R1 | Headline in two lines, one sentence per line | **Pass** | Each sentence has exactly one line box at 1920×960, 1366×657 and 390×844. |
| R2 | Subtitle copy | **Pass** | Text matches exactly. It is 70% opacity, `max-width` 36ch, 24px below the headline. Size is 24px at 1920 and 18px at 390, i.e. `clamp(1.125rem, 1.4vw, 1.5rem)`. |
| R3 | Glimpse peeks above the fold | **Pass** | At 1366×657 the hero is 440px tall. The Glimpse heading ends at 589px and 5 category labels end by 630px, all on screen. At 1920×960 all 5 card titles that fit across the width are fully on screen, ending by 960px. |
| R4 | No visible edge between header and hero, or hero and Glimpse | **Pass** | In a column with no thread, the largest colour step between neighbouring rows is 3/255 from header to hero, and 1/255 across the hero/Glimpse boundary. The row above the hero is (31, 41, 55), the header colour; the hero's first row is (32, 42, 56). The hero's last row equals the Glimpse's background (250, 250, 250). The header's own 1px rule is the header colour to within 1/255, so it shows no line. |
| R5 | Headline clear of the dark band; contrast ≥ 7:1 | **Pass** | The headline starts 130px below the hero top at every size. Measured against the pixels behind its top line, its lowest contrast is 12.26:1. |
| R6 | Square cells | **Pass** | Gaps were measured from the pixels of a still frame. At 1366, warp gaps are all 52px and weft gaps all 52px. At 390, both are 40px. At 1920 the pitch is 65.28px; gaps measure 65.0–65.5 (pixel rounding at 2× DPR). Unit tests check warp pitch equals weft pitch at every size. |
| R7 | Intro plays once (~2.5 s), then idle loops | **Pass** | `screenshots/intro-strip-1366x657.png` shows 0.3–2.5 s and 4 s. The warps draw first, then the wefts, then the nodes. Frames keep changing after the intro. The intro restarts on each page load, because its clock is the component's own state. A 12 s recording was handed over separately (not committed). |
| R8 | Reduced motion: final static frame | **Pass** | With `prefers-reduced-motion: reduce`, the full frame is painted on load, with nodes in. Two canvas snapshots 3 s apart are identical. See `screenshots/reduced-motion-1366x657.png`. |
| R9 | Pauses off screen and when the tab is hidden | **Pass** | Scrolled fully out of view: two snapshots 1.2 s apart are identical. Back in view: it moves. With the tab reported hidden it holds still, and it moves again when visible. |
| R10 | Lighthouse perf within 3 points; CLS Δ = 0 | **Perf pass; CLS pass on desktop, +0.001 on mobile** | See the table below. |
| R11 | Weave decorative, not focusable | **Pass** | The canvas has `aria-hidden="true"`, no tabindex, and `pointer-events: none`. 25 presses of Tab never reach it, and `focus()` leaves it unfocused. |

### Lighthouse (median of three, before → after)

| | Performance | Accessibility | CLS |
|---|---|---|---|
| Mobile | 83 → 83 | 100 → 100 | 0 → 0.001 |
| Desktop | 99 → 99 | 100 → 100 | 0.001 → 0.001 |

The hero adds no layout shift: it has a fixed height on a desktop, and the canvas is absolutely
positioned. The remaining 0.001 on mobile comes from the Glimpse. Its carousel shows the arrow buttons
first, then re-initialises as a loop and adds the pause button to their right, which moves the arrows
44px. That happened before too, below the fold, where it did not count; R3 now puts it on screen.

Two other Glimpse shifts that R3 exposed were fixed without any visual change:

- The heading row is now as tall as its buttons from the first paint (`min-h-9`).
- The editorial serif (Spectral 400 and 700) is preloaded with the hero's face, so card titles and
  decks no longer reflow when it arrives.

Removing the last 0.001 means changing when the carousel shows its buttons, and the spec puts carousel
changes out of scope. The proposed fix is a separate change.

### Frame cost (the hero's own callback only)

| CPU | Viewport | Mean | p95 | Frame rate |
|---|---|---|---|---|
| 1× | 1920×960 | 0.24 ms | 0.4 ms | 60 fps |
| 1× | 1366×657 | 0.19 ms | 0.3 ms | 60 fps |
| 4× slower | 1920×960 | 1.13 ms | 1.7 ms | 30 fps |
| 4× slower | 1366×657 | 0.77 ms | 1.5 ms | 52 fps |

The hero's scripting stays under the 2 ms budget even with the CPU slowed 4×. At 4× the page as a whole
drops below 60 fps at 1920. That is the container's software rendering of the canvas, plus the Glimpse
carousel's own loop. The 4× container is a stand-in, not a measured mid-range laptop. One loop runs per
hero; the second callback each frame is the carousel's.

## Screenshots

| | Before | After |
|---|---|---|
| 1920×960 | `screenshots/before-1920x960.png` | `screenshots/hero-v2-1920x960.png` |
| 1366×657 | `screenshots/before-1366x657.png` | `screenshots/hero-v2-1366x657.png` |
| 390×844 | `screenshots/before-390x844.png` | `screenshots/hero-v2-390x844.png` |

## Checks run

- `npx eslint . --max-warnings=35`: 0 errors, 22 warnings, none new.
- `npm run typecheck`: clean.
- `npx vitest run`: 1,710 passed. `assert-test-count` floor is 1,706.
- Playwright, default config: 96 of 97 pass. `books.spec.ts:71` fails the same way on `main`.
  `glimpse.spec.ts`'s reduced-motion test at 1440 fails now and then under full parallel load, as it
  does on `main`; it passed 8 of 8 repeated.
- Two `glimpse.spec.ts` tests now scroll the row itself into view, not just its heading. The hero
  leaves the heading in view on load, with the row's foot one pixel under the fold. Their
  `toBeInViewport({ ratio: 1 })` checks were failing at 0.9987.
- The suites ran through a config outside the repo that points at the installed Chromium, because the
  pinned 1.56.1 browser is not in this container.
