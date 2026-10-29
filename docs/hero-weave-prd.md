# Weave Hero — PRD, Design & Architecture

Home page hero for dikagustiana.com. Phase 1.

Reference image: `docs/hero-reference.png`

---

## 1. PRD

### Goal

Replace the current Home hero with a thesis-led hero: headline text on the left, an animated woven-thread illustration on the right. Intelligence (navy warp) and manufacturing (terracotta weft) are drawn as two equal forces that become one cloth.

### Copy (exact)

- **H1:** `Spreading intelligence. Rebuilding manufacturing.`
- **Subline:** `Exploring how to accelerate both.`

### In scope (Phase 1)

- New hero component on Home only
- Procedurally drawn SVG weave matching `docs/hero-reference.png` in composition (not traced)
- Gentle wave motion on loose thread ends; woven area static
- Light and dark theme
- Responsive: desktop, tablet, mobile
- Reduced-motion support

### Out of scope

- Scroll-driven tightening (Phase 2, separate PR)
- Changes to nav, other pages, admin, or authoring
- Any copy beyond the two lines above

### Acceptance criteria

1. The headline is real text (H1), selectable, and readable without JS.
2. The first frame renders a complete static weave before any animation starts.
3. Loose threads move continuously; the woven region does not move; there is no visible seam where the motion stops.
4. Over-under alternation is visually correct at every crossing.
5. With `prefers-reduced-motion: reduce`, the weave is fully static.
6. Animation pauses when the hero is off-screen or the tab is hidden.
7. Steady 60fps on a mid-range laptop. No new runtime dependency over 10KB gzipped.
8. No horizontal scroll at 360px width. Text never overlaps threads at any breakpoint.
9. Lighthouse performance and accessibility scores on Home do not drop compared with the current build.

---

## 2. Design

### Palette (tokens)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--hero-bg` | `#F4F1EA` | `#12162B` | Background |
| `--hero-ink` | `#1E2761` | `#E8E4DA` | Text, warp threads, nodes |
| `--hero-accent` | `#C2694A` | `#D27C5C` | Weft threads |
| `--hero-accent-fiber` | `#D98B6E` | `#E39A7E` | Weft fibre texture |
| `--hero-link` | `#0070C0` | `#4FA3E0` | Links, interactive states |

### Typography

- **H1:** Source Serif 4, self-hosted via `@fontsource`, weight 500, `clamp(2.25rem, 4.5vw, 4rem)`, line-height 1.1. Two lines, breaking after the first full stop.
- **Subline:** the site's existing sans-serif, `clamp(1rem, 1.4vw, 1.25rem)`, `--hero-ink` at 70% opacity, 1.5rem below the H1.

### Layout (desktop ≥1024px)

- Hero height: `min(90vh, 900px)`
- Text block: left 8%, top 22%, max-width 45%
- Weave: SVG with viewBox `0 0 1600 900`, `preserveAspectRatio="xMaxYMax slice"`, positioned behind the text and anchored bottom-right

### Illustration spec (viewBox units)

**Warp — intelligence**
- 14 navy threads entering from the top edge
- Base x ranges from 1000 to 1600, with spacing compressing toward the right (density gradient)
- Loose from y = 0 to y ≈ 470; woven from y ≈ 470 down to 900
- Stroke width 2.2
- 1–2 nodes per thread in the loose region: radius 4–6, mixed filled and hollow. Nodes move with their thread.

**Weft — manufacturing**
- 6 terracotta threads entering at x ≈ 240 (not from the canvas edge)
- Base y ranges from 480 to 880, with spacing compressing toward the bottom
- Loose from x = 240 to x ≈ 1020; woven to 1600
- Stroke width 7, plus an inner dashed stroke in `--hero-accent-fiber` to suggest twisted fibre

**Weave**
- Plain weave with strict over-under alternation
- Densest at the bottom-right corner, bleeding off the edge

**Loose-thread curvature**
- Gentle organic waviness
- Seeded, so the layout is identical on every load

### Motion

- Loose weft displaces vertically with amplitude 10; loose warp displaces horizontally with amplitude 8
- Displacement formula:

  ```
  offset = A · falloff(s) · sin(2π·t/T + φᵢ + k·s)
  ```

  - T = 10s
  - φᵢ = per-thread phase
  - k = spatial frequency, so each thread ripples rather than translating as a whole
- `falloff(s)` is a smoothstep from 1 at the free end to 0 at the weave entry, so there is no visible seam
- The woven region is static

### Responsive

| Breakpoint | Behaviour |
|---|---|
| Desktop ≥1024px | Layout as above |
| Tablet 640–1023px | Text block widens to 60%; weave scales down and shifts right |
| Mobile <640px | Text sits at the top. Below it, a separate composition (viewBox `0 0 900 900`) shows only the woven corner plus short loose ends. The weave is never cropped through its middle. |

---

## 3. Architecture

**Stack:** Vite, React 18, TypeScript, Tailwind, shadcn/ui; deployed on Vercel. No SSR, so there are no hydration concerns.

### File structure

```
src/components/hero/
  WeaveHero.tsx            # layout, copy, theme tokens, breakpoint switch
  weave/
    WeaveSvg.tsx           # renders paths; owns the rAF loop
    geometry.ts            # pure: seeded thread generation, crossings, segments
    motion.ts              # pure: displacement(t, s, thread), falloff
    rng.ts                 # small seeded PRNG (mulberry32)
    config.ts              # desktop + mobile composition constants
    useAnimationGate.ts    # reduced-motion + IntersectionObserver + visibilitychange
```

### Geometry approach

Each thread has two parts:
- a **loose segment**, recomputed every frame
- a **woven segment**, computed once and memoised

Over-under uses the knot-diagram technique:
1. Draw all woven warp segments.
2. Draw the woven weft over them.
3. At every crossing where the warp should be on top, redraw a short warp patch over the weft. Each patch first gets a `--hero-bg` stroke slightly wider than the thread, which creates the visible gap.

All crossing points and their over/under parity are precomputed in `geometry.ts`.

### Render loop

- One `requestAnimationFrame` loop in `WeaveSvg`
- Updates only the `d` attributes of loose-segment paths and node `cx`/`cy`, via refs. No React state per frame.
- Loose segments are sampled at about 24 points and smoothed with Catmull-Rom converted to cubic Bézier
- `useAnimationGate` stops the loop when:
  - reduced motion is on,
  - the hero is less than 10% visible, or
  - `document.hidden` is true

### Theming

The CSS variables are defined on the hero root. Dark values apply via the site's existing dark-mode mechanism; detect which one is in use and follow it.

### Performance

- 20 animated paths and fewer than 40 nodes
- No canvas, no animation library
- Font: preload only the Source Serif 4 weight that is used, with `font-display: swap`

### Testing

- **Unit:** `geometry.ts` (crossing parity alternates correctly), `motion.ts` (falloff is 0 at the weave entry)
- **Visual:** compare against `docs/hero-reference.png` at 1440, 1024, 768 and 375px widths, in light and dark mode

---

## 4. Phase 2 (not in this PR)

Scroll-driven tightening: as the visitor scrolls, the loose threads are drawn into the weave and the cloth tightens. Specified separately after Phase 1 is merged.
