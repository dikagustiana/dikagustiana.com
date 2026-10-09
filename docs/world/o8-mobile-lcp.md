# O8: the landing page's mobile LCP with the world on

Branch `claude/world-mobile-lcp`, from `main` at `8b549d1` (PR #45), 9 October 2026. Gate 4 left
this open (`gate-4.md` §3.2 O8, `report.md` §4): with `VITE_WORLD_KAWASAN=true` the landing page's
mobile LCP was about 0.9 s worse than with the flag off. It is now level with the flag-off page.

## 1. What the trace showed

- **`vite preview` compresses.** Gate 4 and `report.md` §4 call the preview "without compression";
  Vite 5's preview server serves gzip. The 66.7 kB poster travelled as 7.4 kB, so its bytes were not
  the cause. Measured here both ways: gzip through `vite preview`, and brotli (quality 11, with a
  content length) through a small static server, which is closer to what Vercel serves.
- **The delay was render, not load.** Lighthouse's LCP breakdown for the flag-on mobile run (observed,
  before simulation): time to first byte 7 ms, resource load delay 14 ms, load duration 22 ms,
  element render delay 915 ms. The preloaded poster had arrived within 50 ms.
- **The largest paint was the frame's poster, not the fallback's.** On a phone the frame's stage is
  4:5 and full bleed under the controls; the fallback's was 16:9 (at least 420 px) under the title
  alone, so the frame's image was a new, larger candidate. In this container a frame reaches the
  screen only after SwiftShader has rasterised it (about 700 ms on the GPU thread), and by then the
  frame had replaced the fallback; the simulation counted everything that finished before that
  paint, including the frame's chunk (222 kB, most of it the registry), its stylesheet and
  `capitalConditions`.
- **On a phone with a GPU** the fallback would have painted first and been replaced by a different
  layout, the poster moving down by the controls' height: a shift the lab never saw.
- **Chrome passes over a small image as a placeholder.** An image under 0.05 bits per pixel is not an
  LCP candidate. Written compactly (below) and served as brotli, the poster is 3.6 kB: a candidate at
  a phone's stage (about 0.3 bits per pixel), not at a wide screen's (about 0.04 at 1350 px), where
  the title is then the largest paint. The old poster (6.1 kB brotli, 0.06) was just over the line.

## 2. What changed

1. **The poster, written compactly** (`scripts/world/render-poster.mjs`): 66.7 kB → 17.8 kB, gzip
   7.4 → 4.6 kB, brotli 6.1 → 3.6 kB. Integer coordinates (a unit is under half a pixel at the widest
   stage), relative path commands, a prism as two paths (outline, then top with the front edge)
   instead of three outlined faces, the roads of one width as one path, the shared paint in a style
   sheet and on groups. The viewBox and the drawing order are unchanged; rendered side by side in
   Chromium at 1600 × 952 the two posters read the same (antialiasing differences only). The poster
   test holds the committed file byte for byte, counts a top for every block and fixture, keeps the
   frame's aspect, and now caps the file at 24 KiB.
2. **The first paint is the frame's own layout** (`src/components/world/FrameShell.tsx`,
   `frame.css`). The header, its controls, the search field and the poster are one set of components
   that both `WorldFrame` and the fallback render; the fallback renders them inert, with the rules
   they need (`frame.css`, split out of `world.css`) inlined, because the world's stylesheet travels
   with the frame's chunk. A unit test renders the fallback and the frame and compares the header and
   the poster markup (preview and full, wide and phone). In Chromium the stage box is the same before
   and after the frame takes over (1286 × 723 at 1350 px wide; 358 × 448 at 390 px).
3. **The frame's chunk is fetched after the poster's paint** (`WorldSlot` in
   `src/components/world/Poster.tsx`). The slot holds the fallback until the poster is on screen
   (decoded, a frame drawn) and the browser has reported the largest paint (the first
   `largest-contentful-paint` entry, whichever element); at once if the stage is below the fold (the
   About page) or on any pointer, focus or key in the fallback; at the latest after 3 s. The switch is
   a transition, so the poster stays until the frame is ready. Under reduced motion the slot renders
   the schematic and the one line, as `WorldFrame` would, and the frame's chunk is never fetched.
4. **The title face is preloaded with the poster** when the flag is on (`vite.config.ts`, the
   `world-poster-preload` plugin): on a wide screen the title is the largest paint, and a title first
   drawn in the fallback face was outgrown by the frame's own title drawn in Spectral at the swap, a
   later and larger candidate (desktop brotli LCP 1.1 s, the title at 3.4 s observed, before this).
5. **The engine's renderer in three chunks** (`vite.config.ts` `manualChunks`): `three-core` (scene
   graph, maths, geometry), `three-renderer` (the WebGL renderer and its shader library),
   `three-addons` (orbit controls, fat lines), and the engine's own code named `world-scene`. All
   four are needed for the engine's first frame and are requested together when it mounts (a phone's
   first touch, a wide screen's idle time after the paint), so they download and compile in
   parallel and a change to one leaves the others cached. The shell's chunk still imports none of
   them (D26).
6. **`scripts/world/lighthouse.mjs`** takes `--runs N` (rounds, medians) and finds the LCP element
   under Lighthouse 13, which moved it to the LCP breakdown insight.

With the flag off, the `vite build` output is byte-identical to `main` apart from
`dist/world/poster-far.svg` (every asset keeps its file name and hash), and `assert-world-flag`
finds no world code in it.

## 3. Before and after

Lighthouse 13.5.0, landing page, this container (Chromium 1194 headless on SwiftShader, simulated
throttling). Five interleaved rounds (every configuration once per round), medians. Before is a
build of `main` at `8b549d1`; after is this branch. Both builds point at the dead Supabase URL
(`http://127.0.0.1:54321`), so the page shows the outage state and contacts no backend. Transfer is
Lighthouse's total byte weight in KiB.

**`vite preview` (gzip, HTTP/1.1)**

| run | perf | LCP | FCP | TBT | CLS | transfer |
|---|---|---|---|---|---|---|
| flag off, mobile, before | 80 | 4,339 ms | 2,919 ms | 69 ms | 0.011 | 436 KB |
| flag off, mobile, after | 80 | 4,311 ms | 2,897 ms | 52 ms | 0.011 | 436 KB |
| **flag on, mobile, before** | **74** | **5,204 ms** | **3,230 ms** | **58 ms** | **0.001** | **494 KB** |
| **flag on, mobile, after** | **81** | **4,291 ms** | **2,755 ms** | **43 ms** | **0** | **493 KB** |
| flag off, desktop, before | 99 | 897 ms | 637 ms | 0 ms | 0 | 436 KB |
| flag off, desktop, after | 99 | 898 ms | 627 ms | 0 ms | 0.001 | 436 KB |
| flag on, desktop, before | 94 | 1,150 ms | 703 ms | 126 ms | 0.001 | 676 KB |
| flag on, desktop, after | 96 | 891 ms | 611 ms | 118 ms | 0.001 | 678 KB |

**Static server with brotli (HTTP/1.1, content length; closer to Vercel)**

| run | perf | LCP | FCP | TBT | CLS | transfer |
|---|---|---|---|---|---|---|
| flag off, mobile, before | 83 | 3,992 ms | 2,737 ms | 72 ms | 0.011 | 398 KB |
| flag off, mobile, after | 83 | 4,001 ms | 2,747 ms | 61 ms | 0.011 | 398 KB |
| **flag on, mobile, before** | **76** | **4,881 ms** | **3,058 ms** | **38 ms** | **0.001** | **446 KB** |
| **flag on, mobile, after** | **83** | **4,018 ms** | **2,598 ms** | **50 ms** | **0** | **445 KB** |
| flag off, desktop, before | 99 | 821 ms | 563 ms | 0 ms | 0 | 398 KB |
| flag off, desktop, after | 99 | 823 ms | 574 ms | 0 ms | 0.001 | 398 KB |
| flag on, desktop, before | 95 | 1,089 ms | 663 ms | 111 ms | 0.001 | 595 KB |
| flag on, desktop, after | 96 | 848 ms | 553 ms | 129 ms | 0.001 | 598 KB |

Flag-on mobile LCP: 5,204 → 4,291 ms (gzip), 4,881 → 4,018 ms (brotli), level with the flag-off
page (4,311 and 4,001 ms); FCP is now earlier than the flag-off page's. CLS holds (0 on mobile).
TBT on the mobile profile is within the run-to-run spread (30 to 101 ms across all mobile runs); on desktop
it is the engine's build after the paint (one long task, D15's first plan, §5) and moves 126 → 118 ms
with gzip and 111 → 129 ms with brotli, inside the spread of the five rounds (93 to 200 ms). The
flag-off rows are the same build in effect (only the unused poster file differs) and measure the
container's noise: within 30 ms. The repository's script, re-run on this branch with `--runs 3`
(`frames/lighthouse.json`, per-run LCP in `lcpMsRuns`, and the four HTML reports), agrees: flag off
mobile 80 / LCP 4,296 ms, flag on mobile 81 / 4,272 ms, flag off desktop 98 / 898 ms, flag on desktop
94 / 883 ms.

In a real browser (Playwright, Chromium, no throttling, this branch): at 1350 × 940 the poster is the
largest paint at 988 ms, the frame's chunk is requested 16 ms later and the engine after it; the
stage box does not change at the swap; CLS 0.0007. At 390 × 844 the poster paints at 284 ms, the
frame's chunk follows at 296 ms, "Start the world" mounts the engine and nothing scrolls sideways.
Under reduced motion the schematic renders and neither the frame's chunk nor three.js is requested.

One shift that is not new: at 390 px the controls rewrap when the body face (Plus Jakarta Sans)
replaces the fallback face, and the stage moves down 48 px (CLS 0.11 in that Playwright run; 0.11 on
`main` too, where it happens inside the frame). Lighthouse does not see it because its first frame
is presented after the fonts have arrived. Preloading the body face as well, or a controls row of
fixed height on phones, would remove it; neither is part of this change.

## 4. Chunk sizes (flag on, `vite build`)

| chunk | before | after |
|---|---|---|
| poster (`public/world/poster-far.svg`) | 66.7 kB (gzip 7.4, brotli 6.1) | 17.8 kB (gzip 4.6, brotli 3.6) |
| `ChainPlate` (the landing page's chain wrapper; now with the fallback's header and inlined `frame.css`) | 180.24 kB (gzip 46.44) | 187.17 kB (gzip 48.43) |
| `WorldFrame` | 222.52 kB (gzip 39.12) | 219.56 kB (gzip 38.35) |
| `WorldFrame` CSS (`frame.css` + `world.css`) | 7.76 kB (gzip 1.82) | 7.85 kB (gzip 1.82) |
| engine code (`index-*` → `world-scene`) | 74.88 kB (gzip 29.42) | 74.98 kB (gzip 29.47) |
| three.js | `world-engine` 570.90 kB (gzip 143.88) | `three-core` 178.76 kB (gzip 48.97) · `three-renderer` 358.41 kB (gzip 87.61) · `three-addons` 36.86 kB (gzip 9.56) |
| `layout.generated` | 60.25 kB (gzip 11.99) | 60.25 kB (gzip 11.99) |
| `Board` · `ThinkTank` (already lazy) | 43.87 kB · 3.34 kB | 43.87 kB · 3.34 kB |

The three.js chunks together are 3 kB larger than the single chunk (the bindings they pass each
other). The flag-off build is unchanged.

## 5. What was not done, and why

- **D15's first plan as written** (`gate-2.md` D15) is a sliced *scene build*: regions, then blocks,
  then traffic across idle callbacks, so no task exceeds 50 ms. Not done: on a phone the build runs
  only after the first touch (D25), outside every mobile measurement; on a wide screen it is the
  desktop TBT above. Slicing makes `createWorld` asynchronous (the tests, the debug API and the shell
  call it synchronously) and reaches into `context.ts` and `view/index.ts`, which another branch is
  replacing. The chunk split above is the part of "the sliced build" that does not touch them.
- **Interiors, rooms and the whiteboard behind their own import:** 11.4 kB before minification,
  a few kB gzip, inside `world-scene`; `view/index.ts` calls a plot's `section()` synchronously when it
  opens, so a lazy module would leave a gap there. Board and ThinkTank were already lazy.
- **The registry out of the `WorldFrame` chunk** (`subindustries.generated`, 196 kB before
  minification, most of the chunk's 220 kB): after this change it loads
  after the largest paint and no longer touches LCP; it is still parsed before a phone's "Start the
  world" works. The next step if a phone's first interaction needs it.
- **Vercel itself** was not measured (no access from this session); the brotli rows stand in.

## 6. Commands

```
# builds (the same dead-URL environment for both flags)
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key npx vite build --outDir <off>
VITE_WORLD_KAWASAN=true VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key npx vite build --outDir <on>
# serve: vite preview (gzip), and a static server with brotli for the second table
npx vite preview --outDir <off> --port 4173 ; npx vite preview --outDir <on> --port 4174
# Lighthouse, the repository's script (writes frames/lighthouse.json and the four HTML reports)
node scripts/world/lighthouse.mjs --off http://127.0.0.1:4173 --on http://127.0.0.1:4174 --runs 3
```

The interleaved before/after rounds used the same Lighthouse flags as the script (headless, SwiftShader,
`--preset=desktop` for desktop) through a scratch driver.
