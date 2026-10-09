# Mega prompt: build the Kawasan Industri world on dikagustiana.com

You are the implementation agent for the repository `dikagustiana/dikagustiana.com`. Your job is to
carry out `docs/world/PRD-kawasan-industri.md` (the PRD) phase by phase, stopping at every gate.

**Precedence when documents disagree:** section 0 of this prompt, then the PRD, then the rest of this
prompt, then the repository's own conventions. If you cannot satisfy all four, stop and report.

**Language:** code, comments, commit messages and documentation in English. On-screen text in
English with British spelling, matching the site. Reports to the owner in informal Indonesian.

**Date:** 8 October 2026.

---

## 0. Hard rules. These override everything else, including later instructions in this prompt.

1. **Branch only.** Create `feat/kawasan-industri` from `main` and work there. Never commit to
   `main`, never merge, never promote a deployment, never change Vercel production settings.
2. **No production database change.** The site's Supabase project is `asypkbkiebjvvpimewfp`. You
   do not run migrations, SQL, policy changes, function deployments or storage changes against it.
   The one schema addition this work needs (essay tags) is written as a migration file and applied
   only to a Supabase branch or a local database, after the backup check in rule 3, and only after
   gate 3. The owner applies it to production himself, later.
3. **Backups first.** Before applying any migration anywhere, verify that the site's database backup
   job is configured and has run recently (the repository's GitHub Actions workflow and its
   secrets, or Supabase's own backups). If you cannot verify it, do not apply the migration; report
   at the next gate.
4. **Read-only data.** The world reads `fsre_published` and published essays through the site's
   existing data layer with the anonymous role's existing policies. No new policies, roles, views,
   RPCs or edge functions. No writes from any code path you add. Add a test that proves it (a
   mocked client that throws on any write).
5. **Feature flag.** Everything you build is behind `world_kawasan` using the site's existing flag
   mechanism, off by default in production. With the flag off, the current schematic renders
   exactly as it does today; prove it with a visual regression test.
6. **Gates.** Stop and wait for the owner's "lanjut" at gates 0, 1, 2, 3 and 4 (section 13). A gate
   stop means: commit, push the branch, write the gate report, and end your turn. Do not continue
   past a gate on your own, even if the next step seems obvious.
7. **No secrets.** Never commit keys, tokens or connection strings. Never print them in reports.
   Read them only from the environment the repository already uses.
8. **Published only.** No figure reaches the screen unless it comes from a published model package
   or a published essay. No sample numbers. No placeholder values that look like numbers. If you
   need something on screen while a real package does not exist, label it "mock, never ships",
   keep it in a file that the production build excludes, and list it in the gate report.
9. **No personal names, no market data,** anywhere in the world, the cards or the board.
10. **Licence.** The Factory Yard engine code enters the repository only when `NOTICE.md` records
    either its licence file or the author's written permission for use on a public site, together
    with ai-iso-skill's MIT notice. Until then you may port it on the branch, but the pull request
    cannot be marked ready, and you say so in every gate report.
11. **Verify, don't assert.** Every claim in a report ("tests pass", "LCP unchanged", "no writes")
    is backed by a command you ran and its output, quoted in the report. The owner verifies agent
    claims independently; make that easy.
12. **Hardcoded lists are a known trap in this repository.** Any list of names, tokens, routes,
    stations or tags lives in one exported constant and is imported everywhere else.

---

## 1. Inputs

| Input | Where | Notes |
|---|---|---|
| The PRD | `docs/world/PRD-kawasan-industri.md` (commit it from the owner's file in your first commit) | The specification |
| The owner's IDX-IC sub-sector table | `docs/world/sources/idx-ic-subsektor.tsv` (commit it from the owner's message) | 35 sub-sectors, 69 industries, 130 sub-industries, 125 outside Z |
| Factory Yard | `https://github.com/Khalidabdi1/factory` at commit `148758a` | The engine base. Pin this commit; do not track its branch |
| ai-iso-skill | `https://github.com/MrBongoC/ai-iso-skill` | MIT, © 2026 Tolga Cohce |
| Finance in Action contract v3.1 | `src/lib/finance-in-action/contract/` | Types for packages, unit economics and links |
| The chain data file | Locate it (section 2) | Stages, nodes, hooks, bands, loops, condition marks, evidence lines, drill-downs |
| Supabase project | `asypkbkiebjvvpimewfp` | Read-only, rule 4 |

Factory Yard facts you can rely on (verified on 8 October 2026):
- Next.js 16 app with the engine in `yard/`: `kernel/` (iso, part, path, graph, math), `theme.ts`,
  `layout.ts`, `land.ts`, `models/`, `world/`, `sim/`, `view.ts`, `index.ts`, `shared.ts`.
- 74 TypeScript files, about 13.400 lines; 44 files start with `// @ts-nocheck`.
- Dependencies: `three@0.186.1`, React 19, Next 16. The site is Vite + React; you take the engine,
  not the Next shell.
- The engine runs once per page load with side effects at import (`applyTheme()`, renderer creation
  in `index.ts`), finds DOM elements by id through `shared.ts`'s `$`, and has no dispose path.
- Startup runs 80 simulated seconds of warm-up (4.800 steps of 1/60 s) synchronously.
- The built engine chunk is 1,25 MB raw, about 383 KB gzipped.
- Draw-call discipline: whole-map view about 1.900 calls or fewer; `TINY` and `FAR` levels of
  detail swap people and vehicles for lite models.
- Entity contract: `kind`, `id`, `groups`, `pick`, `info()` → `{ kind, title, status, rows, bar?,
  actions? }`, `readout()`, optional `route()`, `peek` for section drawings, `hooks.forget()` on
  removal.
- `?debug=1` exposes `window.yard` with `step`, `skip`, `select`, `screenOf`, `look`, `view`,
  `all`, `drawCalls`.
- `scripts/check-yard.mjs` checks import scope and load order.
- Fonts come from `next/font/google` at build time; the site must self-host instead.
- There is no LICENSE file in the repository (rule 10).

---

## 2. Phase A: discovery. Ends at gate 0.

Do not write product code in this phase. Produce `docs/world/discovery.md` with evidence (file paths,
line references, command output) for each item:

1. **The chain map.** Where the schematic lives (component, data file, routes), how its data is
   shaped (stages, nodes, transfer points, hooks, bands, loops, condition marks, evidence lines,
   drill-downs), and how the landing page and the About page include it.
2. **Flags.** How the site implements feature flags; how to add `world_kawasan`; how flags are set
   per environment.
3. **Finance in Action.** The data layer that reads `fsre_published`; the contract v3.1 types; the
   model page's inspector and download components; the index component; the routes. Whether INTP's
   package exists in `fsre_published` yet.
4. **Essays.** The essay schema (tables, columns, publication status); whether a tag structure
   exists; how published essays are listed per section; the sections that map to the think-tank
   rooms.
5. **Routing, theme, formatting.** The router; the design tokens and theme switch; the number
   formatter; typography tokens; the CSP configuration; the analytics mechanism if any.
6. **Testing.** The unit test runner, the e2e runner, visual regression tooling, CI workflow; how to
   run each locally.
7. **Backups.** Whether the database backup job is configured and running (rule 3). Report the
   evidence; do not fix it unless the owner asks.
8. **Factory Yard adoption list.** For every file under `yard/`, mark it: port as is, port and type,
   port and adapt, or do not port, with one line of reason. Record the exact commit `148758a`.
9. **Licence state.** Confirm whether Factory Yard has a licence file now; note what `NOTICE.md`
   will need.
10. **Plan.** Your file layout for the work (section 3), the commit sequence you intend (section 12),
    and anything in the PRD you believe the repository makes impossible or unwise, with an
    alternative.

Gate 0 report: a ten-line Indonesian summary, then `discovery.md`. **Stop.**

---

## 3. File layout

Create these locations; adjust names only to match repository conventions, and record any change in
the discovery document.

```
src/world/engine/              the ported Factory Yard engine (section 4)
  kernel/  theme.ts  view/  sim/  models/  world/  create.ts  index.ts
src/world/interiors/           archetype interiors with station tables (section 9)
src/world/data/boundary.ts     the only path from published data into scene code (section 8)
src/world/placement/           the deterministic placement algorithm and its generated layout
src/world/poster/              the build-time poster renderer
src/lib/world/registry/        registry types, generated constants, generator, physical-unit synonyms
src/lib/world/presentation.ts  which signpost, band, mark goes where in the world
src/components/world/          the React shell: frame, controls, cards, board, think tank, search
docs/world/                    PRD, discovery, review-registry, frames/, report, sources/
NOTICE.md                      licences and permissions
```

---

## 4. Phase B: engine adoption. Part of the work before gate 2.

### 4.1 Port

- Vendor the files marked "port" in the adoption list into `src/world/engine/`, preserving their
  comments and crediting their origin at the top of each file: "Adapted from Factory Yard
  (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce)".
- Do not port: police and robberies, fire, the fair, fishing, Sahel, metro, Metrobus, Motors, the
  east country, the village, the observatory, Starbase, weather, or the Next.js shell.
- Keep: `kernel/` entire; `theme.ts`; `view.ts` (selection, hit-testing, tags, card hooks, route
  drawing, look-inside, keys, frame loop, debug API); `sim/core`, `roads`, `roadnet`, `trucks`,
  `forklifts`, `person`, `people` (walkers and staff), `freight`, `train`, `port`; `models/`
  vehicles and people; `world/` ground, woods, range, port, rail.
- Run an equivalent of `scripts/check-yard.mjs` in this repository and keep it green.

### 4.2 Mount and dispose

Replace the import-time side effects with an explicit API:

```ts
export interface WorldOptions {
  registry: Registry;
  layout: GeneratedLayout;
  theme: ThemeTokens;                  // the site's tokens mapped to engine names
  seed?: number;
  initialView?: ViewName;              // 'whole' | 'ring' | 'estate' | 'gateway' | 'town' | 'thinktank'
  reducedDetail?: boolean;             // phones
  debug?: boolean;                     // exposes window.world
  onSelect?: (sel: Selection | null) => void;
  onReady?: () => void;
}

export interface WorldHandle {
  select(id: string | null): void;
  lookAt(view: ViewName): void;
  setDistance(t: number): void;        // 0 economy … 1 finance
  setOverlay(name: 'none' | 'reindustrialisation' | 'green-transition'): void;
  setLayer(name: LayerName, on: boolean): void;
  setModelStatus(statuses: Map<string, ModelStatus>): void;   // from the data boundary
  highlightChain(id: string, depth: 1 | 'all'): void;
  exposeCompany(ticker: string, stations: StationBinding[]): void;
  pause(on: boolean): void;
  dispose(): void;
}

export function createWorld(container: HTMLElement, options: WorldOptions): WorldHandle;
```

Requirements:
- No module under `src/world/engine/` executes side effects at import. `applyTheme`, renderer
  creation and warm-up happen inside `createWorld`.
- The engine never calls `document.getElementById`. The React shell passes the container and reads
  state through the handle and the callbacks. Per-frame UI updates (clock, readout) go through a
  small subscription on the handle, not through ids.
- `dispose()` cancels the animation frame, removes every listener it added (window, canvas,
  controls), disposes geometries, materials, textures and the renderer, forces context loss, and
  clears every module-level reference it set. A test mounts and disposes ten times in a row and
  asserts no growth in listeners, no running loop and no WebGL contexts.
- The seeded random number generator is per world instance, not module-global, so two worlds in one
  page (or a remount) are independent and deterministic.
- `hooks` in `shared.ts` becomes an instance object created by `createWorld`.

### 4.3 Types

- Every new file is typed; `@ts-nocheck` is removed from every ported file you modify, and the
  file is typed to the repository's `tsconfig` strictness. Ported files you do not modify may keep
  the pragma; list them in the report.

### 4.4 Startup budget

- Warm-up runs only as long as needed to populate the far view's roads with vehicles; measure the
  number of steps that achieves it and record it.
- Near-zoom detail (interiors, signage, plots' small parts) is built lazily when the camera first
  approaches the block, and cached.
- The engine is a separate chunk, imported dynamically by the shell after first paint or on the
  first pointer or keyboard interaction with the frame, whichever is first.

### 4.5 Fonts and theme

- Self-host the fonts the site uses; the engine's text textures read the family from a CSS variable
  the shell sets. No build-time font fetches.
- `src/world/engine/theme.ts` maps the site's tokens to the engine's token names in one table. No
  hex values in scene code (a lint rule or test greps for `#[0-9a-f]{3,6}` under `src/world/engine`
  and `src/world/interiors` and fails on any hit outside the mapping file).

### 4.6 Debug API

`?debug=1` exposes `window.world` with: `step(seconds)`, `skip(hours)`, `select(id)`,
`screenOf(id)`, `look(x, y, zoom)`, `view(name)`, `all()`, `drawCalls()`, `statuses()`,
`chain(id)`, `expose(ticker)`, `dispose()`. The smoke tests use it.

---

## 5. Phase C: the registry. Ends at gate 1.

### 5.1 Generator

- `scripts/world/build-registry.ts` reads `docs/world/sources/idx-ic-subsektor.tsv` and the official
  IDX-IC classification (committed under `docs/world/sources/` as a file or a cited reference with
  a hash) and writes `src/lib/world/registry/subindustries.generated.ts`, `links.generated.ts`
  and `docs/world/review-registry.md`.
- The generator is deterministic, idempotent, and fails if the source citation is missing or the
  counts are not 35 / 69 / 130 / 125.
- Placement defaults come from Appendix A of the PRD. Every placement is `proposed` until the owner
  marks it `owner` in the source file; the generator never flips that field.

### 5.2 Example pairs

- For each sub-industry, propose two listed companies with a one-line reason each (for example:
  discloses volumes and capacity; largest by revenue in the sub-industry; already on the FSRE first
  slate). Mark them `proposed`. Sources for listing status must be cited; where you cannot verify
  that a company is listed in that sub-industry, leave the slot empty with "not yet proposed".
- Where the FSRE first slate exists (INTP, SMGR; PTBA, ITMG), use it.

### 5.3 Links

- Propose expected links between sub-industries with a one-line rationale each (coal → cement; gas
  → fertiliser; packaging → food and beverages; steel → machinery and automotive; and so on). All
  `state: 'expected'`; no weights.
- If a published package carries measured weights, the boundary (section 8) overrides the registry
  at runtime; record that rule in the generated file's header.

### 5.4 Tests

- Counts and invariants from PRD section 8.1.
- Every `chainNodeId` resolves in the chain data file.
- Every ticker unique across the registry.
- A snapshot test of `review-registry.md` so that any change to placements is visible in review.

Gate 1 report: a ten-line Indonesian summary; `review-registry.md`; the open decisions D1–D9 from
the PRD with your recommendation for each and the default you will use if unanswered. **Stop.**

---

## 6. Phase D: placement, world generation, poster, shell. Ends at gate 2.

### 6.1 Placement algorithm

`src/world/placement/place.ts` turns the registry into `layout.generated.ts`:
- Region templates: ring arcs (geological north and north-west, biological south and south-west),
  estate rectangle at the centre, gateway strip to the east, town grid beyond it, recovery yard at
  the town's edge with a road back to the estate, the hill north-east of the town.
- Blocks per zone sized by sub-industry count, laid out on the region's grid; two plots per block;
  one building family per zone (PRD 7.6).
- Roads: ring road, radial roads to the estate gates, main road through the gateway, the dashed
  raw-export road from the geological arc to the port, the town grid, the recovery road.
- Labels: anchors per region and per block; signposts per PRD 7.4; gates with weighbridges on every
  road leaving the estate.
- Deterministic for a fixed registry and seed; the output file is committed; a test asserts no
  overlapping blocks and that every placed sub-industry has a block and two plots.

### 6.2 World builders

- `src/world/world/*.ts` build regions, blocks, roads, signposts, gates and vehicles from the
  generated layout using the engine's `Part`, following the engine's draw-call discipline: merge
  static things, share parts for repeated objects, lite models at `TINY` and `FAR`.
- Building families: pit, well pad, quarry, stockpile, plantation block, field, pond, forest block,
  process plant, factory, packaging plant, power plant, water plant, warehouse, cold store,
  operator office, quay, apron, interchange, rail yard, 3PL shed, depot, market hall, supermarket,
  minimarket, department store, shop, dealership, hotel, restaurant, cinema, school, hospital,
  clinic, lab, office tower, bank tower, exchange, recycling plant, scrap yard, compost site,
  telecom tower, construction site, think-tank building. Each family is one builder with
  parameters; no per-sub-industry hand drawing.
- Vehicles: trucks on the ring and radials; reefers when the cold-chain layer is on; forklifts at
  the estate warehouse; a train in the rail yard; a crane at the quay; walkers in the town. Loop
  vehicles on the outer ring for the schematic's loops. The money layer's dashed lines and coins.
- Motion rules from PRD 7.12; the vehicle card's line "Illustrative traffic; see the model for
  figures".

### 6.3 Poster

- `src/world/poster/render-poster.ts` renders the far view headlessly to SVG (preferred) or PNG at
  build time from the same generated layout and writes it to the public folder. Wire it into the
  build so the poster cannot drift from the registry.

### 6.4 Shell

`src/components/world/`:
- `WorldFrame`: the frame with header (place buttons, distance control, shift overlay, layer
  toggles, search, Skema toggle, theme), the stage (poster, then canvas), the reading strip at the
  bottom edge, the card dock, and the board host. It mounts the engine lazily (section 4.4) and
  disposes it on unmount.
- `Skema`: renders the existing schematic component unchanged inside the same frame.
- `Card`: one card at a time; kinds: building, company, gate, signpost, layer, vehicle, link, mark,
  room, piece. Right dock on desktop, bottom sheet on phones.
- `Board`: the full board (section 9.4), with its route.
- `ThinkTank`: rooms and pieces (section 11).
- `Search`: registry and published data only.
- Keyboard: `1`–`5`, `0`, `[`, `]`, Enter, Esc, arrows, `+`, `−`, `F`.
- Reduced motion: render `Skema` and a one-line note.
- Flag off: render the existing schematic exactly as before, with a visual regression test
  comparing before and after this work.

### 6.5 Style frames for gate 2

Commit to `docs/world/frames/`:
- far, middle and near views, light and dark, day and night;
- an exposed company with the in-world whiteboard, using INTP's published package if it exists in
  `fsre_published`, otherwise a mock labelled "mock, never ships" (rule 8);
- the full board;
- the think tank's section drawing with two rooms;
- the reindustrialisation overlay with condition marks and the reading strip;
- the Skema toggle;
- a 390 px wide phone frame;
- Lighthouse reports for the landing page with the flag off and on (mobile and desktop), and the
  engine chunk's raw and gzipped size.

Gate 2 report: a ten-line Indonesian summary; the frames; the measurements; the warm-up step count;
draw calls at far, middle and near. **Stop.**

---

## 7. Phase E: lenses, overlays and chain highlight

- Wire the distance control to the camera (0 = far home view, 1 = near view on the selected or
  last building) and keep the zoom buttons and the control in step.
- Wire the shift overlay to the chain data file's condition marks: place marks on buildings, gates
  and layers by `src/lib/world/presentation.ts`, show the reading strip in argument order, open
  the condition card with its five-block structure and evidence line. Add nothing to the data.
- The energy drill-down opens the existing electricity chain component in the same frame with a
  back control.
- Chain highlight per PRD 7.9: one level by default, "show full chain", measured solid, expected
  dashed and labelled, everything else dimmed.

---

## 8. Phase F: the data boundary and published models. Part of gate 3.

### 8.1 Boundary

`src/world/data/boundary.ts` is the only module that imports the Finance in Action data layer into
`src/world/`. It exposes:

```ts
interface ModelStatus { ticker: string; state: 'published' | 'none' | 'unavailable'; period?: string; archetype?: Archetype; packageVersion?: string }
interface FlowWeight { from: string; to: string; cls: 'measured-heavy' | 'measured-light' | 'expected' }
interface StationBinding { lineId: string; stationId: string | null }   // null → whiteboard only

getModelStatuses(): Promise<Map<string, ModelStatus>>
getFlowWeights(): Promise<FlowWeight[]>
bindStations(ticker: string): Promise<StationBinding[]>
```

Scene code receives only these shapes. A type-level test asserts that nothing under
`src/world/engine`, `src/world/world` or `src/world/interiors` imports from the Finance in Action
data layer or from the registry's link weights, and a runtime assertion in development throws if a
number with a currency or unit reaches a scene builder.

### 8.2 Published models

- One request for the published index at world load; one request per opened company for its
  package; session cache. Reuse the existing data layer; add no queries that bypass it.
- Outage versus absence: a failed index request yields `unavailable` for every building ("Model
  status unavailable"), never `none`.
- Peer band rule (PRD 8.3): compute from published packages of the same sub-industry and period; one
  comparator → two marks, heading "vs one comparator"; three or more → band with median. Never a
  band from two points. Unit-tested.
- Source traces reuse the model page's inspector component and the `doc:<sha256>#page=n` locator
  when the package carries it.

### 8.3 Tests

- A mocked client that throws on any write; the whole world and board run against it.
- Published-only: a test renders the board for a package fixture and asserts every figure on screen
  maps to a package field; a test renders a company with no package and asserts no numeric text.
- Outage path test.

---

## 9. Phase G: the exposed company

### 9.1 Interiors

- `src/world/interiors/{proc,dist,asset,mine,farm,service}.ts`, each exporting `build(part, box)`
  and `STATIONS: Station[]` with `id`, `tags`, `anchor`. Stations per PRD 7.8.
- `src/lib/world/registry/physical-units.ts`: the synonym table from `driver.physicalUnit` strings
  to station tags, per archetype. Matching is case-insensitive, whole-token, with the synonym table
  applied first. Unmatched lines bind to `null` (whiteboard only) and are listed on the board under
  "Limits of the filing" as "not placed in the drawing".
- The section drawing follows the engine's `peek` mechanism: shell replaced by the cut (walls low
  and hatched, roof as outline) while the company or anything inside its box is selected; the
  camera eases to the near view.

### 9.2 Driver placement

- On `exposeCompany(ticker, bindings)`, the engine lights each bound station with a small marker
  carrying the line's label (no figures) and links the marker to the line id.
- Hovering or focusing a waterfall bar on the board or the whiteboard lights its station; selecting
  a station highlights its lines on the board.

### 9.3 In-world whiteboard

- Drawn on the cut's back wall with the engine's text texture: the top three drivers by share of
  cost of revenue (label and figure), a miniature waterfall with values on bars, and the peer
  position as two marks on one scale. Twelve characters per label at most. Clicking it opens the
  board.
- With no published model: "No model yet" and nothing else.

### 9.4 The full board

- Route `/finance/kawasan/<ticker>` (adjust to the router's conventions; record the final form).
  Opening the route directly loads the world at the company and opens the board; refresh keeps it.
- Sections in the PRD's order (7.7). Each figure is a button that opens the source trace. "Download
  .xlsx" and "Open full model" reuse the model page's components.
- Driver tree: if the package version carries the formula graph (proposal P-2), draw precedents and
  dependents one level deep with "show full chain"; otherwise show "Driver tree not available for
  this model".
- Typography: the site's reading typeface with tabular numerals; no handwriting fonts. Number
  format: the site's existing formatter (owner decision D6 may change it; make the formatter a
  single import so the change is one line).
- Keyboard: Tab order through sections; Esc closes; focus returns to the plot.

---

## 10. Phase H: the think tank

- Rooms from the registry's room list (default two: The Next Big Thing, Industry analysis; The Green
  Transition and Development Finance switchable). Each room lists published essays of its section.
- Tags: until the schema fields exist, read `docs/world/think-tank-tags.json` (owner-authored;
  create it empty with a documented shape, and propose entries in `docs/world/review-tags.md`,
  never writing them to the database).
- Two-way links per PRD 7.10; kinds and the thesis fields on the card.
- Migration file for the tag fields under the repository's migrations folder, applied only to a
  Supabase branch or local database after the backup check, with its test result in the gate 3
  report. If the essay schema already has a usable tag structure, use it and skip the migration;
  say so.

Gate 3 report: a ten-line Indonesian summary; the published-only, no-write and outage test outputs;
the interim tag file's shape and proposed entries; the migration file and where it was applied and
with what result; the Factory Yard licence state. **Stop.**

---

## 11. Phase I: quality

- **Unit:** registry, placement, boundary, peer band, synonym matching, formatter import, theme
  mapping lint.
- **Engine:** mount and dispose ×10; replay determinism (two runs, same seed, same `all()` after
  `step(120)`); LOD switch at each zoom; draw calls at far ≤ 1.200, middle ≤ 1.600, near ≤ 1.900.
- **Smoke (headless browser with `?debug=1`):** zero console errors after `step(600)`; every place
  button; `[`/`]` cycle through every building without error; expose and close a company; open and
  close the board; toggle every layer; each overlay; the drill-down and back.
- **UI:** keyboard path; reduced motion fallback; flag-off visual regression; phone layout at 390 px.
- **Performance:** Lighthouse flag off and on (mobile and desktop); chunk sizes; frame-time sampling
  in the smoke test (report p50 and p95 frame times on the test machine).
- **Accessibility:** canvas description; card and board focus order; contrast on the board; status
  glyph plus word on every status.
- Run the repository's existing unit and e2e suites; they must remain green. Do not weaken or delete
  an existing test to pass.

---

## 12. Commit sequence

One commit per step, in this order, each with a prose message saying what changed for the viewer or
the owner. Push after each commit.

1. `docs: add the Kawasan Industri PRD and source table`
2. `docs: discovery for the Kawasan Industri world` → **gate 0**
3. `world: vendor the Factory Yard engine at 148758a with NOTICE`
4. `world: mountable engine with createWorld and dispose`
5. `world: types for touched engine modules; check script`
6. `registry: generator, generated constants, tests, review table` → **gate 1**
7. `world: placement algorithm and generated layout`
8. `world: builders for regions, roads, gates, signposts, vehicles`
9. `world: poster renderer in the build`
10. `world: React shell, flag, Skema toggle, cards, search, keyboard, phone`
11. `docs: style frames and measurements` → **gate 2**
12. `world: distance control, shift overlays, reading strip, drill-down`
13. `world: chain highlight`
14. `world: data boundary and published-model statuses`
15. `world: archetype interiors, stations, synonyms, driver placement`
16. `world: in-world whiteboard and the full board with its route`
17. `world: think tank rooms, interim tags, two-way links; migration file (branch only)` → **gate 3**
18. `test: engine, smoke, UI, performance, accessibility`
19. `docs: report, decision log, NOTICE` → **gate 4 (pull request, not merged)**

If a step must be split, keep the order and the names recognisable.

---

## 13. Gates and reports

Every gate report is `docs/world/gate-<n>.md` and contains, in this order:
1. Ten lines in informal Indonesian: what was done, what the owner must look at, what is blocked.
2. Evidence: commands run and their output (tests, builds, Lighthouse, sizes, draw calls).
3. Decisions you made with the reason, and decisions you need from the owner, numbered.
4. Deviations from the PRD or this prompt, with the reason.
5. The licence state (rule 10) and the backup state (rule 3).
6. The preview URL.

Gate 4 adds `docs/world/report.md`: architecture as built, what reads what, registry counts, every
placement, pair and link still `proposed` or `expected`, test results, performance measurements,
what is behind the flag, what remains for the owner (production migration, flag, licence), and the
decision log.

At every gate: commit, push, write the report, **stop**. Do not ask questions between gates; collect
them for the next gate. If something blocks you mid-phase and cannot wait, stop early and write the
report with "BLOCKED" in its first line.

---

## 14. Do not

- Do not touch `main`, production settings, or the production database.
- Do not add or change anything on the schematic, the Finance in Action viewer, the essay editor or
  the admin surfaces beyond what the PRD names (the flag, the Skema reuse, the inspector and download
  reuse, the optional essay tag fields).
- Do not invent sub-industry codes, company listings, link weights, figures or tags.
- Do not show pipeline status, review state or anything from `fsre` or `fsre_private`.
- Do not load anything from a CDN or a font service at runtime or build time.
- Do not use `Math.random()` in the engine; everything goes through the instance's seeded generator.
- Do not add a dependency larger than three.js without listing it in a gate report first.
- Do not weaken, skip or delete existing tests.
- Do not write handwriting fonts, decorative gradients, shadows or glow anywhere in the world.
- Do not mark the pull request ready until rule 10 is satisfied and the owner says "lanjut" at gate
  4.

---

## 15. Definition of done

The work is done when all of these hold and are evidenced in `docs/world/report.md`:

- The branch builds; the existing unit and e2e suites are green; the new suites are green.
- With the flag off, the landing page and the About page are pixel-identical to before.
- With the flag on, the poster appears first, the engine loads lazily, and the world passes the
  smoke, draw-call, dispose and determinism tests.
- The registry has 130 sub-industries with 125 placed, every placement and pair carrying its review
  state, and the review table committed.
- Every building, company, gate, signpost, layer, mark, room and piece has a card; every company
  has a board route; every figure on a board has a source trace; a company without a model shows no
  figure.
- The think tank lists published essays only and lights tagged objects; theses show evidence and a
  falsifier.
- No write to Supabase exists in any code path (tested); no production migration has run; the
  migration file and its branch result are documented.
- Lighthouse budgets and chunk sizes are reported; LCP and CLS are no worse than before.
- `NOTICE.md` records ai-iso-skill's MIT licence and Factory Yard's licence or written permission
  for public use; if the latter is still missing, the pull request remains a draft and the report
  says so.
- The pull request is open, not merged, with the report linked.

Proceed to Phase A now.
