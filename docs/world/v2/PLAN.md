# Kawasan Industri v2: the plan

| | |
|---|---|
| Date | 9 October 2026, `main` at `edc944a` (after PRs #45–#49) |
| Owner | Dika Gustiana Irawan |
| Status | Draft for the owner. The companion PRD (`PRD-kawasan-v2.md`) and execution prompt (`MEGA-PROMPT-kawasan-v2.md`) are written against this plan |
| Supersedes | Nothing by itself; v1's PRD §7, §9, §10, §15 and §16 are replaced by PRD v2 once the owner approves it |

## Ringkasan untuk Mas

Dunianya mati karena tiga hal yang bisa diukur, bukan karena selera:

1. **Skala.** Di tampilan awal, 1 meter = 0,42 piksel. Gedung 40 m jadi 24 px, truk 12 m jadi 5 px.
   Dunia 2.460 × 1.440 m dipaksa masuk bingkai 1.246 × 700 px. Apa pun yang bergerak tidak terlihat.
2. **Gerak tanpa arti.** 122 kendaraan berputar di ring road dan jalan generik, semuanya "carrying:
   goods". Tidak ada satu pun barang yang berangkat dari pemasok ke pelanggan. 126 link rantai
   hanya muncul sebagai garis putus-putus statis saat gedung diklik, semuanya berlabel "expected,
   not measured". Lampu malam, truk tambahan dan garis solid semuanya digantungkan pada model yang
   terpublikasi, dan jumlah model terpublikasi adalah nol.
3. **Perusahaan tidak bisa diklik.** Plot perusahaan (4,2 m tinggi) dibangun *di dalam* geometri
   gedung sub-industri (10 m tinggi), jadi raycast selalu mengenai gedung. Di tiga jarak kamera,
   klik pada INTP selalu memilih B121. Perusahaan hanya bisa dicapai lewat tombol di kartu gedung.

v2 memperbaiki ketiganya dengan urutan: (A) skala, komposisi, hover, dan perusahaan sebagai
bangunan; (B) aliran barang pemasok→pelanggan di atas graf jalan; (C) aktivitas per keluarga
bangunan dan malam untuk semua gedung; (D) rantai yang menyala dan "Follow": kamera mengikuti
satu muatan dari tambang ke toko; (E) mutu, uji, Lighthouse. Setiap fase satu PR, CI hijau, merge.
Aturan lama tetap: tidak ada angka di luar model terpublikasi, tidak ada tulisan ke database,
flag tetap mati di produksi sampai Mas bilang nyala.

---

## 1. Diagnosis, with the numbers

Measured on 9 October 2026 with `scripts/world/probe.mjs` (added by this plan) against a flag-on
build of `main` at `edc944a`, Chromium 1440 × 900, the stage 1,246 × 700 px, SwiftShader. Frames
and the JSON are in `docs/world/frames/v1-probe/`.

| view | px per metre | a 40 m block on screen | vehicles rendered, on screen and moving | truck speed on screen | draw calls | click at INTP's anchor selects |
|---|---|---|---|---|---|---|
| home (`whole`) | 0.42 | 24 px | 47 of 47 | 2.1 px/s | 317 | the building B121 |
| middle (`estate`) | 1.39 | 78 px | 23 of 23 | 34 px/s | 648 | the building B121 |
| near (distance 1) | 16.25 | 919 px | 0 of 0 | 0 | 95 | the building B121 |

(Only rendered movers count: the LOD hides the walkers at the home view and the layers hide the
reefers and coins. SwiftShader renders at a few frames per second, so px/s understates a real GPU
by roughly 3×; the ratio between views holds. At the home view 47 vehicles are on screen, so the
failure is not their number but their size and speed: a truck is 5 px long and moves two pixels a
second.)

### 1.1 Root causes

**R1. The world is too large for its frame.** `layout.world` is 2,460 × 1,440 m; the drawn
content spans 2,270 × 1,090 m (blocks from x −651 to 1,620). The home view fits the whole slab at
0.42 px/m. At that zoom hairline edges collapse, the 34 manufacturing blocks read as one grey
texture, and motion is sub-pixel per frame. The town is 1,000 m east of the estate across empty
grid. The slab's survey grid is drawn everywhere, which flattens the scene into a blueprint.

**R2. Motion carries no meaning.** `src/world/sim/traffic.ts` spawns 23 trucks, 6 loop vehicles,
3 raw-export trucks, 5 reefers, 14 vans, 14 coins, 2 forklifts, 1 train and 54 walkers on generic
lanes (ring clockwise and anticlockwise, main road, three radials, town streets). Every vehicle
loops forever with `carrying: 'goods'`; none has an origin, a destination, a stop, a load or an
unload. The 126 registry links (supplier → customer) are never driven. They appear only in
`src/world/engine/chain.ts` as static lines at z = 7 between block anchors when a building is
selected, each labelled "expected, not measured" (five labels overlap in the estate frame).

**R3. Liveliness was gated on published data.** By design (v1 D7, §7.12): windows light at night
only for published companies; measured links are solid only with a published package; extra trucks
run only for measured links. There are 0 published packages and the index is in outage
(`fsre_published` does not exist yet), so every one of those signals is off. The world's life must
not depend on data that may stay empty for months.

**R4. Company plots are buried.** For B121 the block is 70 × 50 m; its two plots are 30.5 × 14 m in
the front 17 m strip (y −171 to −157). The `process-plant` family draws its 10 m slab over the
inset block (y −200 to −158) — over the plots. The plot units (4.2 m tall) sit inside the slab, so
`pickAt` returns the zone part, whose resolver answers the building. The plots' group is also
hidden below distance 0.22 (`FAR`). Result: companies can be selected only through the building
card's footer buttons or the debug API; never by pointing at the world. v1 also said "proposed
plots show no sign", and 100 % of companies are proposed.

**R5. Nothing reads at the right distance.** No hover feedback beyond the cursor; no label on
hover; building labels at the middle view are 2.6 m text; status marks are 2.8 m squares; signs
are 1.4 m text. At the home view none of it is legible, and at the near view a single company fills
the frame with nothing moving (0 movers visible).

### 1.2 What v1 got right, and v2 keeps

- The engine is now original to the repository (PR #47): mountable, disposable, seeded, tested
  (1,062 unit tests, the 7 world browser tests), with draw-call counting and a debug API.
- The registry and its generator; the placement generator and the committed layout; the poster in
  the build; the flag (`VITE_WORLD_KAWASAN`) with `assert-world-flag` proving the flag-off build is
  identical.
- The data boundary (`src/world/data/boundary.ts`): scene code never sees a figure; a figure
  reaches the screen only from a published package or a published essay; the outage state is
  distinct from absence.
- The cards, the board at `/finance/kawasan/:ticker`, the think tank, the shift overlays and
  condition marks, the Skema toggle, reduced motion, the phone start button.
- The rules: no figures, no writes, no secrets, no market data, no personal names, tokens only,
  one constant per list.

## 2. What "alive" means

A visitor should be able to see, without reading a card, that material enters at the ring, is
transformed in the estate, leaves through the gateway, is sold in the town, and comes back as
returns and recovery; and should be able to point at any company and follow its goods. Concretely,
v2 is alive when all of these hold on a laptop at the home view:

| # | property | measure |
|---|---|---|
| L1 | Buildings read as buildings | a 40 m block is ≥ 60 px wide; silhouettes differ by family |
| L2 | Motion is visible | ≥ 40 goods vehicles on screen, each ≥ 18 px long, moving at ≥ 8 px/s on a real GPU (≥ 3 px/s on the probe's SwiftShader) |
| L3 | Motion has meaning | every goods vehicle has an origin building, a destination building and a load named after the link; it stops at the gate's weighbridge and at the destination's bay |
| L4 | The chain can be seen | selecting any building animates its supplier and customer flows; dashes travel in the direction of the goods |
| L5 | Everything points | hovering any company, building, vehicle, gate or fixture shows a pointer and a label; clicking it opens its card, at every distance |
| L6 | Companies are places | a click on a company's building selects the company, not its sub-industry |
| L7 | The world has a day | at night every building shows light; published ones show more; lamps line the roads |
| L8 | A story can be followed | "Follow" rides one load through a named chain, camera on the vehicle, pausing at each building with its card |

None of these needs a published model. Published data adds emphasis (accent marks, solid links,
heavier flows, brighter windows, the board's figures); it never switches life on.

## 3. Decisions

Each is a recommendation with its default; the owner can overrule any of them in the PRD's §10.

- **D-V2-1. The home view is a composed hero at ≥ 1.2 px/m, not the whole slab.** The camera
  opens on the estate with the ring's near arc above and the gateway's first blocks to the right,
  so a block is 60–80 px and a truck 18–25 px. `Whole` stays as a place button for the map view.
  The poster is re-rendered from the same frame.
- **D-V2-2. The layout is compacted.** Content extent target ≤ 1,500 × 900 m (from 2,270 × 1,090):
  shorter main road, the gateway abutting the estate, the town's districts packed, the ring arcs
  closer. Blocks keep their metres; roads keep their widths. `Whole` then reads at ≥ 0.75 px/m.
- **D-V2-3. The survey grid goes.** Ground is tone per region, with a faint seam at region edges;
  buildings get a cast shadow quad and darker east faces; hairlines thicken with distance (line
  width in screen pixels, never under 1 px).
- **D-V2-4. Companies are buildings.** Each block holds two company lots side by side along its
  front; the family form is drawn once per lot at lot size, with the company sign on the kerb; the
  sub-industry keeps a signboard and the status mark at the block's front centre. A hit on a lot
  resolves to the company; a hit on the signboard, the yard or the shared plant resolves to the
  sub-industry. Lots are never hidden by distance; only their small text and interiors are.
  Proposed companies carry their sign (the card says "proposed example, pending review").
- **D-V2-5. Flows replace traffic.** A road graph is built from the layout (centrelines, gates,
  driveways to every lot's bay). Every registry link becomes a route from the supplier's despatch
  bay to the customer's receiving bay. Vehicles spawn on a cadence by flow class, drive, pause at
  weighbridges, unload at the bay, return. Vehicle kind follows the link's goods class (bulk,
  liquid, cold, boxed, parcel). The six return flows, the raw-export ships, the rail shuttle and the
  money layer's coins ride the same graph. Walkers stay in the town and on the terrace.
- **D-V2-6. The link register is completed** so that no placed sub-industry is isolated (43 of 130
  have no link today). Links stay `expected` with a one-line note and a goods class; a published
  package still overrides at runtime.
- **D-V2-7. Every family has an activity**: smoke, steam, a conveyor, a crane, a pumpjack, a
  beacon, a loader, a ship, a plane, an aerator, walkers at a door. Instanced, budgeted, seeded.
- **D-V2-8. Night is for everyone.** All windows light at night (warm, dim); published companies
  brighter and in the accent; lamps along roads; kiln and flare glow. A day is six minutes.
- **D-V2-9. The chain is drawn as flow, not as a diagram.** Selecting lights the one-level chain
  with travelling dashes on the routes and raised outlines on the linked lots; the rest dims. The
  "expected, not measured" wording appears once, in the card, not on every line. Full chain on
  demand.
- **D-V2-10. Stories and Follow.** Six owner-curated chains (coal, cement, oil to packaging,
  palm, nickel, the rupiah upstream) in a source table. A story button lights the whole chain;
  Follow mounts the camera on one load from the first building to the last, pausing at each
  building with its card. `F` follows any selected vehicle.
- **D-V2-11. Instancing.** Vehicles, trees, lamps, smoke and activity parts are `InstancedMesh`
  per kind; picking resolves instance ids to entities. Budgets: home ≤ 900 draw calls, district ≤
  1,300, street ≤ 1,600, with 300 live vehicles on a laptop and 120 on a phone.
- **D-V2-12. Cards v2.** The company card works without a model: name, ticker, sub-industry,
  what the company does (one line from the registry, sourced), suppliers and customers as
  buttons, "what a model would show", Open board, Open in Finance in Action. Vehicle cards name
  the load, origin, destination and the link; a gate card names the weighbridge's joint.

Rejected alternatives, briefly: company flags on pylons instead of lots (cheaper, but companies
stay abstract); shrinking only the camera without compacting the layout (the town stays a mile
away); a time-sliced scene build (orthogonal to liveliness; stays out); replacing three.js (no).

## 4. Phases and gates

Every phase: its own branch and pull request, CI green, probe before and after, frames in
`docs/world/frames/v2/`, a gate note in `docs/world/v2/gates/gate-<letter>.md`, merge. Gate mode
is set in the mega prompt's header: `continue` (default: post the note and go on) or `stop` (wait
for "lanjut").

| gate | deliverable | exit criteria (measured) |
|---|---|---|
| **A. Scale, pointing, companies** | compacted layout; hero home view; ground and shading; hover label and pointer; company lots with signs; cards v2 for buildings and companies; poster re-rendered | probe home: ≥ 1.2 px/m, block ≥ 60 px; click at a company anchor selects the company at home, district and street; hover shows pointer + label within 150 ms; `Whole` ≥ 0.75 px/m; draw calls within budget; flag-off build identical |
| **B. Flows** | road graph and routing; bays and driveways; the flows system (goods, returns, raw export by ship, rail shuttle, coins); goods classes and vehicle kinds; link register complete; vehicle cards | probe home: ≥ 40 vehicles on screen moving at ≥ 3 px/s, each ≥ 18 px; every vehicle has origin, destination and load; no isolated building; a truck stops at a weighbridge; routes never cross lots; 300 live vehicles ≤ 1,300 draw calls at the district view |
| **C. Activity and night** | per-family activity; day cycle for all; lamps; published emphasis | every family shows motion at the district view (listed in the gate note with a frame each); night frame at 20:00 with every block lit; draw calls within budget |
| **D. Chain, stories, follow** | flow-based chain highlight; story table and buttons; Follow mode; search over stories; phone layout for the strip | selecting any building animates its links; six stories light end to end; Follow completes a story in ≤ 90 s with a card at each stop; `F` follows a vehicle; Esc exits |
| **E. Quality** | tests (unit, engine, browser), Lighthouse before/after, a11y pass, docs (report v2, decision log), NOTICE check | 1,062 unit tests + new ≥ 40; world browser suite ≥ 12 cases green; Lighthouse mobile LCP no worse than `main`; zero console errors after 600 simulated seconds; keyboard path covers companies, vehicles and stories |

Rough size: A and B are the large ones (roughly a third each of the work); C and D a sixth each;
E the rest. B is the risky one (routing, instancing, picking of instances).

## 5. Risks

| risk | mitigation |
|---|---|
| Routing over a hand-built road graph has dead ends or crossings through lots | the placement generator emits the graph (nodes at every junction, gate and bay) and a test asserts every lot's bay reaches every other bay |
| Instanced picking breaks the card and keyboard paths | the Entity contract gains `instanceOf(id)`; the browser suite clicks a vehicle and reads its card |
| Draw calls or frame time regress on phones | budgets in tests; phones get half the cadence and no walkers; the probe runs with `--phone` |
| The compaction moves everything and the poster, the frames and the layout tests all change | regenerate with the scripts (`build:layout`, `build:poster`), re-approve the byte-for-byte tests once, keep the overlap and reachability tests |
| Activity and night add hex colours or figures by accident | the existing rule tests (no hex outside the theme, no `Part.text` figure, no data layer in scene code) stay and are extended to the new modules |
| Scope creep into the board or the FSRE data path | out of scope here; the board is unchanged except for the card's new links |

## 6. Out of scope

The board's sections and figures; the FSRE publish path; the essay-tag migration; the think
tank's rooms (only their walkers change); the schematic; production rollout (the flag stays off
until the owner says otherwise); a time-sliced scene build; sound.

## 7. How the owner verifies

1. `node scripts/world/probe.mjs <url>` on a flag-on preview: the table must meet §2's L1, L2, L5
   and L6 at the home view.
2. The gate frames: `docs/world/frames/v2/gate-<letter>-*.png`, one per claim in the gate note.
3. The Vercel preview of each branch (the Preview environment carries the flags): click a company
   at the home view; press a story button; press Follow.
4. `npm run test:e2e:world` for the browser suite; `npm run test:unit` for the rest; the
   Lighthouse JSON in `docs/world/frames/`.
