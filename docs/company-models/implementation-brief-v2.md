# Company models: implementation brief v2 (viewer on FSRE)

Supersedes v1 of 30 Sep 2026. v1 gave the viewer its own data layer, extraction and review
workflow. Those now belong to the FS Reverse Engineering Suite (FSRE). This brief covers the
viewer only: a read-only view of FSRE's published models on dikagustiana.com, with in-browser
scenarios.

Read this brief, the reference prototype, FSRE `04_CONTRACTS.md` and FSRE
`06_DEPLOYMENT.md` before writing code. Then reply with a plan (routes, components, snapshot
types, test approach, milestones, open questions) and wait for approval before building.

## 0. Rules

- **No invented numbers.** Every figure the viewer shows comes from a published FSRE snapshot
  or is recomputed from one. The viewer never fetches, estimates or stores financial data of
  its own.
- **Evidence is visible.** Every input shows its evidence tier (`disclosed`, `derived`,
  `benchmarked`, `assumed`); every sourced figure shows its source tier (S1 to S6), document
  and locator; inferred drivers show their range, not only the mid value.
- **Colour code.** Follow the house colour code fixed at FSRE Checkpoint 0. Until then, use
  the prototype's legend only in fixture mode (section 3).
- **House number format.** Period for thousands, comma for decimals, negatives in
  parentheses, also in English text: `9.841`, `(1.475)`, `21,8%`, `6,3×`. User input is
  parsed the same way.
- **Branding.** Our own. The prototype borrowed a third-party layout (StockMap by Jatevo) for
  review only; no name, mark or data from it appears in production.
- **Site conventions.** Reuse dikagustiana.com's design tokens and components. The admin,
  authoring experience and theme are refined, never redesigned.

## 1. What the viewer does

- Lives at `/models` in the dikagustiana.com repository (Vite, React, TypeScript, Supabase).
- Reads `fsre_published` in the dikagustiana.com Supabase project with the anon key, SELECT
  only (06 §6.1). It has no write path to any FSRE schema.
- Renders each company's model snapshot as a live spreadsheet with a formula engine in the
  browser.
- Lets a visitor change `I_` input cells as a private scenario that recalculates everything,
  without writing anything back.
- Offers the FSRE-generated xlsx for download (the audited workbook), and optionally the
  visitor's scenario as a separate, clearly labelled file.

## 2. Timing and dependencies

Real data arrives only after FSRE passes its Checkpoint 3 dry run and Dika publishes a
company. Until then the viewer is built against fixtures.

| Needs | From |
|---|---|
| Snapshot JSON schema (`model_snapshot.schema.json`) | FSRE P-2, once Dika approves it at CP0 |
| `coverage`, `model_snapshots`, `workbooks` views | FSRE 06 §6.1 |
| IDX-IC list | FSRE `universe_map` (CP1). Do not hard-code sectors. The prototype's 11 sector tabs came from memory; FSRE's source (IDX Channel, Jan 2021) states 12 sectors, 35 sub-sectors, 69 industries and 130 sub-industries, and CP1 verifies the current list |
| Workbook layout per archetype | FSRE `financial-modeling` templates (`templates/<archetype_id>.md`) |
| Colour code | FSRE CP0 |

## 3. Reference prototype and fixture mode

The approved prototype lives in the private `fsre-skills` repository at
`docs/company-models/reference/ptba-model-prototype.html` (it is kept out of this repository
because it contains figures transcribed from a third-party screenshot). It is a single HTML file with the
UI, a formula engine, a four-sheet PTBA model and an xlsx export. Use it as the specification
for interaction and layout.

Its PTBA figures are **fixture data only**: the income statement was transcribed from a
third-party screenshot and the operating data comes from press reports, which FSRE treats as
S6, leads only. Rules for fixtures:

- Convert the prototype into one fixture snapshot that follows `model_snapshot.schema.json`,
  with every cell tagged `fixture: true`.
- Fixture mode shows a persistent banner and is available only in development and preview
  builds. A production build that contains fixture data fails CI.
- PTBA goes live only after FSRE has an extraction archetype for coal mining. FSRE's v0.1
  pilot archetypes are `ARC-DIST`, `ARC-PROC` and `ARC-ASSET`; adding one is a change
  proposal through `guruh` after the pilot, not a viewer decision.

The first live company is the first FSRE pilot company Dika publishes.

## 4. Sheets and cells

The viewer follows FSRE's house workbook standard (FSRE 03 §7), so the web view and the xlsx
are the same workbook. The prototype's four sheets map as follows:

| FSRE sheet | Prototype equivalent | Viewer behaviour |
|---|---|---|
| `B_` business summary | Summary | Opens first. Output only |
| `O_` calculation engine | Model details | Formulas only |
| `I_` inputs | Assumptions | The only editable cells, for scenarios |
| `CAL_` calibration | Checks vs reported | Actual vs modelled per line, residual, tolerance flag, from `calibration_report` |
| `CTRL_` controls | (none) | Named-range checks; a failing control is visible on the tab |
| `Z_` governance | Source notes | Assumption register, version history, sign-off |
| `Model_Details` README | Page notes | Shown as the sheet's description |
| Sources | Reported | Every sourced figure with document, locator and tiers |

Per cell, the formula bar shows: address; formula or value; and a line explaining the cell.

- Input: evidence tier, range (for example "850 to 910, mid 880, derived"), derivation text,
  binding-constraint flag, and the open question if one exists.
- Sourced figure: source tier, document and edition, locator (page, table or XBRL tag).
- Formula: the cells it uses on the same sheet are outlined; references to other sheets appear
  as buttons that jump there.

Aggregates restate the weakest tier of their inputs, as FSRE requires (01 §4). Show it on the
aggregate, not only on the inputs.

## 5. Formula engine

- Port the prototype engine (between `/*ENGINE-START*/` and `/*ENGINE-END*/`) to a TypeScript
  module with its own tests. It supports `+ − * / ^`, comparisons, `SUM`, `IF`, `IFERROR`,
  `ABS`, `AVERAGE`, `MIN`, `MAX`, ranges, `$` references, sheet-qualified references
  (`'O_'!C23`), error values and circular-reference detection. Extend it only for functions
  that FSRE templates actually use; list them from the templates, do not guess.
- **Parity:** on load, recompute every formula cell and compare with the Python value in the
  snapshot (relative tolerance 1e-9). Any mismatch blocks rendering of that company and shows
  which cell failed. Python is the source of truth (FSRE 03 §7).
- Full recalculation is fine at prototype size (about 2.800 cells). Add incremental
  recalculation only if a full pass exceeds 50 ms on a mid-range phone.

## 6. Viewer features

Keep from the prototype:

- sector tabs, then company pills, built from `coverage`. Published companies can be opened;
  sub-industries with none show counts only. Empty states say what is missing and offer the
  way to a published company;
- a KPI strip whose figures are chosen by the archetype template, not hard-coded. For
  example, throughput and markup for `ARC-DIST`, output and utilisation for `ARC-PROC`, fleet
  and revenue per trip for `ARC-ASSET`. Each KPI shows its tier;
- sheet tabs with a one-line description; a formula bar; sticky header rows and label column;
  shaded FY columns; a rule where reported periods end; precedents outlined; flash on
  recalculation (opaque colour, none under reduced motion);
- keyboard: arrows, Tab, Enter or F2 to edit an `I_` cell, typing to start editing, Esc to
  cancel; clear messages when someone tries to edit a formula or a sourced cell;
- Reset scenario, Full screen, horizontal scroll opening on the latest reported year, light
  and dark themes, layout from 360 px upward.

Add:

- **Scenario labelling.** Once any input changes, every affected sheet shows "Your scenario,
  not the published model" until Reset. Scenarios persist in local storage keyed by
  `company_id` and `wave_id`; a new wave discards old scenarios.
- **Peer context.** Where `benchmark_bands` exists for a driver, show the band next to the
  input. With two companies it is a pair range and must be labelled as such, not as a
  distribution.
- **Version line.** Wave, skill versions and publication date in the page header.
- **Downloads.** The published xlsx from `workbooks`. A scenario export, if built, is
  generated in the browser, named as a scenario, and carries the same sheet names.

Removed from v1: the data layer, extraction, COA mapping, review queue, and every check
against press reports.

## 7. Milestones and acceptance

| Milestone | Done when |
|---|---|
| V1 Fixture render | The PTBA fixture snapshot renders with feature parity to the prototype; engine tests pass; fixture banner shows |
| V2 Published schema | The viewer reads `coverage` and `model_snapshots` from `fsre_published`; parity check runs; a production build with fixtures fails CI |
| V3 First company | The first company Dika publishes renders with zero parity failures, every number traces to a snapshot cell with tier and locator, and the xlsx download matches the snapshot |
| V4 Coverage | Sector and sub-industry pages show coverage from `coverage`, with no names for unpublished companies |

Acceptance on every milestone: anon reads nothing outside `fsre_published`; keyboard and
focus states work; contrast holds in both themes; the layout works at 360 px.

## 8. Open decisions

| Decision | Default until decided |
|---|---|
| Colour code | FSRE CP0 decides; the viewer follows |
| KPI set per archetype | Taken from the FSRE template; if a template does not define one, show none rather than invent |
| Whether in-pipeline companies are named publicly | Not named; counts only |
| Scenario export | Deferred to after V3 |
