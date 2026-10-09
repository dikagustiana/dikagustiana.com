# PRD: Kawasan Industri — the chain map as a living world on dikagustiana.com

| | |
|---|---|
| Version | 1.0, draft for owner review |
| Date | 8 October 2026 |
| Owner | Dika Gustiana Irawan |
| Status | Not yet approved. Nothing in this document is built until the owner says so at each gate in section 14. |
| Companion | `MEGA-PROMPT-kawasan-industri.md` (the execution prompt for the coding agent) |
| Supersedes | `brief-kawasan-industri.md` v1 |
| Related | Finance in Action brief v3.1 and its data contract; the FSRE programme (`PROGRAM.md`, briefs 01–05); the chain-map decisions recorded for the About and landing pages |

---

## 1. Summary

The chain map on dikagustiana.com is a precise schematic of how an economy turns raw material into
goods, money and waste. This PRD turns it into a **living isometric world**: one industrial estate
in the centre, ringed by primary resources, with a gateway to a port and a town. Every IDX-IC
sub-industry has a building. Every company the owner has modelled has a plot. Clicking a company
strips its building to a section drawing of the operation inside, with a whiteboard that shows the
financial model, its main drivers and its position against its peer. A think tank on the hill holds
the owner's analyses, each lighting the part of the world it discusses.

The world is a new way into truths the site already holds. It reads the owner's published models and
published essays through the site's existing data layer, writes nothing, and never shows a number
the site does not already publish.

The technical base is the Factory Yard engine (`github.com/Khalidabdi1/factory`, commit `148758a`),
itself an adaptation of ai-iso-skill. The engine is adopted with four improvements: it becomes
mountable and disposable, its content becomes data-driven, its startup becomes light enough for a
landing page, and a hard boundary separates background motion from published figures.

---

## 2. Background and current state

### 2.1 The chain map today

- Lives on the About page and on the landing page as the second screen, below the existing hero
  (the owner decided against a full-map hero in September 2026).
- Five stages: Origins; Processing and intermediation; Manufacturing and packaging; Distribution and
  retail; Use and recovery.
- Transfer points are diamonds. Economy hooks sit on an "Economy" row: Inflation enters, Export · FX,
  Import · FX, First mark-up, Producer prices, Excise · credit, Final demand · CPI.
- Enabling layers are bands across the whole chain. The build has five (logistics and warehousing;
  credit and working capital; energy; principal–distributor contract governance; regulation and
  standards); the live page also shows cold chain. The data file in the repository is the authority
  on which bands exist.
- Loops: by-product to another chain; scrap and reject; reusable packaging; commercial returns;
  post-consumer material; post-consumer organic.
- Decided interaction model: two composing controls, a **distance control** (economy ↔ finance) and a
  **shift overlay** (none / reindustrialisation / green transition); numbered condition marks on
  elements with a status glyph; a reading strip inside the frame; one evidence line per mark (value,
  source, year, link); and recursive drill-downs, the first being the PLN electricity chain behind
  the energy mark.
- Framing: "Nothing here is complicated. It only looks that way from the wrong distance." The map
  indexes economy and finance (state) and reindustrialisation and green finance (shift). Accounting
  is deliberately outside its door structure.

### 2.2 The model bank (Finance in Action, section 06)

- The FSRE skill suite reverse-engineers IDX financial statements into models, two companies per
  sub-industry. The owner approves each model in the FSRE building's partner room; approved models
  move to `fsre_published` in the site's Supabase project `asypkbkiebjvvpimewfp`. Agents never
  approve.
- The Finance in Action page (`/finance/finance-in-action`) is the read-only viewer: an index
  ordered along the chain, model pages with a driver row, a unit-economics waterfall, a peer band,
  a "Why this link matters" note, a Reported / Model / Assumptions grid, a cell inspector with
  source trace and tie-out, and a workpaper record. Download .xlsx is the only primary action.
- Data contract v3.1 (`src/lib/finance-in-action/contract/`): among others, `UnitEconomics` with
  `unit`, `basisLabel`, `denominatorRowRef`, `periods`, `lines[]` (each with `role`, `rowRef`,
  `driver.description`, `driver.physicalUnit`, `driver.inputRowRefs`, `contains[]`), and a link
  register with cost share, demand share and `intensity`.
- First slate: INTP (reference build), then SMGR; then PTBA and ITMG once a mining archetype exists.
  Archetypes v0.1: ARC-DIST, ARC-PROC, ARC-ASSET.
- Rules already locked: no share price, P/E or market data; the unsplit remainder of cost of revenue
  is shown hatched, never allocated; missing volumes are shown as "not available", never estimated.

### 2.3 The think tank sections

The site's navigation already has The Next Big Thing, The Green Transition, Development Finance and
Finance. These are the research programmes the think tank building will hold.

### 2.4 Lessons that shape this PRD

- An autonomous run on another of the owner's apps changed the front end and the data layer of a live
  product in one go and left it unusable. This PRD requires branches, previews, feature flags, and
  owner gates before anything touches production, and forbids production database changes inside
  this work.
- The site's database backup job was found unconfigured (GitHub Actions secrets missing). Any
  migration, even on a branch database, is preceded by a check that backups run.

---

## 3. Goals, non-goals, success measures

### 3.1 Goals

1. Make the chain legible as a place: a visitor understands the flow (resources in, value added in
   the estate, goods out, loops back) within seconds, without reading.
2. Make the model bank navigable spatially: every published model is reachable from the world in at
   most two clicks (building, then company), and every sub-industry has an address even before it has
   a model.
3. Expose a company honestly: the section drawing and the whiteboard show only published figures,
   each with its source trace, and say plainly what the sources do not reveal.
4. Connect analysis to evidence: every think-tank piece lights the buildings it discusses and is
   labelled as a thesis or as model-based.
5. Keep the schematic's precision: transfer semantics, economy hooks, enabling layers, lenses,
   condition marks, evidence lines and drill-downs all survive the move.
6. Keep the site fast and safe: the landing page's Core Web Vitals do not regress; production data is
   never written; nothing ships behind the flag until the owner approves.

### 3.2 Non-goals

- Replacing the schematic. It stays as the Skema view, the print view, and the reduced-motion
  default.
- A game. No scoring, no play mechanics, no sound.
- Live operations data. Motion in the world is illustrative and driven by the registry and published
  data; it never claims to be real-time.
- Market data of any kind.
- Any FSRE pipeline status in public. The queue, reviews and escalations stay in Personal OS.
- Editing or approving models from the site.
- A generic CMS for the world. Placement is a reviewed registry, not a drag-and-drop editor.

### 3.3 Success measures

| Measure | Target |
|---|---|
| Landing page LCP and CLS (mobile and desktop, Lighthouse, flag on) | No worse than the current landing page; report both baselines at gate 2 |
| Engine JavaScript | Not in the initial bundle; loaded after first paint or on interaction |
| Published-only rule | Zero figures on screen that are not in `fsre_published` or a published essay (tested) |
| Addressability | Every sub-industry, company, board and think-tank piece has a stable URL |
| Coverage | The far view states "n of 125 sub-industries have a published model" and the number is computed, not typed |
| Accessibility | Keyboard reaches every card and board; the schematic and an HTML index carry the same information for screen readers |
| Safety | Zero commits to `main`, zero production database changes, zero writes to Supabase from the world |

---

## 4. Audiences and jobs

| Audience | Job to be done | What the world must do for them |
|---|---|---|
| CFOs, finance directors, senior analysts (adversarial readers) | Judge whether the owner's models and theses hold up | Precision, traceability, honesty about limits; no decoration that costs credibility |
| Scholarship and admissions panels | Assess originality and rigour quickly | A striking first screen that resolves into real work within one click |
| Learners (the site's startup direction) | See how an economy works, then how a company works | The far-to-near zoom: economy at a distance, unit economics up close |
| The owner | Grow the model bank and the think tank, and see them grow | A world that fills as models are approved; nothing to maintain by hand beyond the registry |

---

## 5. Product principles

1. **One source, many views.** The registry, the chain data file, `fsre_published` and published
   essays feed the world, the schematic and the Finance in Action index. Nothing is duplicated.
2. **Published only.** A figure appears only if it exists in a published model package or a published
   essay. There are no sample numbers, no placeholders that look like numbers, no estimates.
3. **Every figure carries its source.** Clicking a number opens its trace (the `doc:<sha256>#page=n`
   locator and the model's cell), exactly as on the model page.
4. **Honest sparseness.** For months most buildings will have no model. The world must look complete
   and calm in that state, and the coverage figure is part of the story.
5. **Precision survives.** Nothing the schematic says is lost; it is relocated.
6. **Calm motion.** Alive, never chaotic; a visitor reads the situation in three seconds. One colour
   for what is live.
7. **Addressable.** Every object a visitor can open has a URL that reopens it after refresh.
8. **Accessible by construction.** The world is a view; the information is also in HTML.
9. **Safe by default.** Flag off in production; branches and previews; owner gates; read-only data
   access.
10. **Roles, not people.** The world shows companies and functions. It never shows a person's name.

---

## 6. Scope

### 6.1 In scope (this PRD)

- The world on the landing page (second screen) and the About page, behind the `world_kawasan`
  flag.
- The registry of 130 IDX-IC sub-industries (125 placed; Z not placed) with zones, chain nodes,
  example companies and links.
- The Factory Yard engine adopted into the site with the four improvements.
- Buildings, plots, cards, the exposed company view (section drawing, archetype interiors, in-world
  whiteboard, full board), the value-chain highlight, the think tank, lenses and overlays carried
  from the schematic, search, controls, the Skema toggle, the poster, mobile and reduced-motion
  behaviour.
- Read-only integration with `fsre_published` and published essays.
- One schema addition on a Supabase branch only: essay tags (section 8.5), applied to production
  only by the owner after gate 3.

### 6.2 Out of scope now, listed for later

- Scenario mode (end-to-end runs) in the world. That exists in the owner's internal simulation; the
  public world does not run scenarios.
- Editable assumptions in the whiteboard. The model page may offer that later; the board is
  read-only.
- Peer bands wider than the sub-industry pair until enough models exist.
- Drill-down chains other than the electricity chain already specified for the schematic.
- Analytics beyond what the site already uses.

---

## 7. Experience specification

### 7.1 Where the world lives

- **Landing page:** the world replaces the map's slot as the second screen. The existing hero stays
  untouched above it.
- **About page:** the world replaces the map's slot there too, through the same component.
- **Flag:** `world_kawasan`, read through the site's existing flag mechanism, off by default in
  production. With the flag off, the current schematic renders exactly as today.
- **Skema toggle:** always present in the frame header. It swaps the world for the schematic in the
  same frame. The schematic is the print view and the default when `prefers-reduced-motion:
  reduce` is set.
- **Poster:** the frame first shows a static image of the far view (an SVG or PNG generated at build
  time from the same registry). The engine loads after first paint or on the first interaction, then
  fades in over the poster. If WebGL is unavailable, the poster stays and the schematic toggle is
  offered.

### 7.2 Layout of the world

The engine's coordinates are the skill's: +x east, +y south, +z up, 1 unit = 1 m. The world is
generated from the registry, not drawn by hand; the geometry below is the target the generator must
produce.

| Region | Position | Contents |
|---|---|---|
| **Ring, geological arc** | North and north-west | Open pits, quarries, well pads and a gas plant, a coal stockpile and conveyor, mining-service yards, a haul road to the ring road |
| **Ring, biological arc** | South and south-west | Plantation blocks, food-crop fields, a poultry and livestock cluster, fish ponds and a jetty, a forest block with a log yard |
| **Estate** | Centre | Blocks for primary processing (a smelter, a refinery, a cement plant, a chemicals plant, a pulp-and-paper mill), manufacturing blocks (one building per manufacturing sub-industry, with a packaging plant feeding sideways into them), utilities (a power plant, a gas station, a water plant), estate warehousing (a dry warehouse and a cold store), the estate operator's office at the main gate, transfer gates with weighbridges on every road leaving the estate |
| **Gateway** | East of the estate | The port (container quay, bulk quay, tank farm), the airport apron, a toll-road interchange, a rail yard, a logistics park with 3PL sheds |
| **Town** | Beyond the gateway, east and south-east | A distribution district (distributor depots, a wholesale market), a retail district (supermarket, minimarkets, department store, specialty shops, a car dealership), a consumer-services district (hotel, restaurants, cinema, school), a health district (hospital, clinic, lab, pharmacy distributor), a business district (offices for IT, consulting, media, holdings), a financial district (bank towers, insurers, an exchange) |
| **Recovery yard** | Town's edge, with a road back into the estate | A recycling plant, a scrap yard, a composting site |
| **Think tank** | High ground at the town's edge, overlooking the estate | One building with a terrace |
| **Roads** | | A ring road around the estate; radial roads from the ring to the estate gates; the main road from the estate through the gateway into the town; a raw-export road from the geological arc straight to the port, drawn dashed |
| **Infrastructure** | Across the world | Telecommunication towers; construction sites with cranes where the registry marks expansion |

Size target: the estate fits the frame at the far zoom with the ring and the gateway visible; the
town's districts are legible at the middle zoom. The generator sizes blocks to the number of
sub-industries they hold.

### 7.3 Zoom levels and navigation

| Level | What is drawn | What is readable |
|---|---|---|
| Far | Regions, main roads, flows, the raw-export route, region labels | The shape of the economy; the coverage figure; economy signposts |
| Middle | One building per sub-industry with a label and a status mark; the enabling layers' vehicles | Which sub-industries exist and which have models |
| Near | Company plots with signage; the exposed interior of the selected company | Unit economics; drivers; peer position |

- Place buttons in the frame header: Ring, Estate, Gateway, Town, Think tank, Whole. Keys `1`–`5`
  and `0`.
- Pan by drag or arrow keys; zoom by scroll, pinch or the + / − buttons; `F` follows a selected
  vehicle; `[` and `]` cycle through buildings; `Esc` closes.
- The far view is the camera's home.

### 7.4 Precision carried over from the schematic

| Schematic element | In the world |
|---|---|
| Transfer diamonds | Estate gates with weighbridges and the port's gate. Filled and hollow diamonds keep the meaning the site's data file gives them; the gate's card states it |
| Economy hooks | Signposts: Inflation enters at the ring–estate boundary; Producer prices and First mark-up at the estate gates; Export · FX and Import · FX at the port; Excise · credit at the estate's exit gate for excisable goods; Final demand · CPI in the town centre |
| Enabling layers | Layer toggles. Logistics and warehousing: the ring road, the radial roads, trucks and the logistics park. Cold chain: reefer trucks, the cold store, and a tint on the nodes that can hold cold stock. Credit and working capital: the money layer (section 7.5). Energy: the power plant, gas plant and the lines to every block. Contract governance and regulation and standards: signposts on the gates and the distributor depots, each opening its condition card |
| Loops | Vehicles on the outer ring road: scrap and reject back to processing; reusable packaging back to the packaging plant; commercial returns back to depots; post-consumer material to the recovery yard and then into the estate; post-consumer organic to the biological arc |
| Raw export | The dashed road from the geological arc to the port, bypassing the estate. Its card explains the downstreaming question in the owner's words from the site's data file |
| Hourglass shape | The estate is the narrow waist: fewer, larger blocks; the ring and the town are wide |

### 7.5 Lenses and overlays

The two composing controls decided for the schematic exist in the world with the same names and
the same data:

- **Distance control (economy ↔ finance).** Economy is the far view: regional labels, aggregate
  flows and the economy signposts. Finance is the near view: unit economics on the whiteboards.
  Dragging the control animates the camera between them; the control and the zoom stay in step.
- **Shift overlay (none / reindustrialisation / green transition).** Switching an overlay places the
  numbered condition marks on the buildings, gates and layers they belong to, with the status shown
  by glyph shape, colour and a word. The reading strip at the frame's bottom edge lists the marks in
  argument order. Clicking a mark opens the condition card with its five-block structure and its
  evidence line (value, source, year, link). The marks, their order, their statuses and their evidence
  lines come from the existing data file; the world adds nothing to them.
- **Money layer.** With the credit layer on, money moves opposite to goods along the same roads as
  thin dashed lines with small coins, from the financial district towards the ring. Days, not years.
- **Drill-down.** The energy mark's drill-down opens the PLN electricity chain as the schematic does
  today, in the same frame, with a way back.

### 7.6 Buildings and plots

- **Sub-industry building.** One per placed sub-industry. Its form comes from its zone's building
  family (pit, plantation block, process plant, factory, shed, depot, shop, office tower, and so on).
  Its label is the sub-industry's name. Its status mark uses colour, glyph and word together:
  - **Published:** at least one company with a published model. Glyph: filled square. Colour: the
    site's accent.
  - **No model yet:** no published model. Glyph: hollow square. Colour: neutral. The word is "No
    model yet".
  - **No listed issuer:** the registry records zero listed companies. Glyph: dotted square. Whether
    these buildings are drawn is owner decision D3.
- **Company plot.** Two plots per sub-industry building (the registry may record more for later).
  Each shows the company's ticker on a sign when the company is confirmed; "proposed" plots show no
  sign. A plot with a published model is lit; others are unlit.
- **Building card** (click a building): sub-industry name and code; sector and sub-sector; chain
  stage and node; the two companies with their model status; upstream and downstream links with
  their measured-or-expected state; related analyses; "Open in Finance in Action index".
- **Gate, port, signpost and layer cards:** the text and evidence from the site's data file.

### 7.7 The exposed company view

Clicking a company plot with a published model does three things at once.

1. **The building opens as a section drawing.** The shell is replaced by the cut: walls low and
   hatched, roof as an outline, and the operation inside drawn from the archetype interior
   (section 7.8). The camera eases to the near zoom and frames the interior.
2. **Drivers are placed in the operation.** Every cost line in the published unit-economics block has
   `driver.physicalUnit` and `driver.description`. The interior's stations carry tags for the
   physical units they represent (for a cement plant: limestone quarry feed; kiln fuel; power;
   packing; despatch). A line is attached to the station whose tags match its `physicalUnit`; lines
   with no matching station attach to the whiteboard only. Hovering a waterfall bar lights the
   station; clicking a station highlights its lines.
3. **The in-world whiteboard appears** on the cut's back wall. It carries three large items only:
   the top three drivers by their share of cost of revenue; a miniature of the unit-economics
   waterfall with the values on the bars; and the peer position as two marks on one scale. It is a
   visual anchor; clicking it opens the full board.

**The full board** is an HTML panel in the frame, styled as a whiteboard but typeset for reading
(no handwriting fonts; figures in tabular numerals). It has its own route,
`/finance/kawasan/<ticker>`, and reopens on refresh. Its sections, in order:

| Section | Content | Source |
|---|---|---|
| Header | Company, ticker, sub-industry, latest quarter, model status, **Download .xlsx** | Published package |
| Main drivers | The driver row; the driver tree with edges (precedents and dependents, one level by default, "show full chain" on demand) | Published package; the tree needs the formula graph from proposal P-2, so it shows "Driver tree not available for this model" until that package version exists |
| Unit economics | The waterfall per unit with values on every bar; the hatched unsplit remainder; "Not available: volumes not disclosed" where the denominator is missing | Published package |
| Performance vs peer | The peer band on the same metrics. With one published peer it is headed "vs one comparator" and draws two marks. With three or more it draws the band | Published packages in the sub-industry |
| What the model contains | Key assumptions (green), what changed this quarter, tie-out checks passed and skipped | Published package |
| Limits of the filing | What the sources do not reveal: unsplit cost, undisclosed volumes, missing notes | Published package (its escalation and unsplit records) |
| Chain | Upstream and downstream links with cost share, demand share and intensity; measured links solid, expected links dashed and labelled; "Why this link matters" | Registry links and the package's link register |
| Related analyses | Think-tank pieces tagged with this sub-industry or company | Published essays |

Every figure on the board is a button that opens the source trace (cell, document locator and
page), using the model page's inspector. "Open full model" goes to the Finance in Action model
page.

A company without a published model still opens: the section drawing and the archetype interior
are shown, the whiteboard reads "No model yet", and no figures appear anywhere.

### 7.8 Archetype interiors

Interiors are built per archetype, not per company, so a handful of templates serve hundreds of
companies. The published package names the archetype; sub-industries without a model use the
fallback for their zone.

| Archetype | Stations (with physical-unit tags) | Fallback for zones |
|---|---|---|
| **PROC** (process plant) | Raw-material receiving (tonnes in); crushing or preparation; the main process line (kiln, smelter, reactor, mill) with fuel and power feeds; packing; finished-goods store; despatch bay | Estate, primary processing and manufacturing |
| **DIST** (distribution) | Inbound docks (pallets in); racks (pallet-days); picking (cartons); loading docks (trips, DOs); the office with invoices and the capital clock | Town, distribution and retail; logistics park |
| **ASSET** (asset-heavy network) | The asset itself (towers, a toll plaza, a plant unit, a vessel) with capacity and utilisation; maintenance yard; operations centre; customer or traffic entry | Utilities; transport infrastructure; telecommunications; property |
| **MINE** (planned by FSRE; use when the package names it) | Pit or well pad; haul road; crusher or wash plant; stockpile; load-out to rail, road or barge | Ring, geological arc |
| **FARM** (fallback only, until FSRE defines it) | Field or pond blocks; harvest collection; primary handling (mill, hatchery, cold room); despatch | Ring, biological arc |
| **SERVICE** (fallback only) | Reception; work floor; back office | Town services, health, business, financial |

Stations carry a tag list (for example `['kiln fuel', 'coal', 'gas', 'energy']`); the matching of
`driver.physicalUnit` to stations is by tag, case-insensitive, with a per-archetype synonym table in
the registry so that "GJ of fuel", "tonnes of coal" and "kiln fuel" meet at the kiln.

### 7.9 Value-chain highlight

Selecting a building or a company lights its chain:
- upstream links as lines from the supplier buildings into this one, downstream links out of it;
- measured links solid, with their weights on hover; expected links dashed and labelled "expected,
  not measured";
- one level by default; "show full chain" extends it;
- everything not in the chain dims, as Factory Yard dims around a followed vehicle.

Link weights and their measured state come from the registry's link register and the published
packages, never from the world.

### 7.10 The think tank

- **The building** stands on the hill with a terrace facing the estate. Its card lists the rooms.
- **Rooms** are the site's research programmes, each a room in the section drawing: The Next Big
  Thing; Industry analysis; and, switchable in the registry, The Green Transition and Development
  Finance. Each room lists its published essays by title and date.
- **Two-way links.** Opening a piece from a room lights the buildings and links it is tagged with,
  and keeps them lit while the piece's card is open. A building's card lists the pieces tagged with
  it.
- **Kinds.** Each piece carries a kind set by the owner:
  - **Thesis:** forward-looking. The card shows "Thesis", the evidence it rests on (links to
    published models and named sources), and "What would prove this wrong".
  - **Model-based:** figures come from published models. The card shows "Model-based" and links to
    those models.
- **Tags** are set by the owner on each essay (sub-industry codes, chain nodes, company tickers).
  Untagged essays appear in their room but light nothing.
- Only published essays appear. Outputs from the owner's think-tank agents in Personal OS appear only
  once the owner publishes them as essays.

### 7.11 Search, cards and empty states

- **Search** (in the frame header): companies by ticker or name, sub-industries by name or code,
  think-tank pieces by title. Results open the object. The index is the registry and published data
  only.
- **Cards** are HTML, anchored to the frame's right edge on desktop and as a bottom sheet on phones.
  One card at a time. The card's title row shows the object's kind, name and status; the body shows
  rows; the footer shows actions.
- **Empty states** are designed, not blank:
  - a sub-industry with no model: the building is drawn, the card explains what a model would show
    and links to the Finance in Action index;
  - a room with no essays yet: the room is drawn with empty shelves and a line "Nothing published
    here yet";
  - no WebGL: the poster and the schematic.
- **Errors:** if `fsre_published` cannot be read, buildings show "Model status unavailable" rather
  than "No model yet". Never confuse an outage with absence.

### 7.12 Motion and liveliness

- Trucks run the ring road and the radial roads; reefer trucks run when the cold-chain layer is on;
  forklifts work at the estate warehouse; trains shunt in the rail yard; a crane works the quay.
- Flows along measured links carry more vehicles than expected links. Buildings with published
  models have lit windows at night; others are dark. This is the only place published data changes
  motion, and it conveys coverage, not performance.
- A day passes in six minutes, as in Factory Yard. Night darkens the frame even in the light theme.
- No gunfire, sirens, rockets, robberies or fires. The engine's police, fire, starbase and
  observatory systems are not ported.
- Under reduced motion, the world is not shown; the schematic is.
- Motion never implies throughput, revenue or any figure. The card of any vehicle says "Illustrative
  traffic; see the model for figures".

### 7.13 Visual language

- Factory Yard's hairline language: 1 px edges at any zoom, flat unlit faces, two greys for lines,
  one live colour for selection, routes, lit windows and beacons.
- Colours come from the site's design tokens (navy system), mapped onto the engine's token names
  (`--bg`, `--line`, `--body`, `--live`, and the rest) in one mapping file. No hex values in scene
  code.
- Status colours: accent for published, neutral for no model, muted for no issuer; amber and red are
  reserved for condition marks' statuses from the data file.
- Typography: the site's typefaces. In-world text uses the engine's text textures with the site's
  monospace or sans token; the full board uses the site's reading typeface with tabular numerals.
- Dark mode follows the site's theme; night follows the clock.

### 7.14 Mobile, reduced motion, print

- **Phones:** the frame is edge to edge with a 16 px gutter; the world opens at the middle zoom with
  fewer vehicles; cards are bottom sheets; the full board is a full-screen sheet; the place buttons
  collapse into a menu.
- **Reduced motion:** the schematic, with a note that a living version exists.
- **Print:** the schematic.

### 7.15 Accessibility

- The canvas has `role="img"` and a description that says what the world shows and how to use it.
- Every object reachable by click is reachable by keyboard: `[` and `]` cycle buildings, Enter opens
  the card, Tab moves through the card and board, Esc closes.
- The HTML index (the Finance in Action index and the schematic's reading strip) carries the same
  information for screen readers; the world adds no information that is only visual.
- Colour never carries meaning alone: every status has a glyph and a word.
- The full board meets the site's existing contrast and focus-ring rules.

---

## 8. Data and integration specification

### 8.1 The registry

Location: `src/lib/world/registry/`. Format: TypeScript modules exporting typed constants, generated
from committed source files, with a generator script and tests. Nothing in the registry is edited by
hand except the committed source files.

```ts
type Zone =
  | 'ring-geological' | 'ring-biological'
  | 'estate-primary' | 'estate-manufacturing' | 'estate-utilities' | 'estate-operator' | 'estate-warehousing'
  | 'gateway' | 'town-distribution' | 'town-retail' | 'town-services' | 'town-health'
  | 'town-business' | 'town-financial' | 'infrastructure' | 'recovery' | 'unplaced';

type ListedCount = { n: number; source: string; asOf: string } | { n: null; note: 'not yet counted' };

interface SubIndustry {
  code: string;            // official IDX-IC sub-industry code, from the cited IDX document
  nameId: string;          // Indonesian name as IDX publishes it
  nameEn: string;          // English name as IDX publishes it
  sector: { code: string; name: string };
  subSector: { code: string; name: string };
  industry: { code: string; name: string };
  zone: Zone;
  buildingFamily: string;  // from the zone's family list
  chainStage: 'origins' | 'processing' | 'manufacturing' | 'distribution' | 'use-recovery' | 'enabling';
  chainNodeId: string;     // id in the existing chain data file
  listed: ListedCount;
  companies: CompanyRef[]; // usually two
  archetypeFallback: 'PROC' | 'DIST' | 'ASSET' | 'MINE' | 'FARM' | 'SERVICE';
  review: { placedBy: 'owner' | 'proposed'; note?: string };
}

interface CompanyRef {
  ticker: string;
  name: string;
  status: 'confirmed' | 'proposed';
  placeOverride?: { zone: Zone; reason: string };
  reason?: string;         // why this company was proposed for the pair
}

interface Link {
  from: string;            // sub-industry code (supplier)
  to: string;              // sub-industry code (customer)
  costShare?: Measured;    // share of the customer's cost of revenue
  demandShare?: Measured;  // share of the supplier's demand
  intensity?: Measured;    // physical units per unit of the customer's output
  state: 'measured' | 'expected';
  note?: string;
}

interface Measured { value: number; unit: string; source: string; period: string }
```

Invariants (tested):
- 35 sub-sectors, 69 industries, 130 sub-industries; 125 with a zone other than `unplaced`.
- Every `chainNodeId` exists in the chain data file.
- Every link's endpoints exist; a link is `measured` only if `costShare` and `demandShare` both have a
  source.
- No ticker appears in two sub-industries.
- Every `confirmed` company has `review.placedBy === 'owner'` on its sub-industry.
- Codes and names match the cited IDX document; the generator fails if the source file changes
  without the citation changing.

Sources committed under `docs/world/sources/`:
- the owner's sub-sector table (`idx-ic-subsektor.tsv`);
- the official IDX-IC classification document reference (title, publisher, date, URL or file hash);
- the listed-issuer counts' source, when available.

Review workflow: the generator writes `docs/world/review-registry.md`, a human-readable table of
every placement, pair and link with its `proposed`/`owner` state. The owner edits the source files;
the agent never changes a placement after the owner has marked it.

### 8.2 Chain data

The existing chain data file in the repository (stages, nodes, transfer points, hooks, bands, loops,
condition marks, evidence lines, drill-downs) is read as is. The world may add a presentation table
(which signpost goes where, which band maps to which layer) in `src/lib/world/presentation.ts`, but
never copies or edits the chain data.

### 8.3 Published models

- Read through the existing Finance in Action data layer against `fsre_published` in Supabase
  project `asypkbkiebjvvpimewfp`, with the anonymous role's read-only access as the viewer already
  uses. The world adds no new tables, views, policies or functions in production.
- From contract v3.1 the world uses: model identity and status; latest period; the driver row; the
  `UnitEconomics` block in full; the link register; tie-out summary; escalations and unsplit records
  for the "Limits of the filing" section; the archetype; the package version (to know whether the
  formula graph of P-2 exists).
- Source traces use the model page's inspector and the `doc:<sha256>#page=n` locator from proposal
  P-1 when the package carries it.
- **Peer band definition:** per sub-industry, over companies with a published model for the same
  period. One comparator: two marks on one scale, headed "vs one comparator". Three or more: a band
  from min to max with the company's mark, and the median marked. Never a band from two points.
- Fetch policy: one request for the published index at world load (ids, statuses, periods,
  archetypes), one request per opened company for its package. Cache in memory for the session.

### 8.4 Links

Link weights shown in the world come from the registry's link register. When a published package
carries measured weights for a link, they take precedence over the registry's expected state for
that link, and the registry is updated at the next review.

### 8.5 Essays and tags

- Required fields per essay for the think tank: `kind` ('thesis' | 'model-based'), `tags`
  (sub-industry codes, chain node ids, tickers), and for theses `evidence[]` (links) and
  `falsifier` (text).
- If the essay schema already has a usable tag structure, reuse it. Otherwise add the fields by a
  migration file under the repository's migrations folder, applied **only** to a Supabase branch or
  local database during this work. Production gets it only when the owner applies it after gate 3.
- Until the fields exist in production, the think tank reads an interim mapping file committed in the
  repository (`docs/world/think-tank-tags.json`, owner-authored) so the feature can be previewed
  without a production change.

### 8.6 Archetype interiors

`src/world/interiors/<archetype>.ts` builds each interior from the engine's `Part` builder, with a
station table (`id`, `tags[]`, anchor position) exported alongside. The synonym table
`src/lib/world/registry/physical-units.ts` maps `driver.physicalUnit` strings to station tags.

### 8.7 Posters and snapshots

- The far-view poster is generated at build time by a script that renders the registry-driven far
  view headlessly to SVG or PNG and writes it to the public folder. The script is part of the build
  so the poster never drifts from the registry.
- No published-model data is baked into the build; model status is fetched at runtime.

---

## 9. Engine adoption: Factory Yard

### 9.1 What is adopted as is

- `yard/kernel/` (iso projection, `Part`, `Path`, the corridor graph, seeded random).
- `yard/theme.ts` (tokens to materials, day and night blend), remapped to the site's tokens.
- The view's selection, hit-testing, route drawing, look-inside (section drawings), tags, keys and
  frame loop.
- The simulation core (fixed 1/60 s step, seeded, warm-up), `roads`, `roadnet`, `trucks`,
  `forklifts`, `person`, `people` (walkers and staff only), `freight`, `train`, `port`.
- The models for vehicles and people; the world builders for ground, woods, range, port and rail.
- The debug API pattern (`?debug=1`), renamed `window.world`.
- The draw-call discipline and LOD (`TINY`, `FAR`) rules.

### 9.2 What is not ported

Police and robberies, fire, the fair, fishing, Sahel and its metro, Metrobus, Motors, the east
country, the village, the observatory, Starbase, and weather (unless the owner asks for rain and fog
later).

### 9.3 Improvements required

1. **Mount and dispose.** `createWorld(container: HTMLElement, options): WorldHandle` creates the
   renderer, builds the world and starts the loop; `handle.dispose()` cancels the loop, removes
   listeners, disposes geometries, materials and the renderer, and leaves no globals. No module
   executes side effects at import. DOM elements are created or passed in by the React component;
   nothing is found by global id.
2. **Data-driven placement.** Regions, blocks, plots, roads and labels are generated from the registry
   by a deterministic placement algorithm (section 9.4). `layout.ts` becomes the output of that
   algorithm, not a hand-written table.
3. **Startup budget.** Warm-up is reduced to what the visible far view needs (vehicles already on the
   roads), and the build of near-zoom detail (interiors, signage, plots) is deferred until the camera
   approaches. The engine chunk is loaded after first paint.
4. **Data boundary.** A single module, `src/world/data/boundary.ts`, is the only path by which
   published figures reach scene code. Scene builders and simulation code receive counts and flags
   (has model, lit, flow weight class) and never a rupiah figure. Cards and the board render figures
   from the data layer directly.
5. **Types and tests.** New modules are typed; ported modules the work touches lose `@ts-nocheck`.
   Unit tests cover the registry, the placement algorithm, the data boundary and the peer-band rule.
   Headless smoke tests use the debug API to assert zero console errors, draw calls within budget at
   the far, middle and near views, and deterministic replay for a fixed seed.
6. **Font.** Fonts are self-hosted files in the site, not fetched at build time.
7. **Licence.** The engine enters the repository only with `NOTICE.md` recording ai-iso-skill's MIT
   licence and Factory Yard's permission for public use (or its licence file, once the author adds
   one). Until that record exists, the pull request cannot be marked ready.

### 9.4 Placement algorithm

- Input: the registry. Output: `layout.generated.ts` with every region polygon, block, plot, road
  centreline and label anchor.
- Regions are fixed templates (ring arcs, estate rectangle, gateway strip, town grid, hill). Blocks
  within a region are allocated by zone, sized by the count of sub-industries, laid out on a grid
  with the region's spacing. Plots within a block are fixed slots (two by default).
- The algorithm is deterministic for a given registry and seed, and its output is committed so
  diffs are reviewable.
- Draw-call budgets per view are enforced by a test that builds the world headlessly and counts.

---

## 10. Performance budgets

| Item | Budget |
|---|---|
| Initial landing-page bundle | Unchanged by this work (the engine is a separate, lazy chunk) |
| Engine chunk | Reported at gate 2 with a size budget agreed there; Factory Yard's full engine is 1,25 MB raw and about 383 KB gzipped, which is the upper bound to cut from |
| Time to interactive world on a mid-range phone | Reported at gate 2; the poster must be visible immediately regardless |
| Draw calls | Far view ≤ 1.200; middle ≤ 1.600; near ≤ 1.900, following Factory Yard's discipline; tested |
| Frame rate | 60 fps on a laptop; 30 fps on a mid-range phone, with the LOD rules |
| Lighthouse | LCP and CLS no worse than the current landing page, mobile and desktop |

---

## 11. Security and privacy

- Read-only. The world never writes to Supabase, never stores anything but UI preferences in
  localStorage (theme, last view), and never sends data elsewhere.
- Access through the anonymous role's existing read-only policies only; no new policies, functions or
  roles in production.
- The site's Content-Security-Policy is unchanged; the engine and fonts are bundled.
- No personal names anywhere in the world. Company names and tickers are public.
- No market data, by rule and by test.

---

## 12. Analytics

If the site already records page analytics, three events may be added through the same mechanism:
world opened, company board opened, think-tank piece opened. No new vendor, no identifiers.

---

## 13. Dependencies

| Dependency | Needed for | State |
|---|---|---|
| Finance in Action viewer behind its flag (programme M2) | Model pages, inspector, download | In progress |
| First published model (INTP, programme M7) | A real company board on the preview | Pending |
| Contract v3.1 approval and proposal P-2 (formula graph) | The driver tree on the board | Pending owner approval |
| Proposal P-1 (document locator) | Source traces to pages | Pending owner approval |
| Factory Yard licence or written permission for public use | Merging the engine | Pending; owner to obtain |
| Site database backups configured | Any migration, even on a branch | Pending; owner to confirm |

---

## 14. Rollout and gates

| Gate | What the owner reviews | What is blocked until "lanjut" |
|---|---|---|
| **Gate 0: discovery and plan** | The agent's findings about the repository (chain data file, flags, data layer, essay schema, formatter, router), the engine adoption list, the licence state, the backup state | All code |
| **Gate 1: registry** | The placement table, proposed pairs with reasons, proposed links, the open decisions | The world build |
| **Gate 2: style frames** | Stills of the far, middle and near views; an exposed company with its whiteboard; the full board; the think tank; a condition overlay; the Skema toggle; a phone frame; Lighthouse baselines; the engine chunk size | Motion, data wiring |
| **Gate 3: data and schema** | The published-only tests; the interim tag file; the migration file and its branch test result | Any production migration (owner applies it himself, later) |
| **Gate 4: pull request** | The report, the test results, the preview | Merge (owner merges) |

Flag stays off in production after merge until the owner turns it on.

---

## 15. Acceptance criteria

**World**
- With the flag off, the schematic renders exactly as before (visual regression test).
- With the flag on, the poster appears before the engine loads; the engine fades in without layout
  shift.
- All six place buttons and the keys work; the far view is the home.
- Every placed sub-industry has a building with a label and a status mark with glyph, colour and
  word.
- The raw-export route is drawn dashed from the geological arc to the port.
- Each enabling layer toggles its vehicles and tints; the money layer flows opposite to goods.
- The distance control moves the camera between economy and finance; the shift overlay places the
  condition marks and fills the reading strip from the data file; the energy drill-down opens.

**Company**
- Clicking a company with a published model opens the section drawing, places its cost lines on
  stations by physical unit, shows the in-world whiteboard, and the full board opens from it with the
  eight sections in order.
- Every figure on the board opens a source trace.
- With one published peer, the performance section is headed "vs one comparator".
- A company without a published model opens with "No model yet" and no figures.
- `/finance/kawasan/<ticker>` reopens the board after refresh.

**Chain**
- Selecting a building lights one level of links; measured solid, expected dashed and labelled;
  "show full chain" extends it.

**Think tank**
- Rooms list published essays only; opening a piece lights its tagged buildings; theses show evidence
  and a falsifier; model-based pieces link to their models.

**Data and safety**
- Tests prove no figure on screen is outside `fsre_published` or published essays.
- No writes to Supabase in any code path (tested by a mocked client that throws on writes).
- No commits to `main`; no production migration; flag off in production.

**Quality**
- Lighthouse budgets met; draw-call budgets met; zero console errors in the smoke tests; keyboard path
  complete; reduced motion falls back to the schematic; `NOTICE.md` complete.

---

## 16. Test plan

| Layer | Tests |
|---|---|
| Registry | Counts; invariants; citation lock; generator idempotence |
| Placement | Deterministic output for a fixed seed; no overlapping blocks; every sub-industry gets a block and two plots; draw-call budgets |
| Data boundary | Scene code receives no numeric figures (type-level and runtime assertion); published-only; outage vs absence distinction |
| Board | Section order; source trace on every figure; peer-band rule; "No model yet" path |
| Think tank | Published-only; tags light the right objects; thesis fields required |
| Engine | Mount and dispose leaves no listeners, no running loop, no WebGL context; replay determinism; LOD switches |
| UI | Keyboard path; reduced motion; flag off regression; phone layout |
| Performance | Lighthouse; chunk size; frame-time sampling in the smoke test |

---

## 17. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The world looks empty for months | Honest sparseness is designed in; the coverage figure and lit windows make growth visible |
| Visual density at 125 buildings | Three zoom levels; LOD; blocks sized by count; place buttons |
| Engine weight on the landing page | Poster first; lazy chunk; deferred near-zoom detail; budgets at gate 2 |
| Physical-unit matching fails for some models | Unmatched lines attach to the whiteboard only; the synonym table grows at reviews |
| Licence of Factory Yard | PR blocked until recorded; ai-iso-skill (MIT) is the fallback kernel |
| Schema change to essays | Branch-only migration; interim tag file; owner applies production |
| Another production incident | Section 0 of the mega prompt; flags; gates; backups check |
| Drift between world, index and schematic | One registry; tests that all three read it |

---

## 18. Open decisions for the owner

| # | Decision | Default if undecided |
|---|---|---|
| D1 | "Produksi & penyulingan migas" spans the ring and the estate. Place it in the ring with a refinery annex in the estate, or in the estate with wells in the ring? | Ring, with a refinery annex |
| D2 | Fish, meat and poultry spans farming (ring) and processing (estate). Same choice. | Ring, with a processing annex |
| D3 | Sub-industries with no listed issuer: draw them as dotted buildings, or leave them out? | Draw them |
| D4 | Z1 and Z2 (listed investment products): no buildings, or notes in the money layer? | No buildings |
| D5 | Think-tank rooms at launch: two, or all four? | Two |
| D6 | Number format on the board: the site's current formatter or the house format (period thousands, comma decimals)? | The site's current formatter |
| D7 | Should buildings with published models show lit windows at night (coverage cue), or should all buildings light the same? | Lit only with a model |
| D8 | English labels throughout (the site's language), with Indonesian names from IDX shown on the card? | English labels; IDX Indonesian name on the card |
| D9 | Factory Yard: obtain a licence file from the author, or written permission for public use? | Ask for an MIT licence file |

---

## 19. Glossary

| Term | Meaning |
|---|---|
| Sub-industry | The finest level of IDX-IC, 130 in total |
| Registry | The reviewed data that places sub-industries, companies and links in the world |
| Published model | A model approved by the owner and present in `fsre_published` |
| Package | A published model's data as defined by contract v3.1 |
| Archetype | FSRE's structural template for a business (PROC, DIST, ASSET, with MINE planned) |
| Station | A place inside an archetype interior that carries physical-unit tags |
| Whiteboard | The in-world summary on the cut's back wall |
| Board | The full HTML panel for a company |
| Measured link | A link whose cost share and demand share both have a source |
| Expected link | A link the owner expects but has not measured |
| Condition mark | A numbered status mark from the schematic's shift overlays |
| Skema | The schematic view of the chain, kept alongside the world |

---

## Appendix A: Draft placement table (for gate 1)

| Zone | Sub-sectors and sub-industries |
|---|---|
| Ring, geological | A1 oil and gas production, coal production, drilling and oil, gas and coal services; B1 metals and minerals mining (gold, copper, precious and other metals), mining services; quarries for construction materials |
| Ring, biological | D2 plantations and food crops; D2 fish, meat and poultry (farming side); B1 wood and other forest products |
| Estate, primary processing | A1 refining; B1 basic, agricultural and specialty chemicals; construction materials (cement); steel and aluminium; paper; A2 alternative fuels |
| Estate, manufacturing | B1 containers and packaging; C1 all industrial goods; D2 beverages, dairy and processed food; D3 tobacco; D4 household and personal products; E1 parts, tyres, cars and motorcycles; E2 furniture, appliances, housewares; E3 consumer electronics, sports and hobby; E4 apparel, footwear, textiles; F1 healthcare equipment; F2 pharmaceuticals; I2 technology hardware; A2 alternative-energy equipment |
| Estate, utilities and operator | J4 electricity (including IPPs), gas, water; H1 the estate developer and operator |
| Gateway and logistics | J1 ports, airports, toll roads and rail; K1 transportation; K2 logistics and deliveries; A1 oil, gas and coal storage and distribution; C2 trading of industrial goods |
| Town, distribution and retail | D1 drug, food and staples distribution and retail, supermarkets and minimarkets; E7 all retailing and consumer-goods distribution |
| Town, consumer services and media | E5 all consumer services; E6 all media and entertainment |
| Town, health | F1 providers, supplies and distribution; F2 health research |
| Town, business district | C2 printing, office equipment, business support, personnel, research and consulting; I1 software, IT services, internet; C3 multi-sector holdings; G5 holding and investment companies; H1 other developers and real-estate services |
| Town, financial district and the money layer | G1 banks; G2 financing; G3 investment services; G4 insurance |
| Infrastructure, across the world | J3 telecommunications; J2 construction |
| Recovery yard | C2 environmental and facilities services |
| Unplaced | Z1, Z2 |

## Appendix B: Whiteboard content rules

- In-world whiteboard: three items only; no more than 12 characters per label; figures in the
  package's unit; values on the miniature waterfall's bars.
- Full board: eight sections in the order of section 7.7; each figure a button; the unsplit remainder
  hatched; "not available" states verbatim from the package; "vs one comparator" heading rule;
  download and open-model actions; source trace inspector reused from the model page.

## Appendix C: Status vocabulary

| State | Glyph | Colour token | Word |
|---|---|---|---|
| Published model | Filled square | Accent | Published |
| No model yet | Hollow square | Neutral | No model yet |
| No listed issuer | Dotted square | Muted | No listed issuer |
| Model status unavailable (outage) | Hollow square with a bar | Neutral | Status unavailable |
| Measured link | Solid line | Line | Measured |
| Expected link | Dashed line | Line | Expected, not measured |
| Thesis | Outlined label | Accent | Thesis |
| Model-based | Filled label | Accent | Model-based |
