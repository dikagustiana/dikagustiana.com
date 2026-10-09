# PRD v2: Kawasan Industri as a living value chain

| | |
|---|---|
| Version | 2.0, draft for owner review |
| Date | 9 October 2026 |
| Owner | Dika Gustiana Irawan |
| Status | Not approved. Built by phases A–E of `MEGA-PROMPT-kawasan-v2.md` once the owner says so |
| Companions | `PLAN.md` (the diagnosis and the decisions), `MEGA-PROMPT-kawasan-v2.md` (execution) |
| Supersedes | v1 `PRD-kawasan-industri.md` §7 (experience), §9 (engine), §10 (budgets), §15 (acceptance), §16 (tests). v1 §8 (data), §11–§13 and Appendix C stay in force. v1 §7.7–§7.8 (the exposed company, interiors), §7.10 (think tank) and §7.5 (lenses, overlays) stay unless amended below |

---

## 1. Summary

v1 built a correct, data-safe world that nobody can feel. v2 makes the same world legible and
alive: a composed first screen at a human scale; companies as buildings you can point at; goods
that leave a supplier and arrive at a customer along the registry's links; activity in every
family of building; a night for everyone; the chain drawn as moving flow when something is
selected; and six stories a visitor can follow, camera on the load, from a mine to a shop. All of
it runs on the registry alone. Published models add emphasis and figures, exactly where v1 put
them, and nowhere else.

## 2. Goals, non-goals, success measures

### 2.1 Goals

1. A visitor who scrolls to the world sees, within five seconds and without clicking, that
   material moves from the ring into the estate, out through the gateway, into the town, and back.
2. Any company in the registry can be pointed at and opened from the world at any distance.
3. The chain of any sub-industry or company can be seen as motion, one level or whole.
4. A visitor can follow one load through a named chain end to end.
5. Nothing on screen is a figure unless it comes from a published package or a published essay;
   nothing is written back; the flag-off build is unchanged.

### 2.2 Non-goals

- Simulating an economy. Cadences and speeds are illustrative; every vehicle card says so.
- Changing the board, the Finance in Action viewer, the FSRE path or the essays.
- Realism in the sense of photorealism. The visual language stays hairline-and-tone.
- Sound, weather, disasters, people with names, prices.

### 2.3 Success measures (laptop, 1,246 × 700 stage; the probe's method)

| measure | v1 (`main` at `edc944a`) | v2 target |
|---|---|---|
| px per metre at the home view | 0.42 | ≥ 1.2 |
| a 40 m block at the home view | 24 px | ≥ 60 px |
| vehicles on screen and moving at the home view | 68 (sub-pixel) | ≥ 40 at ≥ 8 px/s (real GPU) |
| click on a company's building selects | the sub-industry | the company, at every distance |
| hover feedback | cursor only | pointer + label ≤ 150 ms |
| vehicles with an origin and a destination | 0 of 122 | all goods vehicles |
| sub-industries with no link | 43 | 0 placed |
| families with visible activity at the district view | 2 (crane, forklifts) | all 44 |
| buildings lit at night | published only (0) | all, published brighter |
| stories a visitor can follow | 0 | 6 |
| draw calls home / district / street | 317 / 658 / 95 | ≤ 900 / ≤ 1,300 / ≤ 1,600 |
| Lighthouse mobile LCP, flag on | ≈ 4.3 s (lab) | no worse |

## 3. The experience

### 3.1 The first screen

The frame opens on the **hero view**: the estate at the centre-left, the near arc of the ring
above it, the main gate and the gateway's first sheds at the right, the hill's edge at the top
right. Camera zoom ≥ 1.2 px/m on a 1,246 px stage. The poster is this frame. The engine fades in
under it without a layout shift. Nothing auto-pans; the world is alive, the camera is still.

The title and the coverage line stay as they are. The place buttons become **Ring · Estate ·
Gateway · Town · Hill · Whole**; `Whole` is the map view and no longer the home. Keys `1`–`5`,
`0` as before; `H` returns to the hero.

### 3.2 Scale and composition

- **Compaction (D-V2-2).** The placement generator packs the world to a content extent of at most
  1,500 × 900 m. Specifically: the ring's arcs sit within 120 m of the estate's edge; the gateway
  abuts the estate's east gate; the town begins within 150 m of the gateway; the recovery yard sits
  at the town's south edge with its road back to the estate; the hill is at the town's north-east
  corner. Blocks keep their sizes in metres (a sub-industry block 50–140 m); roads keep their
  widths. Empty slab outside the regions is at most 80 m on any side.
- **Readable at three distances.** The zoom range maps to three bands, each with its own level of
  detail (§3.3): *district* ≥ 0.75 px/m (the home and the place views), *street* ≥ 4 px/m, *inside*
  ≥ 10 px/m. The map view (`Whole`) sits at ≥ 0.75 px/m after compaction.
- **Vehicles at 1.25 × metric size** (a truck 15 m, a car 5.5 m, a walker 2.2 m) so they read at
  the district band. Documented in the vehicle module; the card still says "illustrative".
- **Ground (D-V2-3).** No survey grid. Each region a flat tone from the tokens (ring-geological
  dust, ring-biological green, estate pale, gateway sand, town deck, recovery dust, hill grass),
  seams as faint hairlines, the port water with a lighter rim. Roads keep their edge lines and
  centre dashes.
- **Shading.** Faces by orientation (top lightest, south mid, east darkest) with a 2–3 % tone step
  between neighbouring buildings from the seed, and a flat shadow quad to the north-west of every
  building (one merged part per zone). Hairlines are 1 px at the street band and 1.5 px at the
  district band (screen-space line width).

### 3.3 Three bands of detail

| band | drawn | readable | hidden |
|---|---|---|---|
| **District** (0.75–4 px/m; home, map, place views) | regions, roads, every block and lot as a silhouette, signboards as a bar, status marks, vehicles, activity, lamps, the hill, the port, ships | which districts exist, where things move, which blocks are lit | lot text, interiors, walkers, station labels |
| **Street** (4–10 px/m) | everything above plus lot signs with tickers, block labels, walkers, forklifts, vehicle loads | which company is which, what a truck carries | interiors, station labels |
| **Inside** (≥ 10 px/m) | a selected lot opens as its section with stations and the whiteboard (v1 §7.7–7.8, kept) | the operation | nothing |

The LOD switch happens on zoom thresholds with hysteresis, never on the distance slider's value
alone. Lots are **never** hidden; only their text and interiors are.

### 3.4 Pointing: hover, click, keyboard, touch

- **Hover** (mouse): the pointer cursor and a **label** in the sky layer within 150 ms: for a lot
  `TICKER · Company name`; a block `Sub-industry name`; a vehicle `Load · from A to B`; a gate the
  joint's label; a fixture its name. The hovered thing gets a hairline outline. One label at a time.
- **Click** selects and opens the card (§3.11). Click on empty ground clears. Click on a lot
  selects the company; on a block's signboard, yard or shared plant, the sub-industry; on a vehicle,
  the vehicle; on a ship, the ship; on a gate booth or weighbridge, the gate.
- **Keyboard**: `[` `]` cycle companies (not blocks) in registry order; `Shift+[` `]` cycle blocks;
  `Enter` opens the selected thing's card; `Esc` closes; `F` follows a selected vehicle; `1`–`5`,
  `0`, `H` views; `+` `−` zoom; arrows pan; `S` cycles stories.
- **Touch**: tap selects; drag pans; pinch zooms; a long press shows the hover label.
- Picking tests the sky first (labels, markers), then instanced vehicles (instance id → entity),
  then lots, then blocks, then fixtures, then ground. The first visible hit wins. A hit on a merged
  zone part resolves through the block's resolver to the **lot** whose footprint holds the point,
  else the block.

### 3.5 Companies as buildings (D-V2-4)

- Every placed sub-industry block has **two lots along its front** (the registry may add more),
  each a company. The lot is the block's family form drawn at lot size (the generator sizes lots
  to at least 24 × 18 m; families that cannot shrink that far — pit, quarry, plantation, field,
  pond, forest, quay, apron, interchange, rail yard, power plant — draw the shared form once and
  give each company an **office unit and a sign** at the front instead, as a distinct, pickable
  group).
- Each lot carries a **kerb sign** with the ticker at the street band and a **bar** in the
  company's status tone at the district band.
- The **block** keeps a signboard at its front centre with the sub-industry name and the status
  mark (glyph + word, v1 Appendix C).
- A lot with a published model is in the accent (sign, bar, night windows); one without is
  neutral; outage is the hatched mark on the block as before.
- Proposed companies show their sign. Their card says "proposed example, pending the owner's
  review" with the reason from the registry.
- Each lot has a **despatch bay** and a **receiving bay** on its driveway (§3.6), so flows arrive
  at the company, not at the block.

### 3.6 Flows (D-V2-5, D-V2-6)

**The road graph.** The generator emits a graph: nodes at junctions, gates, bays and lane ends;
edges along road centrelines with a lane per direction; driveways from every lot's bays to the
nearest road. Every bay reaches every other bay (tested). Vehicles keep right, queue behind each
other, and never leave an edge.

**Routes.** Every registry link `from → to` becomes a route: supplier lot's despatch bay →
customer lot's receiving bay, by shortest path. When a sub-industry has two companies, the route
alternates between them. Links whose supplier or customer is unplaced route from or to the
**port** (imports and exports), drawn as a ship call.

**Cadence by flow class** (the data boundary's classes; everything is `expected` without data):
expected one vehicle per 30 simulated seconds; measured-light per 18 s; measured-heavy per 10 s.
Cadence halves on phones. Live vehicles are capped (300 laptop, 120 phone); when the cap is
reached, spawning waits.

**A vehicle's life.** Spawn at the despatch bay (appear from the lot's door); drive the route;
**stop at every weighbridge** crossed (the boom lifts; 1.5 s); arrive at the receiving bay; unload
(2 s; the lot's dock activity plays); return the route empty in a lighter tone; despawn at home.
Vehicles in a queue wait; a queue longer than five vehicles at a bay spawns nothing more on that
route until it clears.

**Goods classes and vehicle kinds** (a `goods` column on every link; Appendix A): bulk → dump
truck or hopper; liquid → tanker; cold → reefer; boxed → box truck or container trailer; parcel →
van (town only); people → bus or walkers (services); none → no vehicle (financial and information
links draw coins or pulses only).

**Returns.** The six return flows of the chain file run as routes between their stage's lots and
the recovery yard, the packaging plant, the distributor depots and the biological arc, in the
loop vehicle's tone, labelled by the return's label.

**Raw export and imports.** The dashed raw-export road carries bulk from the geological arc to the
port's bulk quay; a **ship** at the quay loads (its hold mark fills), departs along the water's
edge and a new one arrives on a cadence. Imports arrive by container ship at the container quay
and leave by truck through the gateway. The **rail shuttle** runs between the rail yard and the
port with wagons that load at the yard.

**Money.** With the credit layer on, coins run every route in the opposite direction on their own
lane offset, in the live tone; the money dashes of v1 stay. With the governance layer on, a
pulse travels upstream along routes from the town (the demand signal); with regulation on, a
pulse travels downstream (specifications). These two are optional in phase B and required by D.

**Everything says what it is.** A vehicle's card: kind, load (the link's note, e.g. "coal burnt as
kiln fuel in cement"), from (company and sub-industry), to, the link's state (expected or
measured), "Illustrative traffic; see the model for figures", and a Follow button.

### 3.7 Activity (D-V2-7)

Every family has at least one motion visible at the district band, listed in Appendix C. Rules:
instanced where repeated (smoke puffs, lamps, cones), seeded, no randomness outside the
instance's generator, budgeted (all activity ≤ 60 draw calls), paused with the clock, never a
figure, never text. Smoke and steam are small quads that rise, drift and fade, three to six per
stack. Cranes swing on a sine; pumpjacks nod; conveyors are travelling dashes; aerators are
expanding rings; beacons blink; doors emit and absorb walkers at the street band.

### 3.8 Day and night (D-V2-8)

A day lasts six minutes and opens at 10:00. From 18:00 the frame darkens (the veil as today), lamps
come on along every road at the district band (instanced), every building's windows light warm
and dim, published companies' windows light brighter in the accent, kilns and flares glow, the
exchange's band lights, ships and the crane show lights. The clock reads in the corner as today.
The light theme's night is the dark theme's day in tone; dark mode follows the site.

### 3.9 The chain when something is selected (D-V2-9)

- Selecting a block or a lot lights its **one-level chain**: the routes of its links show
  travelling dashes in the direction of the goods (towards the customer) in the live tone;
  measured links solid, expected dashed; linked lots and blocks get a raised outline; everything
  else dims to 22 % as today. The vehicles already on those routes are not changed.
- The card lists suppliers and customers as buttons; "Show full chain" extends to the whole
  connected chain; the frame refits the camera to the lit set at the district band.
- The words "expected, not measured" appear **once** in the card's chain section (with the glyph
  vocabulary), never as a label on every line. A hovered route shows its link note.
- Selecting a vehicle lights its route only (ahead and behind) and its two lots.

### 3.10 Stories and Follow (D-V2-10)

- **Stories** are six curated chains in `docs/world/sources/stories.tsv` (id, title, one-line
  standfirst, ordered list of sub-industry codes, the goods class per hop, the lens it reads best
  at). Appendix B lists them. They are the owner's; the generator emits `stories.generated.ts`.
- A **Stories** control in the frame header (a select on phones, buttons on wide screens) lights a
  story end to end: every hop's route with travelling dashes, every lot outlined, the rest dimmed,
  the reading strip at the frame's foot listing the hops in order with the goods class and the
  joint crossed. Clicking a hop centres it.
- **Follow** (a button on the strip and on any vehicle's card; key `F`): the camera mounts on the
  next vehicle leaving the story's first lot and rides it. At each bay the camera pauses, the
  lot's card opens for four seconds (or until the visitor presses Space), then the ride continues
  on the next hop's vehicle. The ride ends at the last lot with the story's standfirst in the
  card. `Esc` or any drag exits. A ride takes 60–90 s; the strip shows progress.
- Stories need no data: the hops are registry links. If a hop's link is measured, its dashes are
  solid and the card says so.

### 3.11 Cards v2 (D-V2-12)

One card at a time, as today (right dock, bottom sheet on phones), kind · title · status, rows,
sections, actions. New or changed:

| card | rows and sections | actions |
|---|---|---|
| **Company** | name, ticker, sub-industry (button), what it does (one line from the registry, with its source), listing status (confirmed / proposed example with the reason), model status with the glyph; **Suppliers** and **Customers** as buttons from the links with the goods class; **What a model would show** when none is published; **Related analyses** | Open board · Look inside · Follow its goods · Open in Finance in Action |
| **Sub-industry** | as today, plus the two companies as buttons with their status, and the chain section with the single "expected, not measured" note | Open in Finance in Action index · Show full chain |
| **Vehicle** | kind, load, from, to, link state, "Illustrative traffic; see the model for figures" | Follow · Open the supplier · Open the customer |
| **Ship / train** | the quay or yard, the cargo class, where it goes | Follow |
| **Gate** | the joint and its reading at the current lens (as today), the weighbridge, which flows cross it (counted in words) | — |
| **Story** (while a story is lit) | title, standfirst, the hops | Follow · Clear |

No card ever carries a figure unless it is the board's or a published essay's.

### 3.12 Layers and overlays

Layers (logistics, cold chain, credit, energy, governance, regulation) keep their names and data.
Changes: logistics toggles goods vehicles and the logistics park's activity; cold chain toggles
reefers and the cold store's tint and the cold links' routes; credit toggles coins and money dashes
on every route; energy lights the power plant's plume, the pylons and a pulse along the lines to
every block; governance and regulation place their signposts and, from phase D, their pulses. The
shift overlays and the condition marks are unchanged (v1 §7.5).

### 3.13 Search

As today, plus stories by title and vehicles by load ("coal", "clinker"). A result selects and
centres; a story result lights it.

### 3.14 Mobile, reduced motion, print

Phones: the hero view is the estate at ≥ 1.0 px/m on a 390 px stage; the cadence halves; walkers
and smoke are off; lamps stay; the strip is a bottom sheet; Follow works. The "Start the world"
button stays. Reduced motion: the schematic with the note, as today. Print: the schematic.

### 3.15 Accessibility

Everything clickable is reachable by keyboard (§3.4); the canvas description names the new keys;
the reading strip is a list; the hover label is also the selected thing's `aria-live` readout;
colour never carries meaning alone; a story's hops are a numbered list in the strip and in the
card.

### 3.16 Visual language v2

Hairline-and-tone stays. Tones from the site's tokens only (no hex in scene code; tested). Three
face tones per building plus a shadow; four ground tones; one live tone for selection, routes,
coins and lit windows; the accent for published; amber and red reserved for condition marks.
Typography unchanged. The night veil is the existing one.

## 4. Data

### 4.1 Registry additions (generated from `docs/world/sources/`)

| file | change | rule |
|---|---|---|
| `companies.tsv` | new column `does`: one line, factual, present tense, what the company sells or operates, from the issuer's own description, with the source in the existing `source` column | no figures, no market data, no names of people |
| `links.tsv` | new column `goods` (Appendix A's classes); links added so that **no placed sub-industry is isolated** (43 today); every added link has a `note` | all `expected`; a published package overrides at runtime as today |
| `stories.tsv` | new: `id`, `title`, `standfirst`, `hops` (codes separated by `>`), `goods` per hop, `lens` | the owner's; six at launch |
| `placement.tsv` | unchanged columns; the generator computes lots, bays and driveways | the owner reviews placements as before |

`build:registry` emits `stories.generated.ts` and the `goods` and `does` fields; `build:layout`
emits the compacted layout with `lots`, `bays`, `driveways` and the `graph`. Both stay
deterministic for one seed; the byte-for-byte tests are re-approved once at phase A.

### 4.2 Published data

Unchanged (v1 §8.3): one request per session, statuses and flow classes through the boundary,
figures only on the board and the whiteboard. v2 reads from the boundary exactly what v1 reads:
`ModelStatus`, `FlowWeight`, `StationBinding`, `WhiteboardContent`.

## 5. Engine changes

| module | change |
|---|---|
| `src/world/placement/place.ts` | compaction; lots; bays; driveways; the road graph; story routes precomputed and committed |
| `src/world/placement/types.ts` | `Lot`, `Bay`, `GraphNode`, `GraphEdge`, `Story` |
| `src/world/world/build.ts` | lots as entities (`kind: 'company'`) with family forms; block signboards; shadows; resolver → lot |
| `src/world/world/families.ts` | every builder takes a lot-size variant; office-and-sign variant for the large families |
| `src/world/sim/roads.ts` (new) | graph, shortest path with a cache, lanes, queueing |
| `src/world/sim/flows.ts` (replaces `traffic.ts`) | routes from links, cadence, the vehicle life cycle, returns, ships, rail, coins, pulses |
| `src/world/sim/vehicles.ts` (new) | instanced models per kind; instance → entity |
| `src/world/sim/activity.ts` (new) | per-family activity, instanced smoke, lamps |
| `src/world/engine/view/index.ts` | hover with label; instance picking; three LOD bands; Follow camera; `H` |
| `src/world/engine/chain.ts` | travelling dashes on routes; one note; story lighting |
| `src/world/engine/types.ts` | `WorldHandle.follow(id)`, `lightStory(id)`, `onHover`; `Entity.instanceOf` |
| `src/components/world/*` | hover label, the stories control, the strip, Follow, cards v2, search |
| `src/lib/world/constants.ts` | `PLACES` (Hill, `H`), `STORIES` import, `GOODS`, the new key list, the new canvas description |
| `scripts/world/render-poster.mjs` | the hero frame |
| `scripts/world/probe.mjs` | adds `--phone`, vehicles-with-destination count, families-with-activity count |

Rules that stay: no module under `src/world/engine/` or `src/world/sim/` imports the data layer;
`Part.text` throws on a figure in development; no hex outside the theme; no DOM ids; no
`Math.random`; dispose leaves nothing behind.

## 6. Performance budgets

| item | budget |
|---|---|
| draw calls | home and district ≤ 900 / 1,300 at the district band with 300 live vehicles; street ≤ 1,600 |
| frame time | p95 ≤ 16.7 ms on a laptop GPU; ≤ 33 ms on a mid-range phone (reported from the browser suite on the test machine, not asserted there) |
| live vehicles | 300 laptop, 120 phone |
| engine chunks | `world-scene` ≤ 120 kB gzipped; three.js chunks unchanged |
| Lighthouse | flag-on mobile LCP and CLS no worse than `main` (`o8-mobile-lcp.md`'s method) |
| memory | mount and dispose ×10 leaves no listener, loop or context (test exists) |

## 7. Acceptance criteria

All measured on a flag-on build; the probe's table is part of the gate note.

**Scale and pointing (phase A)**
- A1. Home view ≥ 1.2 px/m; a 40 m block ≥ 60 px; `Whole` ≥ 0.75 px/m; content extent ≤ 1,500 × 900 m.
- A2. Hovering a lot, a block, a gate or a fixture shows the pointer and a label within 150 ms.
- A3. Clicking a company's lot at the home, district and street bands selects the company (probe: `clickResolves: company` at all three).
- A4. Every placed sub-industry has two lots with signs; proposed companies included.
- A5. The company card shows what the company does, suppliers and customers, and no figure.
- A6. Flag-off build byte-identical to `main`; poster regenerated and byte-for-byte tested.

**Flows (phase B)**
- B1. Every goods vehicle has an origin lot, a destination lot and a load named after a link; `window.world.all()` reports them.
- B2. At the home view ≥ 40 vehicles are on screen and moving.
- B3. A vehicle crossing a gate stops at the weighbridge; one arriving at a bay unloads.
- B4. No placed sub-industry is isolated; every bay reaches every other bay (unit test on the graph).
- B5. Ships call at the quays; the rail shuttle runs; the six returns run; coins run with the credit layer.
- B6. 300 live vehicles at the district band within the draw-call budget.

**Activity and night (phase C)**
- C1. Every family shows motion at the district band (a frame per family in the gate note).
- C2. At 20:00 every block is lit, published ones brighter; lamps along every road.
- C3. Activity and lamps are instanced; the budget holds.

**Chain, stories, follow (phase D)**
- D1. Selecting any block or lot animates its links with travelling dashes and dims the rest.
- D2. The six stories light end to end; the strip lists the hops.
- D3. Follow rides a story from first to last lot with a card at each stop, in 60–90 s; `Esc` exits; `F` follows a selected vehicle.
- D4. Search finds stories and loads.

**Quality (phase E)**
- E1. Unit suite green with ≥ 40 new tests; the browser suite ≥ 12 cases green, including: click a lot at three bands; hover label; a vehicle's card; a weighbridge stop; a story lit; a Follow ride; night at 20:00; phone at 390 px.
- E2. Zero console errors after 600 simulated seconds; dispose ×10 clean; seeded replay identical.
- E3. Lighthouse flag-on mobile LCP and CLS no worse than `main`.
- E4. Keyboard path complete; canvas description updated; no hex, no figure, no data layer in scene code (rule tests).
- E5. `docs/world/report-v2.md` with the probe before and after, frames, budgets, deviations and the decision log.

## 8. Test plan

- **Unit**: graph reachability; route cache; cadence by class; cap; goods → kind; stories parse
  and resolve to placed codes; lots inside blocks, no overlaps, bays on driveways; compaction
  extent; generator determinism; rule tests extended to the new modules.
- **Engine (jsdom, fake renderer)**: lots are entities; resolver returns a lot; instanced picking
  maps ids; follow state machine; LOD bands with hysteresis; activity pauses with the clock.
- **Browser (Playwright, SwiftShader, `?debug`)**: the probe's measurements as assertions; the
  cases in E1; draw-call budgets; frame-time sampling reported.
- **Visual**: frames per gate; the flag-off regression as today.
- **Performance**: Lighthouse via `scripts/world/lighthouse.mjs --runs 3`.

## 9. Rollout

Each phase a branch and a PR into `main`, CI green, merged. The flag stays off in production;
Preview carries the flags. Gate notes in `docs/world/v2/gates/`. The owner decides production.

## 10. Open decisions for the owner (defaults in brackets)

1. Lots for the large families: office-and-sign at the front [yes] or a halved form [no].
2. Vehicles at 1.25 × metric size [yes].
3. The six stories' hops: as Appendix B, to be refined against the registry [agent proposes, owner
   reviews in the gate D note].
4. Cadence numbers (30 / 18 / 10 s) [as stated; tuned in phase B to meet B2 and B6].
5. The `does` lines: the agent drafts from issuer descriptions with sources; the owner reviews
   [draft at phase A; review table in `docs/world/v2/review-does.md`].
6. Gate mode [continue].

## Appendix A: goods classes and vehicle kinds

| goods | vehicle | examples of links |
|---|---|---|
| bulk | dump truck (ring), hopper trailer (estate), bulk ship, rail wagon | coal to power, ore to smelter, clinker to grinding, limestone to cement |
| liquid | tanker | crude to refinery, naphtha to petrochem, CPO to refinery, fuel to depots |
| cold | reefer | poultry to processing, fish to cold store, dairy to retail |
| boxed | box truck, container trailer, container ship | finished goods to distributors, packaging to manufacturers, components to assembly |
| parcel | van | distributor to retail, retail to households |
| people | bus, walkers | services, health, education, hotels |
| none | coins, pulses | banks to everyone (credit), information |

## Appendix B: the six stories (hops by sub-industry; codes resolved against the registry)

1. **Coal** — coal mine → power plant → (energy to) cement, steel, every estate block; and coal → cement kiln.
2. **Cement** — quarry (limestone) → cement plant → construction → property development → the town.
3. **From well to shelf** — oil and gas well → refinery and petrochemicals → plastics → packaging plant → a consumer-goods manufacturer → distributor → supermarket → households → recovery → recyclate back to processing.
4. **Palm** — plantation → mill → refinery and food manufacturing → distributor → retail.
5. **Nickel** — ore pit → smelter → steel or battery materials → export by ship; with the raw-export road as the counterfactual beside it.
6. **The rupiah upstream** — retail → distributor → manufacturer → processor → mine, as coins with the credit layer on, and the bank towers funding each hop.

## Appendix C: activity by family

| family | activity at the district band |
|---|---|
| pit, quarry | an excavator arm cycling; haul trucks on an internal loop; dust puffs |
| well-pad | a nodding pumpjack; a flare flicker at night |
| stockpile | a conveyor's travelling dashes; a loader cycling |
| plantation-block, field | a harvester or tractor crossing the rows |
| pond | aerator rings; a boat |
| forest-block | a log truck leaving |
| process-plant, factory, packaging-plant | stack smoke or steam; forklifts at the dock; conveyor dashes |
| power-plant | a tall plume; pylon pulse on the energy layer |
| water-plant | ripples in the basins |
| warehouse, 3pl-shed, depot, cold-store | forklifts; trucks docking; compressor puffs (cold) |
| operator-office, office-tower, bank-tower, exchange | walkers at the door; the exchange's band |
| quay | the crane cycling; ships calling; container moves |
| apron | a plane taxiing and taking off on a cadence |
| interchange | cars flowing on the overpass |
| rail-yard | the shuttle; a shunting move |
| market-hall, supermarket, minimarket, department-store, shop, dealership, hotel, restaurant, cinema, school, hospital, clinic, lab | walkers in and out; vans; cars parking (dealership); an ambulance (hospital) |
| recycling-plant, scrap-yard, compost-site | conveyor; a crane magnet; steam puffs |
| telecom-tower | a blinking beacon |
| construction-site | the crane swinging; a hoist climbing |
| think-tank | lights; walkers on the terrace |
