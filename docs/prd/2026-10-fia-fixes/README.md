# Package 1 — Finance in Action fixes (13 items)

Status: decided, ready to build. Owner: Dika. Date: 2026-10-24.
Branch: `fix/fia-batch-2026-10`. One PR, one commit per item, no push before the diff is reviewed.

## 1. PRD

### Problem
The ADRO model page (`/finance/finance-in-action/adro`) was reviewed section by section. Thirteen defects were found: four are wrong or misleading numbers (placeholder legend, PTBA peer values in rupiah, strip ratio as a percentage, stale KPI period), four are visual noise (serif/mono fonts that differ from the rest of the site, scrollbars on both strips, workpaper and "why this link matters" blocks written for the builder rather than the reader), three are sections that answer the wrong question (KPI grid, Sankey, peer band), and two are navigation defects outside the model page (Green Transition landing, Next Big Thing themes).

### Goal
A reader who opens any coal-production model should, within the first screen, see what one tonne of coal earns and costs, and within the page, where ADRO sits against PTBA, ITMG and INDY in the same currency. Nothing on the public page should be addressed to the builder.

### Non-goals
- No change to the model packages' numbers or sources (FSRE output stays as published).
- No site-wide sweep of fonts, eyebrows or copy (explicitly deferred by owner, 2026-10-24).
- No change to essay bodies. Item 10 changes how references render, not what is stored.
- No restructuring of the Finance section (Package 2).

### Scope — the 13 items

| # | Item | Decision taken |
|---|---|---|
| 1 | Fonts on model pages | Use `--font-sans` for everything in the viewer except tabular numbers; drop `font-display` and `font-mono` from headings, KPI values, tickers and version strings |
| 2 | "On this page" nav | Hide scrollbar, keep scroll; links take the label's font and size (sentence case, not all-caps); sticky under header; right-edge fade; active section highlighted |
| 3 | "How the business makes money" | Replace the 17-card grid with a left-to-right value-chain flow: Mine → Haul & process → Sell → To the state → Result; mining services as a separate branch; per-tonne cells show "not disclosed quarterly" for 1Q25–2Q26 |
| 4 | Unit economics table | Source column last and abbreviated (full document names in a tooltip); grouped bar per tonne ADRO vs peers, with strip ratio as a row; one sign convention across the US$ thousand and per-tonne columns; fix the peer columns (see Architecture) |
| 5 | "Where a unit of coal goes" | Full Sankey: revenue sources → total revenue → cost lines in process order → gross profit → opex, finance, tax, minorities → profit to owners; US$ thousand not per tonne; inventory movement folded into cost of revenue with a tooltip; labels outside ribbons; caption rewritten |
| 6 | "Where ADRO sits in Coal production" | Remove the section and its nav link; the grouped bar in item 4 replaces it |
| 7 | PTBA currency | Convert Rp-denominated peer values to US$ for every cross-company comparison; rate and source shown in the caption |
| 8 | Workpaper record | Render only when the viewer is admin |
| 9 | "Why this link matters" | Replace with one line: `Related reading: Capital in Motion 03 · Commodity Windfall \| 09 · Strategic Downstreaming`; drop the quote and explanation; keep the chain-map link |
| 10 | Reference annotations (Finance essays) | Hide `VERIFIED: …`, `UNAVAILABLE: …`, `UNVERIFIED: …`, `MISNUMBERED: …` sentences from public render; show them to admin; a reference marked UNAVAILABLE that is not cited in the body is dropped from the public list; Damodaran edition verified against the publisher before touching the text |
| 11 | Glimpse order | The feature exists (Admin → Content → Homepage order). Make it reachable: an "Edit order" link beside the Glimpse heading in admin mode; replace up/down arrows with drag; keep newest-first fallback |
| 12 | Green Transition landing | `/green-transition` redirects (replace) to `/green-transition/now`; landing page deleted; breadcrumb "Green Transition" becomes plain text; the landing's intro sentence moves under the tabs on `/now`; empty phase tabs stay visible |
| 13 | Next Big Thing themes | Remove Society and Governance from tabs, dropdown, topic filter and Writer editor; move essay *"Thinking Was Expensive…"* (phase `society`) to `growth`; `?theme=society` / `?theme=governance` fall back to the all-essays view |

Defaults decided 2026-10-24 (apply without asking): header badge shows real counts from the package; KPI cards use the latest period that has volume (FY 25) with the period label visible; strip ratio formatted `3.55x`; numbers in en-US locale (`1,234.5`).

### Acceptance
- Every item verified on the ADRO page and on one peer page (PTBA, since it is the Rp case).
- Lighthouse accessibility ≥ the current score; sticky nav reachable by keyboard.
- `npm run lint && npm run typecheck && npm run test && npm run build` green.
- Playwright: existing `playwright.fia.config.ts` suite green plus the new specs in §4.

## 2. Plan

Order chosen so that data fixes land before the visuals that depend on them.

| Step | Items | Why this order |
|---|---|---|
| A | 7, 4 (peer fix) | Currency + `sameBasis` is the root of both; every later chart reads these values |
| B | 1, 2 | Typography and nav are touched by every section rewrite; do them once, first |
| C | 3, 5, 6 | Section rewrites; 6 is removal only |
| D | 4 (table + grouped bar) | Needs A and C's section order |
| E | 8, 9, 10 | Admin gating, same pattern reused three times |
| F | 11, 12, 13 | Outside the model page; independent |
| G | Verify | Screenshots before/after for each item, saved under `docs/prd/2026-10-fia-fixes/screenshots/` |

Estimated size: ~25 files touched, 2 migrations (item 13 data move; item 7 rate table), 3 new lib modules (`fx.ts`, `canonical.ts`, `valueChain.ts`), 4 new components, 3 removed.

Migration rule (from `docs/company-models`, 2026-10-24): production's migration history diverges from `supabase/migrations/`; apply each new migration individually via MCP `apply_migration` or the SQL editor, never `supabase db push`.

## 3. Design

### Typography (item 1)
- Headings in the viewer: `text-xl font-semibold` in `--font-sans`, matching essay section headings.
- Numbers: `tabular-nums` only; no `font-mono`. Tickers in CompanyBar/CompanyTabs: sans, `font-semibold`, `tracking-normal`.
- Only one typeface on the page. `--font-display` (Spectral) stays for essay titles elsewhere; it is not used inside the viewer.

### Section nav (item 2)
- `position: sticky; top: var(--header-h)`; background `bg-background/95` with `backdrop-blur`.
- `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`; `overflow-x: auto` kept.
- Right edge: 48px `mask-image: linear-gradient(to right, black 85%, transparent)` on the scroll container, removed when scrolled to the end.
- Links: same class as the "On this page" label minus the colour; active link `text-foreground` with a 2px bottom rule. Observe sections with `IntersectionObserver` (rootMargin `-40% 0px -55% 0px`).
- The sector strip (`StageStrip.tsx`) gets the same scrollbar treatment and fade.

### Value chain (item 3) — replaces KeyFigures grid
```
MINE                HAUL & PROCESS        SELL               TO THE STATE       RESULT
Overburden  Mbcm    Processing/reclam.    Tonnes sold  Mt    Royalty  %         Coal gross profit
Strip ratio x       Freight & handling    Realised price/t                      Operating income
Mining cost/bcm                           Coal revenue                          Profit to owners
Mining cost
                    └── Mining services revenue (separate branch, below the flow)
```
- Five stage columns, arrow between them, each cell: label, value + unit, prior-year same period in muted text below.
- A cell with no value in the selected period shows `not disclosed quarterly` in muted italics, not `—`.
- Quarter selector stays top-right. Below 768px the stages stack vertically with the arrow turned downward.

### Unit economics (item 4)
- Column order: Line · FY25 US$ thousand · US$ per tonne · Physical driver · PTBA · ITMG · INDY · Source.
- Source cell text: `Q1 26 n.26 · H1 26 n.27 · 9M 25 n.27 · FY 25 n.27`; `title` attribute carries the full document names.
- Signs: costs shown in brackets in both money columns (the per-tonne convention wins; the US$ thousand column currently shows positive).
- Grouped bar below the table: one group per line (revenue, mining, freight, royalty, processing, D&A, gross profit, strip ratio), four bars per group in a fixed ticker order and fixed neutral palette; the subject company's bar is the darkest. Value labels on bars. Legend by ticker. Rows missing for a peer are left as a gap with a dotted outline, never zero.

### Sankey (item 5)
- Four columns: Sources (Coal revenue, Mining services, Other) → Total revenue → Costs in process order (Mining, Processing, Freight, Royalty, D&A, Other cost of revenue) and Gross profit → Opex, Finance cost, Tax, Minorities, Profit to owners.
- Unit: US$ thousand, FY 25 (period selector shared with item 3).
- Labels sit left of source nodes and right of sink nodes; no text over ribbons, no white outline.
- Inventory movement is added into "Other cost of revenue"; its node tooltip lists the components.
- Caption: `FY 25, US$ thousand. Ribbons are proportional to value. Costs follow the order of the value chain above.`

### Admin-only blocks (items 8, 9, 10)
- Workpaper record and reference annotations render inside a `<AdminOnly>` wrapper that is `null` for non-admins; no "hidden" placeholder.
- Related reading line: `text-sm text-muted-foreground`, links underlined on hover, placed after the last section and before the footer.

### Glimpse (item 11)
- In admin mode a small "Edit order" link right of the "Glimpse" heading, pointing to `/admin/content#homepage-order`.
- `HomepageOrder.tsx` uses `@dnd-kit/sortable` (check `package.json` first; add only if absent) with keyboard sorting retained.

## 4. Architecture

### Item 4 + 7 — root cause and fix
`src/lib/finance-in-action/unitEconomics.ts`:
```ts
export function sameBasis(a, b, lineId) {
  return a.unitEconomics.unit === b.unitEconomics.unit && a.unitEconomics.basisLabel === b.unitEconomics.basisLabel && b.unitEconomics.lines.some(l => l.id === lineId);
}
```
PTBA's `unitEconomics.unit` is `Rp per tonne`; ADRO's is `US$ per tonne`. `sameBasis` returns false → `UnitEconomics.tsx:272` renders `COPY.notYetModelled`. ITMG/INDY fail the same check when their `lines[].id` differ from ADRO's. Two fixes:

1. **Line identity.** Packages are immutable JSON rows behind the `fia.model_packages` view (FSRE channel + `fia.manual_release`), versioned by `fia.contract_schema`; they are not to be edited in place. So: add an *optional* `canonical` field to the unit-economics line in `contract/model-package.schema.json` (enum: `revenue`, `mining`, `processing`, `freight`, `royalty`, `da`, `other_cost`, `gross_profit`, `strip_ratio`) for future packages, and for the four published ones resolve it in code: `src/lib/finance-in-action/canonical.ts` maps `(subIndustry, line.id | line.label)` → canonical, with the four tickers' actual ids listed explicitly and a unit test that every published package resolves every line. Compare on canonical, not `id`. When a line cannot be resolved the cell shows `not comparable`, never `not yet modelled`.
2. **Currency.** New module `src/lib/finance-in-action/fx.ts`:
   - `toUsd(value, currency, periodId, rates)`; rates read from a new table `fx_rates (period_id text, from_ccy text, to_ccy text, rate numeric, basis text check (basis in ('average','closing')), source text, source_url text)`.
   - Basis: `average` for P&L lines, `closing` for balance-sheet lines (unit economics uses average).
   - Seed FY25, 9M25, H125, Q125–Q226 USD/IDR from Bank Indonesia JISDOR monthly averages; `source_url` stored per row.
   - `sameBasis` is replaced by `comparable(a, b, canonical)` which returns `{ ok, convert }`; `perUnitInPackage` applies `convert` when the currencies differ.
   - Caption in `UnitEconomics.tsx` and the grouped bar: `PTBA converted at BI JISDOR FY25 average 16,xxx IDR/USD`.
   - `peers.ts` `readValue` runs through the same conversion so the PeerBand (until removed in item 6) and any future band is consistent.

### Item 3 — ValueChain component
- New `viewer/model/ValueChain.tsx` replacing `KeyFigures.tsx` in `LensPanels.tsx`.
- Stage → line mapping lives in `src/lib/finance-in-action/valueChain.ts` keyed by `canonical`, per sub-industry (`coal-production` first; other sub-industries fall back to the current grid until mapped).
- Period logic reuses `useModelView().period`; "not disclosed quarterly" is emitted when `cell.kind === 'missing'` for a period whose `periods[].kind === 'quarter'`.

### Item 5 — Sankey data
- `CostSankey.tsx` currently builds nodes from `unitEconomics.lines`. Rebuild from sheet rows: revenue rows by segment, cost rows by `canonical`, below-gross-profit rows by a `pnl` role (`opex`, `finance`, `tax`, `minority`, `owners`). The `pnl` role is an optional schema field for future packages and, for the four published ones, resolved by the same `canonical.ts` mapping (row ids listed per ticker, unit-tested). No package is re-released for this.
- Library: keep whatever `CostSankey.tsx` uses today (check import; do not add d3-sankey if it is already there).

### Items 8, 9, 10 — admin gating
- New `src/components/auth/AdminOnly.tsx`: reads the same admin check `RequireAdmin.tsx` uses; renders children or `null`.
- Item 10: `References.tsx` gets `stripAnnotations(label)` from `src/lib/editorial/referenceAnnotations.ts`: regex `/\b(VERIFIED|UNVERIFIED|UNAVAILABLE|MISNUMBERED)\b:?\s[^.]*\.(\s|$)/g` applied for non-admins; the regex is unit-tested against the five Damodaran/Brealey/Jensen/Hart/Johnson strings in `tests/`. A reference whose label contains `UNAVAILABLE` and whose body has no `[n]` / footnote pointing at it is filtered out of the public list (ArticleShell passes `citedIndexes`). Scope limited to `section = 'finance'` by the page, not by the component.
- Damodaran: before this item ships, check Wiley's catalogue for *Applied Corporate Finance*; record the result in `docs/DECISIONS.md` and align both the essay reference and the benchmark note.

### Item 12 — routes
`src/App.tsx`: `<Route path="/green-transition" element={<Navigate to="/green-transition/now" replace />} />`; delete `src/pages/GreenTransition.tsx`; `GreenTransitionPhase.tsx` gets the intro paragraph for `phase === 'now'`; breadcrumb component takes `current` without `href`. `src/config/navConfig.ts` top-level link for Green Transition → `/green-transition/now`.

### Item 13 — themes
- `src/config/nextBigThingThemes.ts`: remove `society`, `governance`.
- Migration: `update essays set phase = 'growth' where section = 'next-big-thing' and phase = 'society';` (one row; assert `count = 1`).
- `TheNextBigThing.tsx`: unknown `?theme=` → ignore the param.
- `WriterEditor.tsx:75` theme list reads from the config, not a local array.

### Tests to add
- `tests/fia/fx.test.ts`: conversion, basis selection, missing-rate → null (never silent zero).
- `tests/fia/comparable.test.ts`: ADRO↔PTBA per-tonne becomes non-null; ITMG line id mismatch resolved via `canonical`.
- `tests/editorial/referenceAnnotations.test.ts`.
- Playwright `tests/fia/adro-sections.spec.ts`: nav sticky after scroll; no `Workpaper record` text for anonymous; peer columns contain numbers for PTBA.

### Rollback
Each item is one commit; reverting a commit restores that section. The two migrations are additive (new columns/tables, one single-row update) and reversible by the down-scripts included in the migration files.
