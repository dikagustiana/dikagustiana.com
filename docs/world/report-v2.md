# Kawasan v2: the report

The world made alive, as `docs/world/v2/PRD-kawasan-v2.md` asked and `docs/world/v2/MEGA-PROMPT-kawasan-v2.md`
ran it: five phases, each a branch, a pull request with green CI and a gate note in `docs/world/v2/gates/`, from
`main` at `edc944a` (v1) to phase E. Everything is behind `VITE_WORLD_KAWASAN`; with the flag off the build is
byte-identical to `main` at every gate; production is untouched.

| phase | what it did | pull request | gate note |
|---|---|---|---|
| A | scale and the hero, pointing (hover, click, keyboard), companies as buildings, what each does | [#53](https://github.com/dikagustiana/dikagustiana.com/pull/53) | `gates/gate-a.md` |
| B | flows on a road graph: every goods vehicle from a supplier's lot to a customer's, gates and weighbridges, the port, the returns, coins | [#55](https://github.com/dikagustiana/dikagustiana.com/pull/55) | `gates/gate-b.md` |
| C | every family's activity, night for every building, the energy and cold-chain layers | [#56](https://github.com/dikagustiana/dikagustiana.com/pull/56) | `gates/gate-c.md` |
| D | the chain on the roads, six stories, Follow, the governance and regulation pulses, search by story and load | [#57](https://github.com/dikagustiana/dikagustiana.com/pull/57) | `gates/gate-d.md` |
| E | quality: the browser suite's budgets and keyboard path, Lighthouse, this report | PR_E | `gates/gate-e.md` |

## 1. Architecture as built

```
src/world/placement/        the layout (compacted, lots, bays, driveways, the road graph), generated and committed
src/lib/world/registry/     the registry: sub-industries, links (with goods), stories, generated from docs/world/sources/
src/world/engine/
  create.ts                 createWorld: theme → context → the scene's builders → flows → activity → view → chain,
                            Follow, the frame loop; the handle and the debug API (window.world, ?debug)
  view/index.ts             the camera (hero, places, bands of detail with hysteresis), hover and click on instances,
                            the keyboard, the selection's frame, framing a box, keeping over a moving point
  chain.ts                  the chain on the roads: travelling dashes, raised outlines, dimming, route notes, stories
  follow.ts                 Follow's state machine: ride, glide, stop, end; the time-lapse that fits 60–90 s
  theme.ts                  tokens to materials; night (windows, lamps, fires, the exchange's band, the sink)
src/world/world/            the scene's builders: blocks and lots by family (with their activity anchors), roads, gates
src/world/sim/
  roads.ts                  the lanes, routing (Dijkstra, cached), stops at weighbridges, room ahead, merges, give-way
  flows.ts                  the flows (a link's goods, the returns, the raw export, the imports), the vehicles' lives,
                            ships, the rail shuttle, coins, the governance and regulation pulses, a link's routes
  vehicles.ts               the vehicle kinds and their instanced fleet (1.25 × metric size)
  activity.ts               every family's activity, the lamps and their pools, booms, the energy line, cold tint
src/components/world/       the shell: the frame (header, stage, strips), cards, search, the board host, the poster
```

What reads what: the shell reads the registry and the published data (through `src/world/data/boundary.ts`) and gives
the engine statuses and flow classes only; the engine never reads a figure. The chain and the stories read the
link register; a published package marks a link measured at runtime.

## 2. The probe, before and after

`scripts/world/probe.mjs` on a flag-on build, Chromium 1440 × 900 (a 1,246 × 700 stage), SwiftShader, a two-second
speed window from gate C (one second before). v1 is `docs/world/frames/v2/baseline/`; each gate's is under
`docs/world/frames/v2/gate-<letter>/`.

| measure (home view unless named) | v1 | A | B | C | D, E | v2 target (PRD §2.3) |
|---|---|---|---|---|---|---|
| px per metre | 0.42 | 1.25 | 1.25 | 1.25 | **1.25** | ≥ 1.2 |
| a 40 m block | 24 px | 71 px | 71 px | 71 px | **71 px** | ≥ 60 px |
| vehicles on screen and moving | 47 of 47 | 27 of 27 | 177 of 208 | 181 of 208 | **182 of 211** | ≥ 40 |
| truck speed on screen (SwiftShader) | 1.4 px/s | 4.3 | 3.6 | 3.8 | **4.7** | ≥ 3 here, ≥ 8 on a GPU |
| truck length on screen | 5 px | — | 18.8 px | 18.8 px | **18.8 px** | ≥ 18 px |
| goods vehicles with origin, destination and load | 0 of 122 | — | 283 of 283 | 284 of 284 | **289 of 289** | all |
| click at INTP's lot selects | the building | the company | the company | the company | **the company** (every band) | the company, at every distance |
| hover | cursor only | pointer, label, pick ≤ 15 ms | ″ | ″ | ″ | pointer + label ≤ 150 ms |
| placed sub-industries with no link | 43 | 0 | 0 | 0 | **0** | 0 |
| families with activity at the district band | 2 | 2 | 2 | 44 (37 stand in the world) | **44** | all 44 |
| blocks lit at night | 0 | 0 | 0 | 125 of 125 | **125 of 125** | all, published brighter |
| stories a visitor can follow | 0 | 0 | 0 | 0 | **6** | 6 |
| draw calls home / map / street | 317 / — / 95 (near) | 236 / 283 / 91 | 188 / 217 / 92 | 216 / 249 / 120 | **216 / 249 / 120** | ≤ 900 / ≤ 1,300 / ≤ 1,600 |
| phone home: px/m, moving | — | 1.00, 11 of 11 | 1.00, 42 of 45 | 1.00, 41 of 44 | **1.00, 44 of 44** | ≥ 1.0 |

## 3. Chunks and budgets

| item | budget (PRD §6) | v1 | after |
|---|---|---|---|
| `world-scene` (gzip −9) | ≤ 120 kB | 30.9 kB | 53.9 kB (140,132 bytes) |
| `WorldFrame` (gzip −9) | — | 44.1 kB (`main` before phase D; it carries the shell, grown by other work on `main` too) | 45.7 kB |
| three.js chunks | unchanged | three-core 50.2 kB | unchanged since B |
| draw calls, district band, 300 live vehicles | ≤ 1,300 | 682 (estate) | 184 at the estate, 249 on the map (probe); asserted in the browser suite |
| live vehicles | 300 laptop, 120 phone | 122 | cap 300 / 120 (the spawner holds below the cap while a sixth of the fleet stands, O-V2-6) |
| frame time | p95 ≤ 16.7 ms on a GPU | — | reported by the browser suite on SwiftShader, not asserted |
| mount and dispose ×10 | no listener, loop or context left | tested | tested |

## 4. Tests

| suite | before v2 | after | what v2 added |
|---|---|---|---|
| unit (`vitest`, floor actual − 4) | 1,076 | **1,152** (floor 1,148) | 76 tests: scale, lots, the hero and the keyboard (A); the road graph, flows, vehicles, cards and picking by instance (B); every family's activity, night, the layers (C); the chain on the roads, the stories, Follow, the pulses, search (D); the header's named groups (E) |
| browser (`test:e2e:world`, SwiftShader) | 7 | **14** | click and hover at three bands; a vehicle's card; a weighbridge stop and an unloading; night at 20:00 with every family's activity; a story lit; a Follow ride to its end with a card at each stop; the keyboard path through the stories and Follow; PRD v2 §6's draw-call budgets |
| rules | — | kept | no hex outside `theme.ts`, no `Math.random`, no DOM id in the engine, no figure on a card or in `Part.text`, no data layer in scene code, no Factory Yard code, mount and dispose ×10, the seeded replay, the flag-off build identical (`check:world`, `assert-world-flag`, the rule tests) |

No test was skipped, disabled or relaxed. Rewritten tests cite their PRD section in their gate note: the chain's
translucency count (C), the debug `tick(dt)` made exact (C), the chain test for routes on the roads (D), the vehicle
card's actions (D).

## 5. Lighthouse

`scripts/world/lighthouse.mjs --runs 3` (lighthouse 13.5.0, simulated throttling, the medians of three rounds; each
round runs every configuration once), on builds pointed at a dead Supabase URL, served locally: before is v1
(`main` at `edc944a`), after is phase D's head. Reports and `lighthouse.json` in
`docs/world/frames/v2/lighthouse/{before,after}/`.

| page | performance | LCP | CLS | TBT | FCP |
|---|---|---|---|---|---|
| flag off, mobile | 79 → 81 | 4.32 s → 4.21 s | 0.011 → 0.007 | 116 → 86 ms | 2.96 s → 2.87 s |
| flag off, desktop | 98 → 98 | 0.88 s → 0.90 s | 0.001 → 0.001 | 0 → 0 ms | 0.65 s → 0.63 s |
| **flag on, mobile** | 81 → 80 | **4.23 s → 4.28 s** | **0 → 0** | 59 → 87 ms | 2.79 s → 2.81 s |
| flag on, desktop | 80 → 83 | 0.94 s → 0.92 s | 0 → 0 | 383 → 323 ms | 0.64 s → 0.62 s |

The flag-on mobile LCP element is the poster in both (`/world/poster-far.svg`). Its three runs read 4.20, 4.23 and
4.32 s before and 4.27, 4.28 and 4.40 s after; the flag-off page, with no world code in it, moved by 108 ms between
the two passes. What the page loads before the poster grew by 1.4 kB (the poster of the new hero, 0.5 kB; the
header's Stories row, 0.9 kB). To separate the two from the machine's drift, the
flag-on mobile page of v1 and of v2 were then measured against each other in one pass, five interleaved rounds
(`lighthouse/ab-mobile/`, where `off` is v1 with the flag on and `on` is v2 with the flag on):

| flag on, mobile, five interleaved rounds | LCP (median; runs) | CLS | TBT | FCP | performance |
|---|---|---|---|---|---|
| v1 (`edc944a`) | 4.24 s (4.24, 4.43, 4.24, 4.24, 4.32) | 0 | 88 ms | 2.84 s | 80 |
| v2 (phase D) | **4.22 s** (4.22, 4.22, 4.25, 4.30, 4.18) | **0** | 75 ms | 2.78 s | 81 |

**E3 holds: the flag-on mobile LCP and CLS are no worse than v1's** (LCP 20 ms better, CLS 0 in both); the first
pass's 43 ms was the machine's drift between passes.

## 6. Deviations from the PRD, with their reasons

Each gate note's §5 lists its own; these are the ones that change what the PRD describes.

- **Hero (A).** The hero frames the layout's own hero box at 1.25 px/m on the 1,246 px stage, 1.0 on a phone; the
  town's blocks grew to 44 × 28 m so each holds two lots (O-V2-2).
- **Flows (B).** Vehicles weigh only on the laden leg (O-V2-5); the spawner holds while a sixth of the fleet stands,
  so the live count floats below the cap (O-V2-6); parcel vans are below the 18 px every truck meets (O-V2-7).
- **Night (C).** The engine darkens unlit surfaces itself and the shell's veil only finishes it (0.25, from 0.55),
  so lights can read (O-V2-8); smoke fades by shrinking (one opaque instanced draw); seven families stand nowhere
  (O-V2-9).
- **Stories (D).** Two links were added so the stories run end to end (D113 → C222, B144 → J113); the cement story
  starts at the cement plant and ends at the estate's developer; the rupiah upstream is glided, its coins being the
  credit layer's (O-V2-10).
- **Follow (D).** It sends the hop's vehicle rather than waiting for the next to leave, runs the world up to ten
  times faster while it rides so a story takes 60–90 seconds (the clock keeps its pace), glides the hops no vehicle
  carries, and leaves a vehicle stuck in a queue to glide on to its bay (O-V2-11).
- **The probe (C).** Its speed window is two seconds: SwiftShader draws about two frames a second, and one slow
  frame halved a one-second reading.

## 7. The decision log

The PRD's decisions (D-V2-1…12, `v2/PLAN.md`), with what was built:

| decision | built | gate |
|---|---|---|
| D-V2-1 the home view is a composed hero at ≥ 1.2 px/m | the hero frame at 1.25 px/m (1.0 on a phone); `H` returns to it; `Whole` is the map | A |
| D-V2-2 the layout is compacted | content extent within 1,500 × 900 m; the generator packs blocks to lots, bays and driveways | A |
| D-V2-3 the survey grid goes | ground in region tones with a seam; no grid | A |
| D-V2-4 companies are buildings | two lots per block, each a company's form or office unit with its kerb sign; the lot is the click target at every band | A |
| D-V2-5 flows replace traffic | a road graph with lanes, routing, weighbridges and bays; a flow per link, the returns, the raw export, the imports; `traffic.ts` removed | B |
| D-V2-6 the link register is completed | no placed sub-industry isolated; every link with goods and a note; two more for the stories | A, D |
| D-V2-7 every family has an activity | 44 families' activity on their builders' anchors, instanced, within 60 draw calls; no smoke on a phone | C |
| D-V2-8 night is for everyone | every building's windows warm, published brighter in the accent, lamps along every road and at every block; a six-minute day | C |
| D-V2-9 the chain is drawn as flow | routes on the roads with travelling dashes, raised outlines, one note in the card, a route's note on hover, a vehicle's own route | D |
| D-V2-10 stories and Follow | six stories in `stories.tsv`, the Stories control, the strip, the story card, `S`; Follow with stops, glides and the 60–90 s ride; `F` | D |
| D-V2-11 instancing | vehicles, coins, activity, lamps, pools, pulses: one `InstancedMesh` per model; picking resolves instance ids | B, C, D |
| D-V2-12 cards v2 | the company card without a model (what it does, suppliers and customers as buttons); vehicle, gate, story and route cards | A, B, D |

The agent's own decisions are in each gate note's §4.

## 8. What remains for the owner

Collected from the gate notes (each with its context there):

1. **O-V2-1.** Review the `does` lines in `v2/review-does.md` (the 57 marked **check** first).
2. **O-V2-2.** The town's blocks at 44 × 28 m for two lots each, or halved forms.
3. **O-V2-3.** `companies.tsv` holding every company's row, or the `does` lines in a table of their own.
4. **O-V2-4.** The 150 ms hover is met by the engine (≤ 16 ms to pick); please confirm it on the Vercel preview with
   a GPU (on SwiftShader the pointer's round trip is frame-bound).
5. **O-V2-5.** Weighing on the laden leg only, or both ways.
6. **O-V2-6.** The spawner's hold at a sixth of the fleet standing, or a fuller fleet with longer queues.
7. **O-V2-7.** Parcel vans below 18 px at the hero, or drawn larger than 1.25 ×.
8. **O-V2-8.** Night in the engine with a light veil, or a darker veil with dimmer lights.
9. **O-V2-9.** Seven families no block uses: keep for later sub-industries, or retire.
10. **O-V2-10.** The stories' mapping and the two links added for them.
11. **O-V2-11.** Follow's time-lapse, or real-time rides of several minutes.

And as before v2 (`report.md` §6): the flag on production is the owner's; `fsre_published` and the backups first.
