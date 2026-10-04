# Finance in Action: build prompt v3.1

You are working in the dikagustiana.com repository (`dikagustiana/dikagustiana.com`). If the
current folder is not that repository, find it under the current folder and work there.

First action: create the branch `feat/finance-in-action-v3` and save this whole prompt
verbatim as `docs/company-models/implementation-brief-v3.1.md` as the first commit. It
supersedes `docs/company-models/implementation-brief-v2.md` and any copy of v3. Where they
disagree, v3.1 wins.

Then work through every commit in section 7 without waiting for approval between commits.
Stop early only for the stop conditions in section 2. Finish with a draft pull request and
the final report.

## 1. What this section is

Finance in Action (section 06 of Finance, route `/finance/finance-in-action`) holds the
owner's company models of IDX-listed companies. Each model rebuilds a company's operation
from its own filings: volumes, capacity, cost per unit. Models come two or more per
sub-industry and are ordered along the same chain as the chain map on the About page, from
raw-material extraction to end users. The section is the close-up end of that chain map.

**Unit economics is the core of every model.** For each company the page shows one unit of
its product (a tonne of coal, a tonne of cement) split from price down to profit, with cost
of revenue broken into the lines of the cost-of-revenue note, each tied to the physical
driver that moves it. Links between industries are expressed in the same units, so one unit
of a downstream product can be split along the chain.

The site never builds models. It is a read-only consumer of the published output of the
owner's FS reverse-engineering suite (FSRE, private repository `dikagustiana/fsre-skills`).
FSRE has not published anything yet. This session builds the viewer against a synthetic
fixture, behind a flag, so that nothing reaches production until a real, approved model
version exists.

## 2. Hard constraints

Apply these exactly.

1. **Supabase project `asypkbkiebjvvpimewfp` only, read-only.** No migrations, no edge
   functions, no writes to any database, no changes to RLS or roles. Inspecting the schema
   read-only is allowed.
2. **No real company figures in this repository.** If you can read
   `fsre-skills/docs/company-models/reference/ptba-model-prototype.html`, port only the code
   between `/*ENGINE-START*/` and `/*ENGINE-END*/`. Never copy `DATA`, `OPS`, `CHK`, `EXTRA`
   or any other figure from it: they were transcribed from a third-party screenshot and from
   press coverage. If you cannot read it, write the engine yourself to the specification in
   section 4.
3. **Synthetic data never reaches production.** Everything new renders only when
   `VITE_FIA_PREVIEW=true`. With the flag unset, `/finance/finance-in-action` looks exactly as
   it does today. Synthetic fixtures are labelled SYNTHETIC in their file names, in their
   data, and on screen.
4. **Theme refined, not redesigned.** Use the site's existing design tokens, fonts and
   components (shadcn/ui). Add new tokens only for the roles listed in section 6, all in the
   one place where the site's tokens already live. No new typeface.
5. **No market data.** No share price, P/E, market capitalisation, target price or live
   market feed anywhere in the section.
6. **One source per list.** Chain stages come from the chain map's existing data, never a
   new list. Capital in Motion conditions (names and decision rules) come from section 05's
   existing data. Statuses, cell kinds, unit-economics line roles and lens colour roles are
   single exported constants.
7. **No number literals in components, and no stored per-unit figures.** Every figure on
   screen comes from a model package or the link register. Every per-unit figure is worked
   in the viewer from package rows divided by the package's denominator row; the package
   never carries a per-unit number that is not a formula over its rows.
8. **Cost of revenue is never one lump in unit economics.** It is shown as the lines of the
   cost-of-revenue note. A remainder is allowed only as a line with role `unsplit`, listing
   what it contains, drawn hatched, and never allocated across the named lines.
9. **No unit economics without a disclosed or derived volume.** If the denominator row is
   missing, or its cells are `missing`, the section says "Not available: volumes not
   disclosed" and draws nothing.
10. **A link between industries is drawn as measured only when both weights are sourced.**
    Solid and weighted only when cost share and demand share each carry a value and a
    source. Otherwise it is dashed and labelled "expected, not measured". Never derive a
    line weight from a placeholder.
11. **A peer band is drawn only from two or more published companies** in the sub-industry.
    Otherwise show the empty state in section 5.3, never a band with invented positions.
12. **Viewer edits never leave the browser.** No write-back, no persistence beyond the page.
13. **Colour never carries meaning alone.** Status is glyph plus word. Precedents carry ▲,
    dependents ▼. The unsplit line is hatched as well as coloured. Pairs of colours that must
    be told apart also differ in lightness.
14. **British English in all copy. One number formatter.** Use the convention the site
    already uses for numbers, and record it in the Commit 0 report. If there is none, use:
    point for thousands, comma for decimals, negatives in brackets (`1.234,5`, `(665)`,
    `15,5%`). The model grid and the unit-economics chart each state the convention once.
15. **Branch `feat/finance-in-action-v3`, draft pull request, never merge, never push to
    `main`.** Do not touch auth, the admin and authoring surfaces, or the TipTap editor.

### Stop and report, do not improvise, when

- a change would need a database write, a migration, an edge function, or a change to auth,
  admin, authoring or the editor;
- the chain map's stage data or section 05's condition data cannot be found (constraint 6
  depends on them);
- a test fails twice after a fix attempt.

Anything else that differs from this prompt (a token that does not map cleanly, a route
shape, a file in a different place): make the closest choice that keeps every constraint,
record it in the Commit 0 report or the final report, and carry on.

## 3. The published output contract (proposal)

The viewer reads one JSON package per model version. Define it as TypeScript types plus a
JSON Schema in `src/lib/finance-in-action/contract/`. Mark both files "proposal v3.1,
pending owner approval and FSRE P-2". FSRE will be made to emit this shape; do not change it
to suit the UI without saying so in the report.

```ts
type CellKind = 'sourced' | 'formula' | 'assumption' | 'missing';

interface ModelPackage {
  meta: {
    ticker: string; name: string;
    subIndustry: string;            // FSRE sub-industry code
    chainStage: string;             // id from the chain map's stage data
    pair: string[];                 // other tickers in the same sub-industry
    version: string;                // e.g. "PTBA-2026Q2-r1"
    contentHash: string;
    asOf: { latestQuarter: string; fullStatementsTo: string };
    provenance: 'filings' | 'fixture' | 'synthetic';
    status: 'published' | 'preview' | 'in_progress' | 'not_started';
    depth: 'foundation' | 'executive' | 'institutional';
    conditionIds: number[];         // section 05 condition numbers
    skillVersions: Record<string, string>;
  };
  periods: { id: string; label: string; kind: 'quarter' | 'fy'; forecast: boolean }[];
  sheets: { id: 'reported' | 'model' | 'assumptions'; rows: Row[] }[];
  driverTree: { nodes: TreeNode[]; edges: { from: string; to: string }[] };
  unitEconomics: UnitEconomics;
  peerBand: { metric: string; unit: string; period: string; value: number | null }[];
  workpaper: {
    gates: { name: string; status: 'passed' | 'passed_with_escalation' | 'failed' | 'not_run';
             note?: string }[];
    approvedBy?: string; approvedAt?: string;
  };
}

interface Row { id: string; label: string; unit: string; style?: 'total' | 'ratio';
  cells: Cell[] }                   // one per period, same order as periods

interface Cell {
  value: number | null;
  kind: CellKind;
  formula?: string;                 // engine syntax, sheet-qualified references
  source?: { issuer: string; document: string; period: string; page?: number;
             note?: string;         // note number in the statements, e.g. "28"
             xbrlConcept?: string; docSha256?: string };
  tieOut?: { externalValue: number; sourceText: string; difference: number;
             status: 'agrees' | 'differs' | 'not_checked' };
  note?: string;                    // e.g. why an assumption holds its value
}

interface TreeNode { id: string; label: string; rowRef: string } // rowRef = "sheet!rowId"

interface UnitEconomics {
  unit: string;                     // native unit, e.g. "tonne"
  basisLabel: string;               // e.g. "per tonne of coal sold"
  denominatorRowRef: string;        // the row holding the volume, e.g. "model!vol_sold"
  periods: string[];                // period ids with note-level detail
  lines: UELine[];                  // in waterfall order, revenue first
}

interface UELine {
  id: string; label: string;
  role: 'revenue' | 'cost' | 'subtotal' | 'unsplit';
  rowRef: string;                   // the row holding this line's rupiah value
  driver?: {
    description: string;            // e.g. "Cost per bcm × stripping ratio"
    physicalUnit: string;           // e.g. "Rp per bcm"
    inputRowRefs: string[];         // rows of the physical drivers behind it
  };
  contains?: string[];              // role 'unsplit' only: what sits inside it
}
```

`passed_with_escalation` is a separate gate status on purpose: a gate that passed with an
open escalation must never look like a clean pass.

Rules on `unitEconomics`, checked by validation tests:

- exactly one `revenue` line, first;
- at least one `cost` line before the first `subtotal`;
- at most one `unsplit` line per subtotal, and it must carry `contains`;
- each `subtotal` row equals the preceding revenue less the cost and unsplit lines above it,
  within the package's rounding, worked from the rows, not restated.

Link register, `src/data/finance-in-action/links.json`, typed in the same folder:

```ts
interface IndustryLink {
  id: string;
  from: string; to: string;          // FSRE sub-industry codes
  whatFlows: string;
  driverFrom: string; driverTo: string;
  intensity:   { value: number; unit: string; period: string; source: string } | null;
                                     // e.g. tonnes of coal per tonne of cement
  costShare:   { value: number; period: string; source: string } | null;
  demandShare: { value: number; period: string; source: string } | null;
  passThrough: { estimate: number; low: number; high: number; quarters: number;
                 source: string } | null;
  caveat?: string;
}
```

A link is measured only when `costShare` and `demandShare` are both non-null (constraint
10). When `intensity` is present and both sides have published unit economics, the viewer
also works the cost share itself (upstream revenue per unit × intensity ÷ downstream cost
per unit) and shows it beside the disclosed one with the difference. It never replaces one
with the other.

Seed the register with one entry, coal to cement, "Coal burnt as kiln fuel", with
`intensity`, both weights and `passThrough` all `null`, and this caveat: "The price a cement
plant pays can differ from a coal producer's realised price: calorific value, contract terms
and domestic market obligation rules all sit between them."

Fixtures, all synthetic, in `src/data/finance-in-action/fixtures/`:

- two companies in one invented sub-industry, so the peer band and the pair can be exercised,
  with invented names and tickers (for example "Example Coal Co", `XCOA`, and "Sample Coal
  Co", `SCOA`), round numbers, eight quarters plus one financial year, two forecast quarters,
  and `provenance: 'synthetic'`;
- every cell kind present, including `missing` cells and one `tieOut` that agrees and one
  that differs;
- unit economics on both, with at least three named cost lines and their drivers, one
  `unsplit` remainder with `contains`, gross profit and operating profit subtotals;
- a third synthetic company whose volume row is `missing`, to exercise constraint 9;
- a slate file listing the real planned companies (PTBA, ITMG, INTP, SMGR) with
  `status: 'not_started'` and no figures at all. Names and tickers are not figures.

## 4. Formula engine and connections graph

Put the engine in `src/lib/finance-in-action/engine/`, ported or written (constraint 2). It
must support `+ - * / ^`, comparisons, `SUM IF IFERROR ABS AVERAGE MIN MAX`, ranges, `$`
references, sheet-qualified references (`Model!C12`, `'Sheet name'!C12`), error values and
circular-reference detection. Keep it framework-free and test it.

Build the dependency graph from parsed references:
`precedents(cellRef)` and `dependents(cellRef)`, one level and full chain. Recalculation on
an assumption edit returns the set of changed cells and each one's delta. This graph is the
only source for the Connections lens and for the unit-economics drivers; never hand-code a
relationship.

## 5. Screens

These descriptions are the specification. Colours and fonts come from the site's theme
(constraint 4).

### 5.1 Index, lens off

- H1 and subhead. Use this draft copy and mark it in the code as owner-replaceable:
  "The chain, read one company at a time" / "Each model rebuilds a listed company's
  operation from its own filings: volumes, capacity, cost per unit. Two companies per
  sub-industry, ordered along the chain from extraction to end users, so a weak link can be
  compared with its neighbours rather than guessed at."
- "Models along the chain": one card per chain stage (from the chain map data), with the
  count of sub-industries and companies, joined left to right by plain connectors, then the
  two spanning layers (energy, logistics and warehousing) as full-width bands. A link to the
  chain map. The Connections toggle (off), drawn as a switch with the words "Connections off".
- Filters: search by ticker or name, a Capital in Motion condition select, and the status
  legend (Published, Preview, In progress, Not started, each a glyph plus word).
- One section per stage. Each sub-industry shows its name, a one-line note, and its company
  rows: ticker, name, status, latest quarter, depth, condition links. Stages without models
  say "No models yet."

### 5.2 Index, lens on

- The stage strip draws each link from the register between its stages. Measured: solid,
  thick line for cost share and thin line for demand share, weighted from the values.
  Unmeasured: one dashed line labelled "expected, not measured" (constraint 10). A legend
  explains the three line types.
- Selecting a link opens the link card: what flows, driver on each side, intensity, cost
  share (disclosed and, where possible, worked, with the difference), demand share, observed
  pass-through (estimate, range, number of quarters), the caveat, and a what-if box (change
  in the upstream price, %) computed only from measured weights and published models. With
  anything missing, the what-if says what is missing instead of showing a number. State on
  the card: "Worked in the viewer only. Published models do not change."
- Inside the link card, "One [unit] of [downstream product], split along the chain":
  downstream price per unit; the upstream input it burns or uses (upstream price per unit ×
  intensity); within that, the upstream producer's margin (upstream operating profit per
  unit × intensity); the downstream company's other costs per unit; and its own margin per
  unit. Every figure comes from the two sides' unit economics and the intensity. If any
  input is missing, show the structure with "not yet available" on the missing lines.
- Sub-industry notes carry "Feeds X" and "Fed by Y" links.

### 5.3 Model page, lens off

Choose the URL shape following the site's existing canonical URL structure, and record it.

- Breadcrumb: Finance in Action / stage / sub-industry.
- Header: name and ticker, sub-industry, pair (with "not yet modelled" where a pair company
  has no package), latest quarter and the quarter to which full statements run, status, the
  Connections toggle, and **Download .xlsx as the only primary action**.
- Provenance note, shown whenever `meta.provenance` is not `filings`, saying in one sentence
  where the figures come from.
- "How the business makes money": the driver row for the latest quarter with full
  statements, each node with the same quarter a year earlier as comparator. A node whose row
  feeds a register link carries a "Feeds X" link.
- "Unit economics, per [unit] sold" (section 5.4).
- "Where [ticker] sits in [sub-industry]": the peer band per metric, with this company's
  marker and the pair's. Empty state when fewer than two published companies: "The band
  appears once two companies in this sub-industry are published."
- "Why this link matters": the section 05 condition name and decision rule (from section
  05's data), one line on what this model supplies to it, and a link to the sub-industry on
  the chain map.
- "The model": tabs Reported, Model and Assumptions (one active); the cell legend (sourced,
  formula, assumption, missing); the unit line; the grid with a sticky label column, the
  financial-year column shaded, forecast period headers marked. A selected cell opens the
  inspector: value, kind, how it is built in words, tie-out, and the source of each sourced
  input (issuer, document, period, note, page, XBRL concept).
- "Workpaper record": version, preparer, each gate with its status, approver and date.

### 5.4 Unit economics

- Heading "Unit economics, per [unit] sold", with the period and the basis beside it
  (for example "FY 25, Rp thousand per tonne of coal sold"). A period selector lists
  `unitEconomics.periods`; default to the latest.
- One line of copy: "Each bar is a line from the cost-of-revenue note divided by [units]
  sold, so companies can be compared. The line under each bar names the physical driver
  that moves it."
- A waterfall in `lines` order. **Every bar shows its value on the bar.** Revenue and
  subtotals in one colour, named cost lines in another, the `unsplit` line hatched with a
  dashed edge. Under each bar, its label and its `driver.description` (or, for `unsplit`,
  its `contains` list). The legend states: "Per-unit figures are rounded; subtotals are
  worked before rounding."
- Below the chart, a table: line, value for the period, value per unit, physical driver,
  source (from the row's cells), and the pair's value per unit when the pair is published on
  the same basis, otherwise "not yet modelled". The last row states the denominator and its
  source.
- A provenance note whenever any line's cells are not sourced from filings, naming what the
  sources are.
- Selecting a bar or a table row selects its `rowRef`: the inspector opens, and with the
  Connections lens on, precedents and dependents mark as in 5.5. Selecting a bar's driver
  shows its `inputRowRefs` with their own values and units.
- Constraint 9 applies: no volume, no chart, only "Not available: volumes not disclosed".

### 5.5 Model page, lens on

- The driver row becomes the full driver tree with drawn edges, from operating drivers to
  profit to owners.
- Selecting a node, a cell or a unit-economics bar marks one level each way by default: the
  selected item, its precedents (tint plus ▲) and its dependents (tint plus ▼), in the tree,
  the waterfall and the grid. "Show full chain" extends it. Edges are drawn in the tree
  only, never across the grid or the waterfall.
- The inspector shows the chain as a clickable breadcrumb from the source filing to profit
  to owners.
- Direction caption. In a reported period: "The left-hand column is read out of the
  statements, so revenue per tonne is revenue divided by volume." In a forecast period:
  "The same arrows run forward, from operation to money." Write the caption from the
  package's period kind, not as fixed text.

### 5.6 Model page after an edit

- Editing an assumption cell recalculates through the engine. Changed cells, tree nodes and
  waterfall bars show their deltas. Changed items flash once, and not at all under
  `prefers-reduced-motion: reduce`. This is the only animation in the section.
- "What changed" in the inspector: the edit, then each changed row with its delta, in total
  and per unit.
- A "Reset" text link appears only after an edit.

### 5.7 Export

`Download .xlsx` exports the current state with live formulas, the cell-kind colours, edited
cells marked as edited, and a "Unit economics" sheet whose per-unit figures are formulas over
the exported rows. Load the xlsx library lazily, on click.

## 6. Theme mapping

Map each role below to the site's existing tokens, adding new tokens only for the rows marked
new. Record the mapping in the Commit 0 report.

| Role | Use |
|---|---|
| Ink, secondary text, rules, panel, primary action | existing tokens |
| Revenue and subtotal bars | existing primary colour |
| Sourced cell text | new: blue, at least 4.5:1 on white |
| Assumption cell fill and text | new: green tint with dark green text |
| Missing cell text | new: muted grey, at least 4.5:1 |
| Named cost bar | new: a warm colour, clearly darker than the dependent tint |
| Unsplit bar | new: grey hatch pattern with a dashed edge |
| Precedent tint | new: blue tint, lighter than the dependent tint |
| Dependent tint | new: orange tint |
| Changed tint | new: pale amber |
| Edited outline | new: dark green, 2px |

Quality floor: every control reachable by keyboard with a visible focus ring, touch targets
44px or more, text contrast 4.5:1 or more, tabular figures in the grid and the chart, and
layouts checked at 360, 768, 1024 and 1440px wide. The grid and the waterfall each scroll
horizontally inside their own box.

## 7. Commit sequence

**Commit 0: report, no code.** Write `docs/company-models/commit-0-report.md` with evidence
(paths, file excerpts, command output) on:

1. the current state of `/finance/finance-in-action` and the files behind it;
2. where the chain map's stage data lives, and its stage ids;
3. where section 05's conditions and decision rules live, and whether the rules carry
   numeric thresholds;
4. the theme token file, and the mapping table from section 6;
5. the number convention the site already uses (constraint 14);
6. the visibility of this repository, and whether you could read `fsre-skills` and the
   prototype's `ENGINE` markers;
7. the live columns of `finance_models` on `asypkbkiebjvvpimewfp` (read-only), compared with
   the contract in section 3, and the change you propose (written proposal only, in
   `docs/company-models/schema-proposal-v3.md`);
8. the URL shape chosen for model pages;
9. anything in this prompt you think is wrong, and what you did about it.

Commit it, then continue.

**Commit 1:** contract types and JSON Schema (including `unitEconomics` and `intensity`),
synthetic fixtures, slate file, link register seed, the `VITE_FIA_PREVIEW` flag, and
validation tests, including the `unitEconomics` rules in section 3.
**Commit 2:** engine, dependency graph, recalculation with deltas, and their tests.
**Commit 3:** index, lens off (5.1).
**Commit 4:** model page, lens off, without unit economics (5.3).
**Commit 5:** unit economics: waterfall, table, driver inputs, the not-available state (5.4).
**Commit 6:** Connections lens on the model page, including edits (5.5, 5.6).
**Commit 7:** Connections lens on the index, the link card and the per-unit split along the
chain (5.2).
**Commit 8:** xlsx export with the Unit economics sheet (5.7).
**Commit 9:** accessibility and responsive pass. Take screenshots at 360, 768, 1024 and
1440px with the flag on, one of the not-available state, and one with the flag off showing
the page unchanged.

Then push the branch, open a draft pull request with the screenshots attached, and send the
final report: what was built, test results, every deviation from this prompt with its
reason, and the open items in section 9.

## 8. Not in this session

- Applying any schema change, migration or edge function.
- Reading real data from `fsre_published`. That starts after FSRE passes its Checkpoint 3
  dry run and the owner approves the contract.
- Any real company page in production.

## 9. Open items for the owner (list them in the final report; do not act on them)

1. The H1 line, which should carry the owner's own thesis.
2. Section 05 decision rules without numeric thresholds, which limit what "Why this link
   matters" can say.
3. FSRE proposal P-2 (formula output alongside xlsx), which the Connections lens and unit
   economics depend on.
4. On the FSRE side: each archetype must list its cost-of-revenue lines with their physical
   drivers and denominators, and `fs-intake` must extract the cost-of-revenue note, not only
   the face statements. Whether IDX XBRL tags that note's detail is unverified.
5. The `finance_models` schema change, applied only after approval.
