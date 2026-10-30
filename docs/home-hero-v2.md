# Home Hero v2 — dikagustiana.com

PRD · Design Spec · Architecture · Plan · Claude Code Prompt

**Assumptions**
- Weave uses equal pitch for warp and weft (square cells); thread counts derive from region size.
- CTA buttons, proof/stats strip and eyebrow/byline are not confirmed and are out of scope.

---

## 1. PRD

### Objective
Make the homepage hero feel full and intentional, make the Glimpse section visible without scrolling, and turn the weave illustration into a living element.

### In scope
1. Copy update (headline + subtitle).
2. Hero height reduction so Glimpse peeks above the fold.
3. Background gradient: header navy melts into hero cream; hero cream fades into Glimpse background (no hard seams).
4. Weave rebuilt on a square grid (equal pitch warp/weft), denser.
5. Weave motion: one-time intro, then subtle continuous idle.

### Out of scope
CTA buttons, proof/stats strip, eyebrow/byline, nav changes, Glimpse carousel changes, any other page.

### Requirements

| ID | Requirement |
|---|---|
| R1 | Headline: "Spreading intelligence. Rebuilding industry." — two lines, one sentence per line. |
| R2 | Subtitle: "Exploring how to accelerate both — and what it takes for Indonesia to industrialise again." |
| R3 | On load (no scroll), Glimpse heading + card category labels visible at 1366×657 viewport; full card titles visible at 1920×960. |
| R4 | No visible edge between header and hero, or between hero and Glimpse. |
| R5 | Headline never overlaps the dark part of the top gradient band (min contrast 7:1 against its actual background). |
| R6 | Weave cells are square: warp pitch = weft pitch. Thread counts derive from region size. |
| R7 | Intro animation plays once per page load (~2.5s); idle motion loops indefinitely after. |
| R8 | `prefers-reduced-motion: reduce` → final static frame, no intro, no idle. |
| R9 | Animation pauses when hero is offscreen or tab is hidden. |
| R10 | No Lighthouse performance regression >3 points on Home (mobile + desktop); no layout shift (CLS Δ = 0). |
| R11 | Weave is decorative: `aria-hidden`, not focusable. |

### Acceptance
- Screenshots at 1920×960, 1366×657, 390×844 showing R1–R6.
- Screen recording of the first 12s showing R7.
- Reduced-motion screenshot showing R8.
- Lighthouse before/after table showing R10.

---

## 2. Design Spec

### Color tokens
Read real values from the codebase; do not hardcode new ones.

| Token | Use |
|---|---|
| `--header-bg` | Existing nav background |
| `--hero-cream` | Existing hero background (current cream) |
| `--glimpse-bg` | Existing Glimpse section background |
| `--warp` | Existing navy thread color |
| `--weft` | Existing orange thread color |

### Background gradient (A+B)

```css
background: linear-gradient(180deg,
  var(--header-bg) 0px,
  var(--hero-cream) 110px,
  var(--hero-cream) 80%,
  var(--glimpse-bg) 100%);
```

- Remove any border/shadow/divider on the nav bottom and Glimpse top.
- Glimpse section background must equal `--glimpse-bg` exactly.

### Hero sizing

```css
height: clamp(440px, calc(100svh - var(--nav-h) - 240px), 760px);
```

- 240px = Glimpse peek budget.
- Headline block starts ≥130px from hero top (clears the navy band).
- Text block max-width: 52% of hero on desktop.

### Typography

| Element | Spec |
|---|---|
| Headline | Same serif, `clamp(2.75rem, 5.2vw, 5.25rem)` (≈10–15% smaller than now), line-height 1.05 |
| Subtitle | Same sans, `clamp(1.125rem, 1.4vw, 1.5rem)`, color `--warp` at 70% opacity, max-width 36ch, margin-top 1.5rem |

### Weave layout (desktop ≥1024px)

| Parameter | Value |
|---|---|
| Pitch `P` | `clamp(52px, 3.4vw, 68px)` — identical for warp and weft |
| Woven region | x: 60% → 100% of hero width; y: (top band + 1P) → hero bottom |
| Warp count | `floor(wovenW / P) + 1` |
| Weft count | `floor(wovenH / P)` |
| Warp free zone | Above woven region: wavy, carries nodes |
| Weft free zone | x 22% → 60%: wavy, tapering in from the left |
| Weft under text | Any weft segment whose bbox intersects the text block renders at 35% opacity, 120px leftward gradient fade |
| Over/under | `(i + j) % 2` — even: warp on top, odd: weft on top |
| Stroke | Warp 2px solid; weft 5px with existing dashed inner highlight |
| Nodes | 1–2 per warp thread in free zone; 50/50 solid/hollow; radius 5–7px |

### Mobile (<768px)
- Text on top.
- Weave occupies the bottom 38% of hero, full width, pitch 40px.
- No weft free zone (fully woven).
- Idle amplitude halved.

### Motion

| Phase | Spec |
|---|---|
| Intro 0–1.2s | Warp threads draw top→down, 35ms stagger left→right, easeOutCubic |
| Intro 1.0–2.5s | Weft threads extend left→right, 80ms stagger top→down, easeOutCubic; over/under correct while drawing |
| Intro 2.0–2.6s | Nodes fade + scale in (0.6 → 1) |
| Idle | Shared displacement field so crossings stay coherent: warp x-offset `A·sin(2πt/T + φᵢ + k·y)`; weft y-offset `A·sin(2πt/T' + φⱼ + k·x)` |
| Idle params | A = 3px desktop / 1.5px mobile; T, T' random per thread ∈ [6s, 10s]; k = 0.004; φ random |
| Idle nodes | Drift along their warp thread at 4–8 px/s, ping-pong within the free zone; never enter the woven region |

---

## 3. Architecture

### Component structure
Stack: Vite + React 18 + TS + Tailwind + shadcn/ui. Adapt names to existing files.

```
src/components/home/
  HomeHero.tsx        // layout, copy, gradient, sizing; renders <HeroWeave/>
  HeroWeave.tsx       // canvas host: sizing, observers, lifecycle
  weave/
    geometry.ts       // pure: (width, height, textRect, breakpoint) -> WeaveModel
    animate.ts        // pure: (model, t, phase) -> per-thread sampled points
    render.ts         // canvas draw: warp, weft, over/under, nodes
    constants.ts      // pitch, amplitudes, timings
```

### Rendering
- Single `<canvas>`, absolutely positioned behind hero content; `aria-hidden="true"`, `pointer-events: none`.
- DPR capped at 2.
- Curves sampled every 8px, drawn as polylines (optional quadratic smoothing).
- Over/under: draw all warp → all weft → redraw short warp segments (±P/3) at crossings where warp is on top.
- Rationale: ~30 paths deformed per frame is cheaper in canvas than rewriting SVG `d` attributes per frame. If the current weave is SVG, migrate.

### Lifecycle
- `ResizeObserver` on hero (debounced 150ms) → rebuild model; pass the text block's `getBoundingClientRect()` for the under-text fade.
- `IntersectionObserver` (threshold 0) + `visibilitychange` → start/stop the `requestAnimationFrame` loop.
- `matchMedia('(prefers-reduced-motion: reduce)')` listener → swap to static final frame.
- Intro-completed flag in component state only (not storage); intro replays on each full page load.

### Performance budget
- <2ms scripting per frame on a mid laptop.
- No allocations inside the frame loop; preallocate point buffers.

---

## 4. Plan

| Phase | Work | Gate |
|---|---|---|
| 0 | Audit: locate hero + weave implementation, tokens, nav height, Glimpse bg; baseline Lighthouse + screenshots | **Stop: report findings + full proposed diff** |
| 1 | Copy, typography, hero sizing, gradient, seam removal | — |
| 2 | Weave geometry on square grid (static), mobile layout, under-text fade | — |
| 3 | Intro + idle motion, nodes drift | — |
| 4 | Reduced-motion, observers, DPR cap, perf pass | — |
| 5 | QA: screenshots, recording, Lighthouse before/after, checklist vs R1–R11 | **Stop: report; no commit/push until approved** |

---

## 5. Claude Code Prompt

```
Task: Home Hero v2 for dikagustiana.com (Vite + React 18 + TS + Tailwind + shadcn/ui).
Rules: do NOT edit files until I approve the proposed diff. Do NOT commit or push without my approval.
Out of scope: CTA buttons, stats strip, eyebrow/byline, nav, Glimpse carousel, any other page.

PHASE 0 — AUDIT (then stop)
- Locate the homepage hero component and the current weave illustration (SVG or canvas? file paths?).
- Find existing tokens/values for: nav background, nav height, hero cream background, Glimpse section background, navy thread color, orange thread color, headline/subtitle fonts.
- Baseline: Lighthouse (mobile + desktop) on Home, screenshots at 1920x960, 1366x657, 390x844.
- Report findings + a full proposed diff for phases 1–4. Wait for my approval.

PHASE 1 — COPY, SIZING, GRADIENT
- Headline (2 lines): "Spreading intelligence." / "Rebuilding industry."
- Subtitle: "Exploring how to accelerate both — and what it takes for Indonesia to industrialise again."
- Headline size: clamp(2.75rem, 5.2vw, 5.25rem), line-height 1.05.
- Subtitle: clamp(1.125rem, 1.4vw, 1.5rem), navy thread color at 70% opacity, max-width 36ch, margin-top 1.5rem.
- Hero height: clamp(440px, calc(100svh - var(--nav-h) - 240px), 760px). Define --nav-h from the real nav height.
- Headline block starts >=130px from hero top; text block max 52% width on desktop.
- Hero background: linear-gradient(180deg, <nav bg> 0px, <hero cream> 110px, <hero cream> 80%, <Glimpse bg> 100%), using existing tokens.
- Remove any border/shadow/divider at nav bottom and Glimpse top. Glimpse bg must equal the gradient end color exactly.

PHASE 2 — WEAVE GEOMETRY (static)
- Rebuild the weave as a single <canvas> behind hero content: aria-hidden, pointer-events none, DPR capped at 2.
- Structure: HomeHero.tsx, HeroWeave.tsx, weave/geometry.ts, weave/animate.ts, weave/render.ts, weave/constants.ts (geometry and animate are pure functions).
- Square grid: pitch P = clamp(52px, 3.4vw, 68px), identical for warp (navy, vertical) and weft (orange, horizontal).
- Woven region: x 60%–100% of hero width; y from (110px + P) to hero bottom. Warp count = floor(wovenW/P)+1, weft count = floor(wovenH/P).
- Warp free zone above the woven region: wavy, carrying 1–2 nodes per thread (50/50 solid/hollow, radius 5–7px).
- Weft free zone x 22%–60%: wavy, tapering in from the left.
- Weft segments intersecting the text block bbox: 35% opacity with a 120px leftward gradient fade.
- Over/under by (i+j)%2: draw warp, then weft, then redraw short warp segments (±P/3) where warp is on top.
- Strokes: warp 2px; weft 5px keeping the existing dashed inner highlight style.
- Mobile <768px: weave in the bottom 38% of hero, full width, pitch 40px, no weft free zone.

PHASE 3 — MOTION
- Intro (once per page load):
  0–1.2s warp draws top→down, 35ms stagger left→right, easeOutCubic;
  1.0–2.5s weft extends left→right, 80ms stagger top→down, easeOutCubic, over/under correct while drawing;
  2.0–2.6s nodes fade + scale 0.6→1.
- Idle (loop forever), shared displacement field so crossings stay coherent:
  warp x-offset = A*sin(2πt/T + φi + k*y); weft y-offset = A*sin(2πt/T' + φj + k*x);
  A = 3px desktop / 1.5px mobile; T, T' random per thread in [6s, 10s]; k = 0.004; φ random.
- Nodes drift along their warp thread at 4–8 px/s, ping-pong inside the free zone only.
- Sample curves every 8px; preallocate buffers; no allocations in the frame loop.

PHASE 4 — GUARDS
- prefers-reduced-motion: render the final static frame, no intro, no idle; listen for changes.
- IntersectionObserver + visibilitychange start/stop the rAF loop.
- ResizeObserver (debounced 150ms) rebuilds geometry using the text block's bounding rect.
- Budget: <2ms scripting per frame on a mid laptop.

PHASE 5 — QA (then stop)
- Screenshots at 1920x960, 1366x657, 390x844 (above the fold, no scroll).
- Verify: at 1366x657, Glimpse heading + card category labels visible; at 1920x960, full card titles visible.
- No visible seam nav→hero or hero→Glimpse; headline contrast >=7:1 against its actual background.
- Square weave cells (warp pitch == weft pitch); measure and report.
- Record the first 12s of page load (intro + idle). Screenshot with reduced motion on.
- Lighthouse before/after table (mobile + desktop): perf regression <=3 points, CLS unchanged.
- Report a checklist against all items above. Do not commit until I approve.
```
