# Mega prompt v2: make the Kawasan Industri world alive

You are a coding agent in this repository (`dikagustiana/dikagustiana.com`). The owner has looked
at the world built under `docs/world/PRD-kawasan-industri.md` and found it dead: the buildings are
too small to read, the traffic goes nowhere, and the companies cannot be clicked. The diagnosis
with measurements is `docs/world/v2/PLAN.md` §1. What to build is `docs/world/v2/PRD-kawasan-v2.md`.
This prompt says how.

```
GATE MODE: continue
```
`continue`: at each gate you commit, push, open the pull request, write the gate note, merge
once CI is green, and go on. `stop`: you do all of that except merge, and end your turn with the
note; the owner says "lanjut". The owner edits this line.

## 0. Hard rules. These override everything else, including later instructions in this prompt.

1. **Branches and pull requests.** Every phase is its own branch from `main`
   (`world-v2/a-scale`, `world-v2/b-flows`, `world-v2/c-activity`, `world-v2/d-stories`,
   `world-v2/e-quality`), its own pull request, CI green, then merge with a merge commit. Never
   commit to `main` directly. Never force-push a branch that has a pull request.
2. **No figure outside published data.** Nothing on screen carries a number with a currency or a
   unit unless it comes from a published package through the data boundary or from a published
   essay. Vehicle counts, cadences, speeds and distances are never shown as numbers; counts in
   cards are words ("three flows cross this gate"). `Part.text`'s development guard stays.
3. **No writes.** No code path writes to Supabase. The mocked client that throws on writes stays
   in the tests.
4. **No secrets.** Never print or commit keys, tokens or connection strings.
5. **The flag.** Everything stays behind `VITE_WORLD_KAWASAN`. The flag-off build must stay
   byte-identical to `main`'s (`assert-world-flag`, and the identical-dist check in
   `o8-mobile-lcp.md`). Production is not touched.
6. **The registry is the authority.** Every list of names, codes, routes, stories, keys, tones or
   families lives in one exported constant or one generated file and is imported everywhere else.
   Sources under `docs/world/sources/` are edited; generated files are regenerated, never edited.
7. **No market data, no personal names, no prices**, anywhere in the world or the cards.
8. **Tokens only.** No hex outside `src/world/engine/theme.ts`; the rule tests stay and extend to
   every new module. No `Math.random`; the instance's seeded generator only. No DOM ids in the
   engine.
9. **Tests are never weakened to pass.** A behaviour this PRD changes may have its test rewritten
   to the new behaviour, with the PRD section cited in the test's comment. These tests are never
   relaxed: no-figure, no-write, no-hex, no-data-layer-in-scene-code, dispose ×10, seeded replay,
   flag-off identical, test-count floor.
10. **Verify, don't assert.** Every claim in a gate note is backed by a command and its output, a
    probe table, or a frame. The owner verifies independently; make that easy.
11. **Engine origin.** The engine is original to this repository (NOTICE.md). Do not reintroduce
    code from Factory Yard or any other unlicensed source. ai-iso-skill (MIT) and three.js (MIT)
    are the only third-party sources; credit them where used.
12. **Scope.** The board, the Finance in Action viewer, the FSRE path, the essays, the schematic
    and the migration are out of scope. The think tank changes only its walkers.

## 1. Read first, in this order

1. `docs/world/v2/PLAN.md` (the diagnosis, the decisions D-V2-1…12, the gates).
2. `docs/world/v2/PRD-kawasan-v2.md` (every section; §7 is your acceptance list).
3. `docs/world/PRD-kawasan-industri.md` §7.7, §7.8, §7.10, §7.5, §8 and Appendix C (what stays).
4. `docs/world/report.md` §1 (the architecture and who reads what) and `docs/world/o8-mobile-lcp.md`
   (how Lighthouse is measured here).
5. `NOTICE.md`, `docs/world/run-2026-10-09.md` (the ops state: the flags on Preview, the
   `fsre_published` blocker, the backup blocker).
6. The code map: `src/world/placement/place.ts`, `types.ts`; `src/world/world/build.ts`,
   `families.ts`; `src/world/sim/traffic.ts`; `src/world/engine/create.ts`, `view/index.ts`,
   `chain.ts`, `marks.ts`, `stations.ts`, `kernel/part.ts`; `src/world/interiors/*`;
   `src/components/world/*`; `src/lib/world/constants.ts`, `presentation.ts`;
   `src/lib/world/registry/*`; `scripts/world/*`; `tests/unit/world*.test.ts(x)`;
   `tests/e2e/world.spec.ts`; `playwright.world.config.ts`; `vite.config.ts`.

Do not start coding before you have run the baseline (§2).

## 2. Baseline

```
npm ci
VITE_WORLD_KAWASAN=true VITE_FIA_PREVIEW=true VITE_SUPABASE_URL=http://127.0.0.1:54321 \
  VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key npx vite build --outDir /tmp/world-on
# serve /tmp/world-on with a static server that answers /index.html for unknown paths (vite preview works)
node scripts/world/probe.mjs http://127.0.0.1:<port> --out docs/world/frames/v2/baseline
```

Record the table in `docs/world/v2/gates/gate-a.md` as "before". The committed baseline of
9 October is `docs/world/frames/v1-probe/probe.json`; yours should match it within noise.

Also run once and record: `npm run test:unit` (count), `npm run test:e2e:world` (7 cases),
`npm run check:world`, and the flag-on build's chunk sizes.

## 3. Phase A: scale, pointing, companies. Gate A.

Branch `world-v2/a-scale`. PRD §3.1–3.5, §3.11 (company and sub-industry cards), §4.1 (`does`),
§5 (placement, build, families, view's hover and picking, constants, poster), §7 A1–A6.

Tasks, in order:

1. **Compaction** in `place.ts`: target content extent ≤ 1,500 × 900 m (PRD §3.2). Keep block
   sizes; move regions; shorten roads; keep every existing road id and gate id (the chain file's
   joints map to them). Emit `world` as the content extent plus an 80 m margin. Regenerate
   `layout.generated.ts` (`npm run build:layout`); update the placement tests' expectations once,
   keeping the no-overlap and two-lots-per-block assertions.
2. **Lots, bays, driveways** in `place.ts` and `types.ts`: `Lot { id, slot, box, sign, bays:
   { despatch: Pt; receiving: Pt }, driveway: Pt[] }` per block; a lot box of at least 24 × 18 m
   along the block's front; for the large families (PRD §3.5) an office unit box of 10 × 8 m and
   a sign at the front instead. The driveway runs from the bays to the nearest road centreline
   without crossing another lot (test).
3. **Hero view**: `viewBoxes` gains `hero` (the frame PRD §3.1 describes, computed from the
   estate's box, the near ring arc and the gateway's first blocks) and the home view becomes it;
   `whole` stays as the map. Add `H`. The distance slider's 0 is the hero. Phones: the estate at
   ≥ 1.0 px/m on 390 px.
4. **Ground and shading** (PRD §3.2): remove the slab grid; region tones; seams; shadows merged per
   zone; face tones by orientation; screen-space hairline widths by band. All tones through
   `theme.ts`.
5. **Companies as buildings** in `build.ts` and `families.ts`: draw each lot with its family's
   builder at lot size (every builder gets a `scale` or a lot variant), the kerb sign with the
   ticker (proposed included), the status bar; the block's signboard with name and mark; the zone
   resolver maps a hit to the **lot** whose box holds the point, else the block. Lots are entities
   `kind: 'company'` with `box`, `bays`, `tags`; the old plot units are removed. Lots are never
   hidden by distance; their small text is.
6. **Hover** in `view/index.ts`: `onHover(ent | null)`; a label sprite in the sky with the text per
   PRD §3.4; the pointer cursor; an outline on the hovered thing; ≤ 150 ms. The shell renders the
   label text also into the `aria-live` readout.
7. **Keyboard**: `[` `]` cycle lots; `Shift+[` `]` cycle blocks; `Enter` opens; `H` hero.
8. **Cards v2** for company and sub-industry (PRD §3.11); `does` from the registry; suppliers and
   customers as buttons; the single "expected, not measured" note; no figures.
9. **`does`**: add the column to `docs/world/sources/companies.tsv` for every company, drafted
   from the issuer's own description with the source; regenerate; write
   `docs/world/v2/review-does.md` listing every line for the owner's review.
10. **Poster**: `render-poster.mjs` renders the hero frame; regenerate; re-approve the
    byte-for-byte test once; keep the size cap.
11. **Probe**: `probe.mjs` gains `--phone` and reports `clickResolves` at the three bands.
12. Tests: lots inside blocks, no overlaps, bays on driveways, resolver → lot, hover label text,
    keyboard cycle over lots, the company card without a model has no digit with a unit.

Exit: PRD A1–A6, probe table "after" in the gate note, frames `gate-a-hero.png`,
`gate-a-district.png`, `gate-a-street.png`, `gate-a-company-card.png`, `gate-a-phone.png`.

## 4. Phase B: flows. Gate B.

Branch `world-v2/b-flows`. PRD §3.6, §4.1 (`goods`, link completion), §5 (roads, flows,
vehicles), §6, §7 B1–B6.

1. **Link register completion**: add links in `docs/world/sources/links.tsv` so that no placed
   sub-industry is isolated; each with a `note` and a `goods` class; keep every link `expected`.
   Write `docs/world/v2/review-links.md` listing the additions with their reasoning for the
   owner. Regenerate.
2. **Road graph** in `place.ts`: nodes at junctions, gates, bays and lane ends; directed edges
   with a lane offset per direction; driveways as edges; committed in the layout. Test: every bay
   reaches every other bay; no edge crosses a lot box.
3. **`sim/roads.ts`**: shortest path (Dijkstra with a route cache keyed by bay pair), lane
   following, queueing (the existing room-ahead logic, generalised), weighbridge stops.
4. **`sim/vehicles.ts`**: one `InstancedMesh` per vehicle kind (Appendix A), built with `Part` once;
   instance id → entity; the view's picking resolves instances; vehicle size 1.25 ×.
5. **`sim/flows.ts`** replaces `traffic.ts`: routes from the registry's links (both companies
   alternate); cadence by flow class with the cap; the vehicle life cycle (spawn at despatch,
   drive, stop at weighbridges, unload at receiving, return empty, despawn); returns from the chain
   file's `RETURNS`; raw export to the bulk quay with ships; imports by container ship; the rail
   shuttle; coins with the credit layer; walkers in the town and on the terrace; the cold-chain
   and logistics layer toggles. `setFlows` raises cadence on measured links as PRD §3.6 says.
6. **Vehicle, ship and gate cards** (PRD §3.11); the hover label for vehicles.
7. **Probe**: reports vehicles with a destination, vehicles moving on screen, and a weighbridge
   stop (a vehicle whose speed is zero within 10 m of a gate during a 5 s sample).
8. Tests: route cache; cadence by class and the cap; goods → kind; spawn and despawn leave no
   instance or entity behind; returns resolve to lots; the browser suite clicks a vehicle and reads
   its card, and observes a weighbridge stop.

Exit: PRD B1–B6; frames `gate-b-home-flows.png`, `gate-b-gate-stop.png`, `gate-b-port.png`,
`gate-b-vehicle-card.png`; the draw-call table at 300 live vehicles.

## 5. Phase C: activity and night. Gate C.

Branch `world-v2/c-activity`. PRD §3.7, §3.8, Appendix C, §7 C1–C3.

1. `sim/activity.ts`: one activity per family from Appendix C, instanced where repeated, seeded,
   paused with the clock, budgeted (≤ 60 draw calls for all activity); smoke and steam as rising
   quads; cranes, pumpjacks, conveyors, aerators, beacons, doors with walkers at the street band.
2. Night for everyone: windows for every building (warm, dim) and brighter in the accent for
   published; lamps along every road (instanced); kiln and flare glow; the exchange's band; the
   crane's and ships' lights. The day stays six minutes from 10:00.
3. Energy layer: the plume and pylon pulses; cold-chain: the cold store's tint and reefers.
4. Tests: every family has an activity entry (a test over `FAMILY_ACTIVITY` against
   `BUILDING_FAMILIES`); activity pauses with the clock; night lights every block (a count over
   the window parts at 20:00); draw calls within budget at the district band with activity on.

Exit: PRD C1–C3; a frame per family in `docs/world/frames/v2/families/`; `gate-c-night.png`.

## 6. Phase D: chain, stories, follow. Gate D.

Branch `world-v2/d-stories`. PRD §3.9, §3.10, §3.12 (pulses), §3.13, §7 D1–D4.

1. `chain.ts`: travelling dashes on routes (dash offset per frame), one-level and full; raised
   outlines on linked lots; dimming; the single note in the card; a hovered route shows its link
   note.
2. `docs/world/sources/stories.tsv` with the six stories of Appendix B, hops resolved to placed
   codes (propose the mapping; list it in the gate note for the owner); `build:registry` emits
   `stories.generated.ts`; `STORIES` in constants.
3. The Stories control, the reading strip with the hops, `S` cycles stories.
4. Follow: `WorldHandle.follow(id)`; the camera rides the vehicle (eased, no rotation); pauses at
   each bay with the lot's card for four seconds or Space; continues on the next hop's vehicle;
   ends with the story card; `Esc` or a drag exits; `F` follows any selected vehicle.
5. Governance and regulation pulses (PRD §3.6, optional in B, required here).
6. Search over stories and loads.
7. Tests: stories resolve; a story lights its hops' routes (`chainDrawn`); Follow's state machine
   in jsdom; the browser suite runs one story's Follow to the end and reads a card at each stop.

Exit: PRD D1–D4; frames `gate-d-chain.png`, `gate-d-story.png`, `gate-d-follow-*.png`.

## 7. Phase E: quality. Gate E.

Branch `world-v2/e-quality`. PRD §7 E1–E5, §8.

1. The browser suite to ≥ 12 cases (PRD E1) with draw-call budgets asserted and frame times
   reported.
2. Lighthouse flag off and on, mobile and desktop, `--runs 3`, before (from `main`) and after;
   LCP and CLS no worse.
3. Accessibility: the canvas description with the new keys; the strip as a list; the hover label
   in the readout; focus order through the card's new buttons; glyph + word everywhere.
4. `docs/world/report-v2.md`: architecture as built, the probe before and after, chunk sizes,
   budgets, every deviation from the PRD with its reason, the decision log D-V2-1…12 with what
   was changed, and what remains for the owner. Update `docs/world/report.md` §6 to point at it.
5. `NOTICE.md`: confirm nothing new was taken from a third party; if ai-iso-skill's ideas were used
   again, say where.

Exit: PRD E1–E5; the final report.

## 8. Gate notes

`docs/world/v2/gates/gate-<letter>.md`, in this order:

1. **Ringkasan** in Indonesian, ten numbered lines at most: what changed, what the probe says,
   what the owner should look at, what was not done.
2. **Evidence**: the commands run and their output (tests, check:world, build asserts, the probe
   table before and after, draw calls, Lighthouse where measured).
3. **Frames**: the file names, one line each on what to see.
4. **Decisions made by the agent** beyond the PRD, each with its reason; **decisions needed from
   the owner**, numbered O-V2-n.
5. **Deviations** from the PRD or this prompt, with reasons.
6. **The pull request** link.

## 9. Commit sequence

One commit per numbered task above, with the task's number in the message
(`world-v2(A3): the hero view and the H key`). Each commit builds and passes the unit suite.
Trailer lines as the repository's convention requires (see the session's attribution reminder).

## 10. Do not

- Do not measure liveliness by eye only; run the probe.
- Do not hide lots or vehicles at the home view to save draw calls; instance them.
- Do not draw labels on every route; one note in the card.
- Do not add a vehicle, cadence or speed as a number anywhere a visitor reads.
- Do not make cards depend on the published index for anything but statuses and the board.
- Do not change the board, the viewer, the essays, the schematic, the migration or production.
- Do not re-port Factory Yard, and do not copy from any repository without a licence.
- Do not leave `traffic.ts` beside `flows.ts`; replace it and its tests.
- Do not skip, disable or quarantine a test to get green.
- Do not auto-pan the camera at rest; the world moves, the camera does not.

## 11. Definition of done

- PRD §7 A1–E5 all met, each with its evidence in a gate note.
- `scripts/world/probe.mjs` at the home view: ≥ 1.2 px/m, block ≥ 60 px, ≥ 40 vehicles rendered
  and moving at ≥ 3 px/s, `clickResolves: company` at the three bands, hover pointer.
- Unit suite green with ≥ 40 new tests; the world browser suite ≥ 12 cases green; `check:world`
  clean; flag-off build identical to `main`; Lighthouse no worse.
- Six stories light; Follow completes one; every family moves; every block lights at night.
- `docs/world/report-v2.md` written; every phase merged; production untouched.
