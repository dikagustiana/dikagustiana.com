# Kawasan Industri: the world as built

Branch `feat/kawasan-industri`, 19 commits over 8 October 2026, from `main` at `bed215d`.
The gate reports (`gate-0.md` … `gate-4.md`) carry the evidence at each step; this is the
whole, as it stands at the draft pull request.

## 1. Architecture

```
docs/world/                      PRD, mega prompt, discovery, gate reports, this report,
  sources/                       the registry's source tables (IDX-IC transcription, issuers, placement, companies, links), SOURCES.md, citation lock
  frames/                        22 frames, measurements.json, lighthouse.json, four Lighthouse reports
  think-tank-tags.json           the owner's interim tags (empty); review-tags.md proposes entries
scripts/world/                   build-registry.ts, build-layout.ts, render-poster.mjs (in the build), check-engine.mjs (CI),
                                 assert-world-flag.mjs (after every build), capture-frames.mjs, lighthouse.mjs, fetch-issuers.py
src/lib/world/
  registry/                      types, generate (the generator), subindustries.generated, links.generated, physical-units (synonyms, matcher)
  constants.ts                   every list the shell shows, written once (places, layers, overlays, status vocabulary, routes, drill-down, section order)
  flag.ts                        WORLD_KAWASAN = __WORLD_KAWASAN__ (build-time, from VITE_WORLD_KAWASAN)
  presentation.ts                where each schematic element's mark lives in the world (carriers), marksFor(shift)
  peerBand.ts                    PRD §8.3's rule: none / one comparator / a band of three or more, never from two
  whiteboard.ts                  the whiteboard's content from a package, by the house formatter
  thinkTank.ts                   pieces from the rooms, the published essays and the interim tag file
  search.ts                      the search index: registry and published pieces only
src/world/
  data/types.ts, boundary.ts     the shapes that cross into scene code; the only module under src/world that imports the data layer
  engine/                        the ported kernel (iso, path, part, math), theme (tokens → materials), context, clock, view, create (createWorld/dispose),
                                 marks (condition discs), chain (the highlight), stations (driver markers), whiteboard (the board on the wall)
  placement/                     place.ts (the algorithm), layout.generated.ts (committed), types
  world/                         families.ts (44 builders), build.ts (the scene from the layout: regions, blocks, plots, roads, gates, signposts, fixtures)
  interiors/                     base.ts (the cut), stations.ts (data + matcher, no three.js), proc/dist/asset/mine/farm/service.ts (drawings), thinktank.ts
  sim/traffic.ts                 lanes and movers: trucks, reefers, forklifts, the train, the crane, walkers, coins; flow classes add trucks
src/components/world/            WorldFrame (header, stage, strip, card dock, board host), Card, Board, ThinkTank, Search, Poster (the slot: the
                                 poster in the frame's layout first, the frame after its paint), FrameShell + frame.css (what the first paint draws,
                                 shared by both), WorldSection, useWorldData (one request, react-query), usePieces, world.css (token-only)
src/pages/world/KawasanPage.tsx  /finance/kawasan and /finance/kawasan/:ticker
src/components/industry-chain/ChainPlate.tsx   the two wrappers: flag off → the schematic exactly as before; flag on → WorldSlot, poster first
supabase/migrations/20261008120000_essay_world_tags.sql   committed, applied nowhere
tests/unit/world*.test.ts(x)     16 suites, 72 tests; tests/e2e/world.spec.ts (7, playwright.world.config.ts)
```

### What reads what

- **The registry** (`src/lib/world/registry/*.generated.ts`) is generated from the source tables by
  `npm run build:registry`, locked to the classification transcription's SHA-256; tests compare the
  generated files byte for byte. Everything else reads the registry: the placement, the scene, the
  cards, the search, the boundary.
- **The placement** (`layout.generated.ts`) is generated from the registry by `npm run build:layout`
  (deterministic for one seed); the scene builders and the poster read it; tests hold no overlaps and a
  block with two plots for every placed sub-industry.
- **The poster** (`public/world/poster-far.svg`) is rendered from the layout at every build; a test
  holds the committed file byte for byte against a fresh render.
- **The data boundary** (`src/world/data/boundary.ts`) reads the published index through the site's
  own `fetchPublishedPackages` (anonymous role, `fsre_published` schema, one request per session) and
  hands scene code `ModelStatus`, `FlowWeight`, `StationBinding` and `WhiteboardContent` only. The
  shell (cards, board, whiteboard content, link weights) reads packages from the same cached index.
- **The chain data** (`src/data/industryChain.ts`) is read as is: shifts, marks, conditions, bands,
  joints; `presentation.ts` only says which world object carries each element.
- **The essays** are read by the think tank through the same client and the same published filter
  every section page uses (`onlyPublished(supabase.from('essays')…)`), joined with the interim tag file.
- **The engine** reads the registry (names, companies, links) and the layout; it never imports the
  data layer, the link register's weights, or the boundary (a rule test holds this), and in development
  it throws if a figure reaches a scene builder (`Part.text`); the whiteboard's figures arrive
  pre-formatted and go through `Part.note`, held to that module.

## 2. Registry counts and review state

| | |
|---|---|
| Sectors / sub-sectors / sub-industries (IDX-IC) | 35 sub-sectors · 69 industries · 130 sub-industries |
| Placed | 125 (Z1, Z2 and three others `unplaced`, D4) |
| Blocks / plots / roads / gates / signposts / fixtures | 125 / 250 / 39 / 5 / 7 / 4, plus the hill |
| Placements by the owner | **0 of 130** (all `proposed`; `placement.tsv`, `placedBy = owner` marks one reviewed) |
| Example pairs | 192 companies `proposed` by the earliest-listed rule; FSRE's slate (INTP, SMGR; PTBA, ITMG) `proposed`; **64 slots empty** |
| Links | **126, all `expected`** (none measured until a package measures it) |
| Issuer snapshot | 963 issuers from lembarsaham.com (secondary), 8 October 2026; 27 sub-industries with none |
| Rooms | 2 on (The Next Big Thing, Industry analysis), 2 off (The Green Transition, Development Finance) |
| Interim tags | 0 entries (1 proposed in `review-tags.md`) |

`docs/world/review-registry.md` lists every placement, pair and link with its state and reason.

## 3. Test results (at the draft pull request)

```
$ npx tsc -b --force                       clean
$ npx eslint . --max-warnings=35           0 errors, 22 warnings (the ceiling is 35; the branch added none)
$ npx vitest run                           1,010 tests, 0 failed (floor 1,006 in scripts/assert-test-count.mjs)
$ npm run check:world                      23 files · 19 wired · wired files clean · load order ok
$ npm run build                            assert-no-synthetic ok · assert-world-flag: no world code in dist/ (flag off)
$ VITE_WORLD_KAWASAN=true vite build       WorldFrame 222.52 kB (39.12 gzip) · world-engine 570.90 kB (143.88 gzip) · Board 43.87 kB · assert-world-flag: 2 markers
$ npx playwright test                      72 passed (the repository's suite, flag off)
$ npm run test:e2e:world                   7 passed (SwiftShader)
```

The world's unit suites (72 tests): engine mount and dispose ×10, idempotent dispose, seeded replay,
the debug API, import side effects; no hex outside the theme, no `Math.random`, no DOM ids, no data
layer in scene code, `Part.note` on the whiteboard only; registry (10); placement (6); scene (6, with
draw-call budgets); poster (4); shell (10); marks (3); chain (2); boundary (5: a client that throws on
writes, published-only figures, no figure without a package, the outage path, the boundary's API);
peer band (5); interiors (5); whiteboard (3); think tank (4); quality (5: LOD, reduced motion, phone
start, the one formatter, glyph and word).

The browser suite (7): zero console errors after 600 simulated seconds; draw calls under
1,200 / 1,600 / 1,900 at whole / estate / near; the canvas description; frame times reported; every
place, layer and overlay; the drill-down; `[` and `]` through all 125 buildings; the keyboard; a
company exposed, its board opened and closed with focus returned; a company without a model; 390 px;
Skema; reduced motion.

## 4. Performance measurements

Lighthouse 13.5.0, landing page, this container (SwiftShader, simulated throttling), `vite preview`
without compression; comparable between the two builds, not to a device or to Vercel (which serves
the 65 KB poster and the chunks compressed).

| run | performance | a11y | LCP | CLS | TBT | FCP | transfer |
|---|---|---|---|---|---|---|---|
| flag off, mobile | 80 | 98 | 4,295 ms | 0.011 | 43 ms | 2,888 ms | 436 KB |
| flag off, desktop | 99 | 98 | 891 ms | 0.001 | 0 ms | 630 ms | 436 KB |
| flag on, mobile | 74 | 98 | 5,271 ms | 0.001 | 34 ms | 3,236 ms | 494 KB |
| flag on, desktop | 95 | 98 | 1,123 ms | 0.001 | 120 ms | 702 ms | 676 KB |

At gate 2 the flag-on mobile run stood at 39 / LCP 7,109 ms / TBT 2,233 ms. What moved it: the engine
mounts after the browser reports the largest paint (D11); the poster is preloaded (D12) and painted by
a fallback while the world's chunk loads; on a phone the world starts on the first touch (D15's
fallback, D25); the shell no longer pulls three.js into its own chunk (D26). CLS is better than before
on both profiles; TBT is at parity; desktop LCP is within 0.25 s; **mobile LCP is 0.98 s worse than
the flag-off page** on this uncompressed preview, the poster's transfer and its render behind the
lazy route chunk. Open for the owner (gate 4, O8).

### After gate 4: O8, the mobile LCP

`o8-mobile-lcp.md` has the trace, the change and the measurements. One correction to the paragraph
above: `vite preview` does compress (gzip); the poster travelled as 7.4 kB. The cause was render: on a
phone the frame's own poster, in a different layout from the fallback's, was the largest paint, behind
the frame's chunk. Now the first paint is the frame's own layout (shared components, the same stage),
the frame's chunk is fetched after the poster's paint, the poster is written compactly (66.7 kB →
17.8 kB) and three.js is three chunks. Five interleaved rounds, medians, before (`main` at `8b549d1`)
and after:

| run (Lighthouse 13.5.0, this container) | LCP before → after | FCP before → after | TBT before → after | CLS before → after |
|---|---|---|---|---|
| flag on, mobile, `vite preview` (gzip) | 5,204 → 4,291 ms | 3,230 → 2,755 ms | 58 → 43 ms | 0.001 → 0 |
| flag off, mobile, `vite preview` (gzip) | 4,339 → 4,311 ms | 2,919 → 2,897 ms | 69 → 52 ms | 0.011 → 0.011 |
| flag on, mobile, brotli | 4,881 → 4,018 ms | 3,058 → 2,598 ms | 38 → 50 ms | 0.001 → 0 |
| flag off, mobile, brotli | 3,992 → 4,001 ms | 2,737 → 2,747 ms | 72 → 61 ms | 0.011 → 0.011 |
| flag on, desktop, `vite preview` (gzip) | 1,150 → 891 ms | 703 → 611 ms | 126 → 118 ms | 0.001 → 0.001 |
| flag on, desktop, brotli | 1,089 → 848 ms | 663 → 553 ms | 111 → 129 ms | 0.001 → 0.001 |

Flag-on mobile LCP is level with the flag-off page under both kinds of compression; mobile
performance 74 → 81 (gzip) and 76 → 83 (brotli). `frames/lighthouse.json` and the four reports are
re-run on this branch with `--runs 3`.

Engine (`measurements.json`): draw calls far 522 · middle 263–457 · near 440–552 (budgets 1,200 /
1,600 / 1,900); warm-up 1 s = 60 steps, the first frame reads 10:00; mount 0.8–1.2 s on SwiftShader;
frame times are SwiftShader's and are not a measure of the engine.

## 5. What is behind the flag

`VITE_WORLD_KAWASAN=true` at build time turns on: the two chain wrappers rendering `WorldSection`
(poster first, then the world) in the map's slot on `/` and `/about`; the routes `/finance/kawasan` and
`/finance/kawasan/:ticker`; the poster preload in `index.html`. Unset, nothing of the world is in
`dist/` (`assert-world-flag`), and the landing page is pixel-identical to a build of `main`
(`measurements.json`, 0 of 4,207,680 pixels). The flag is off in production and in CI.

The model links from the board (`Open full model`, `Open in Finance in Action index`) land on the v3.1
viewer only with `VITE_FIA_PREVIEW=true` as well (discovery item K).

## 6. What remains for the owner

1. **Licence (rule 10).** Factory Yard's licence file or the author's written permission, recorded in
   `NOTICE.md`; until then the pull request stays a draft. Ask for an MIT licence file (D9).
2. **Expose `fsre_published`** in the Supabase Data API (item A); until then every company reads
   "Status unavailable" and the frames use the SYNTHETIC mock.
3. **Backups (rule 3), then the migration.** Set the backup secrets and run the workflows once (item B);
   rehearse `20261008120000_essay_world_tags.sql` on a branch or a local database (item C); apply it to
   production yourself (rule 2).
4. **The flag.** `VITE_WORLD_KAWASAN=true` (and `VITE_FIA_PREVIEW=true`) on the preview environment to
   see the world; on production only when you decide.
5. **The registry's review.** Placements (D1–D4, 130 rows), pairs (S1, 64 empty slots), the ten spelling
   corrections (S3), the official IDX-IC PDF or its hash (item N).
6. **The think tank's tags** (`think-tank-tags.json`, O4) and the whiteboard's share rule (O6).
7. **Mobile LCP** (O8): done on `claude/world-mobile-lcp` (`o8-mobile-lcp.md`): a smaller poster, the
   first paint in the frame's own layout, the frame fetched after it, three.js in three chunks; flag-on
   mobile LCP is level with the flag-off page. D15's sliced scene build is not done (§5 there).
8. **The preview URL** (item P): this session cannot read Vercel's deployments.

## 7. Decision log

Gate 0 (`gate-0.md`, `discovery.md` §10.3 items A–R): the branch's author fix; the flag as a
build-time constant; no SYNTHETIC import; tests under the repository's folders; and the defaults for
A–R (outage state until the schema is exposed; migration file only; the energy drill-down v0; the world
as the first screen with the h1; no theme button; the PRD's peer rule beside the model page's; the
board builds a `ModelView`; preview builds set both flags; `--font-sans` in the world; the ESLint
override; the citation lock; the capital band on the credit layer; the registry as the authority).

Gate 1 (`gate-1.md`): pairs by the earliest-listed rule; FSRE's slate as proposed; one secondary issuer
source; the classification as a cross-checked transcription; information-flow, energy and asset-finance
anchors for sub-industries the chain has no node for; two rooms on; recommendations D1–D9 and
questions S1–S4.

Gate 2 (`gate-2.md`): D10 the night veil in the dark theme; D11 mount gating; D12 poster preload; D13
the mock in the capture script; D14 frames before the whiteboard; D15 the mobile budget plan; D16 the
one-second warm-up; D17 the poster's prism on its hill.

Gate 3 (`gate-3.md`): D18 description before unit; D19 the whiteboard's figures through `Part.note`;
D20 the whiteboard as an entity; D21 dimming by material swap; D22 the energy drill-down; D23 marks on
carriers only; D24 the migration stays a file.

Gate 4 (`gate-4.md`): D25 the phone starts on the first touch; D26 the shell's chunk without three.js;
D27 the card keeps the keyboard; D28 the world's own Playwright config; D29 marks side by side on
screen.

Deviations from the PRD or the mega prompt, with reasons, are in each gate report's §4; the standing
ones: Factory Yard's simulation and world modules were not kept (compact typed systems replaced them);
warm-up is 1 s; the board's waterfall bars do not light stations (the model page's component is reused
unchanged; the board's own driver list does); the frames and Lighthouse come from a software GPU.
