# Finance in Action v3.1: Commit 0 report

Date: 4 October 2026. Branch: `feat/finance-in-action-v3`, cut from `main` at `3c1f3a8`
(merge of PR #39). Brief: `docs/company-models/implementation-brief-v3.1.md`.

Baseline on that commit, before any change:

```
$ npx eslint . --max-warnings=35        → ✖ 25 problems (0 errors, 25 warnings)
$ npm run typecheck                     → tsc -b --force, exit 0
$ TZ=America/Chicago npx vitest run     → Test Files 48 passed (48), Tests 727 passed (727)
```

## 1. Current state of `/finance/finance-in-action`

Routes, `src/App.tsx`:

```
70: const FinanceInActionIndex = lazy(() => import("./pages/FinanceInActionIndex"));
71: const FinanceModelDetail = lazy(() => import("./pages/FinanceModelDetail"));
150: <Route path="/finance/finance-in-action" element={<FinanceInActionIndex />} />
151: <Route path="/finance/finance-in-action/:modelSlug" element={<FinanceModelDetail />} />
```

Files behind it:

| File | What it does |
|---|---|
| `src/pages/FinanceInActionIndex.tsx` | H1 "Finance in Action", subhead "Institutional-grade financial models for CFO and board-level capital decisions.", a count "N of M models available", and one row per `finance_models` row (number, name, flagship star, depth chip, "View Model"). Empty state: "No models configured yet." |
| `src/pages/FinanceModelDetail.tsx` | One `finance_models` row by slug: header, "Draws From" (module references), "Model Documentation", "Model File" (download link to `excel_file_url`), and the admin panel for admins. Unknown slug renders `NotFound`. |
| `src/hooks/queries/useFinanceModels.ts` | `useFinanceModels`, `useFinanceModelBySlug` (SELECT, published rows), `useUpdateFinanceModel` (admin write, used by the admin panel only). |
| `src/components/finance-in-action/ModelAdminPanel.tsx` | Admin-only editing surface. Out of scope (constraint 15); not touched. |
| `src/config/navConfig.ts` | `{ label: 'Finance in Action', path: '/finance/finance-in-action' }` in `financeItems`. |

Live data (read-only query on `asypkbkiebjvvpimewfp`):

```sql
select count(*) as rows, count(*) filter (where is_published) as published,
       count(*) filter (where excel_file_url is not null) as with_file from public.finance_models;
→ [{"rows":0,"published":0,"with_file":0}]
```

So production today shows the H1, the subhead, "0 of 0 models available" and "No models
configured yet." With the flag unset, that is exactly what it will still show (section 8
below explains how the flag is compiled out).

## 2. The chain map's stage data

`src/data/industryChain.ts` (2.293 lines) is the chain map's content layer; the plate on
`/about` (`src/pages/About.tsx` → `IndustryChainSection`) and the landing-page preview both
read it. Stages:

```ts
export const STAGES: Stage[] = [
  { id: 'stage-biological',    label: 'Biological primary production', ... origin: true },
  { id: 'stage-extraction',    label: 'Geological extraction', ... origin: true },
  { id: 'stage-processing',    label: 'Primary processing', detail: 'Basic industry: refining, petrochemicals, milling and slaughtering.' },
  { id: 'stage-packaging',     label: 'Packaging manufacture', ... },
  { id: 'stage-manufacturing', label: 'Finished-goods manufacturing', ... },
  { id: 'stage-consumption',   label: 'Consumption and use', ... },
  { id: 'stage-recovery',      label: 'Recovery', ... },
];
```

Reading order comes from `COLUMNS` (stages interleaved with intermediary nodes); the viewer
orders stages by their position in `COLUMNS`. The two spanning layers come from `BANDS`:
`band-energy` ("Energy") and `band-logistics` ("Logistics and warehousing"). Public
addresses come from `SLUGS` (`stage-extraction` → `extraction`), and the chain map's URL
contract is `useChainUrl.ts`: `/about?distance=finance&node=<slug>`. The viewer links to a
sub-industry's stage on the map with that contract and builds no second list.

## 3. Section 05's conditions and decision rules

`src/data/capitalConditions.ts`: `CONDITIONS` (21 records: `id`, `number`, `title`,
`caseCompany`, `tension`, `quantitative`, `rule`, `layer`), `LAYERS`, `LAYER_ORDER`,
`getConditionByNumber`, `SHOW_CASE_COMPANIES = false`. Pages: `/finance/capital-allocation`
and `/finance/capital-allocation/:conditionSlug` (slug = `id`).

Numeric thresholds: **none of the 21 `rule` strings contains a digit.**

```
$ grep -n "rule: '[^']*[0-9]" src/data/capitalConditions.ts
(no output)
```

The figures live in `quantitative` (for example condition 3: "Windfall EBITDA margin
40–50% at cycle peak → Normalized margin 15–20% …"), which is narrative, not a rule. "Why
this link matters" therefore quotes the condition title and rule verbatim and cannot test
a model figure against a threshold. Open item 2 stands.

## 4. Theme tokens and the mapping

Tokens live in one place: `src/index.css` (`:root` and `.dark` inside `@layer base`), exposed
to Tailwind through `tailwind.config.ts` (`colors: { primary: "hsl(var(--primary))", … }`).
Fonts: `--font-sans` (Plus Jakarta Sans) and `--font-display`/`--font-serif` (Spectral),
self-hosted. No new typeface is added. The site has no theme switcher (nothing adds the
`.dark` class), but each new token also gets a `.dark` value so the set stays complete.

| Role | Token | Value (light) | Evidence |
|---|---|---|---|
| Ink | existing `--foreground` | 215 25% 17% | 14,57:1 on white |
| Secondary text | existing `--muted-foreground` | 215 15% 45% | 5,05:1 on white |
| Rules | existing `--border` | 215 20% 88% | |
| Panel | existing `--card`, `--popover` | 200 40% 96%, white | |
| Primary action | existing `Button` default (`--primary`) | 215 28% 17% | |
| Revenue and subtotal bars | existing `--primary` | 215 28% 17% | white label on it 14,62:1 |
| Sourced cell text | new `--fia-sourced` | 212 85% 33% | 8,00:1 on white; 6,03:1 on the dependent tint |
| Assumption cell fill | new `--fia-assumption-bg` | 142 55% 92% | |
| Assumption cell text | new `--fia-assumption-fg` | 145 70% 20% | 7,66:1 on its own fill |
| Missing cell text | new `--fia-missing` | 215 10% 36% | 6,94:1 on white; 5,23:1 on the dependent tint |
| Named cost bar | new `--fia-cost` | 24 75% 38% | white label 5,34:1; contrast against the dependent tint 4,02:1 (clearly darker) |
| Unsplit bar | new `--fia-unsplit` | 215 10% 55% | drawn as a hatch with a dashed edge, never a fill alone |
| Precedent tint | new `--fia-precedent` | 210 90% 95% | relative luminance 0,877 |
| Dependent tint | new `--fia-dependent` | 28 95% 86% | relative luminance 0,741, darker than the precedent tint |
| Changed tint | new `--fia-changed` | 48 100% 88% | ink on it 13,06:1 |
| Edited outline | new `--fia-edited` | 145 70% 24% | 6,86:1 on white, 2px |

Contrast was measured with the WCAG 2.x formula (script kept outside the repository; values
are reproducible from the HSL triplets). Pairs that must be told apart also differ in
lightness: revenue (L 17%) against cost (L 38%), precedent (L 95%) against dependent (L 86%),
cost bar against the dependent tint (4,02:1).

## 5. The site's number convention

The site already formats financial figures one way where it formats them at all:

```ts
// src/components/consolidation/WorkingPaperTable.tsx:79
function formatValue(val: number | null | undefined): string {
  if (val === null || val === undefined || val === 0) return '—';
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return val < 0 ? `(${formatted})` : formatted;
}
```

That is point for thousands, comma for decimals, negatives in brackets. The v2 brief stated
the same house format (`9.841`, `(1.475)`, `21,8%`), and FSRE's `shared/house_format.py`
uses the same separators. (`src/pages/FsliList.tsx` uses `toLocaleString('en-US')` for a
placeholder table; it is the one exception and is not a financial view.) The viewer adopts:
`1.234,5`, `(665)`, `15,5%`, through one formatter in
`src/lib/finance-in-action/format.ts`, written without `Intl` so the output does not depend
on the ICU data of the machine. The grid and the chart each state the convention once.

## 6. Visibility and FSRE access

- `dikagustiana/dikagustiana.com` is **private** (GitHub API: `"private": true,
  "visibility": "private"`). Constraint 2 applies regardless.
- `dikagustiana/fsre-skills` was attached read-only and cloned shallow (HEAD
  `91bb4b7`). The prototype is at
  `docs/company-models/reference/ptba-model-prototype.html`; markers found:

```
$ grep -n "ENGINE-START\|ENGINE-END" ptba-model-prototype.html
287:/*ENGINE-START*/
814:/*ENGINE-END*/
```

The block between the markers is not only engine code: lines 289–402 are the engine
(`colLetter`, `colIndex`, error values, `tokenize`, `parse`, `rangeKeys`, `refsOf`, class
`Engine`), and from line 404 the same block holds `SRC_SHOT`, `DATA`, `EPS_FY`, `ORIG_ROW`,
`EXTRA`, `OPS`, `CHK`, `VOL_DEF`, `ASSUME` and the PTBA row builders. Only lines 289–402 are
ported (to TypeScript, in `src/lib/finance-in-action/engine/`). Nothing from line 404 on is
copied, and no figure from the prototype or the mockups enters this repository.

## 7. `finance_models` on `asypkbkiebjvvpimewfp`, against the contract

Read-only query:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema='public' and table_name='finance_models'
order by ordinal_position;
```

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| slug | text | no | |
| number | text | no | |
| name | text | no | |
| description | text | yes | |
| depth | model_depth (enum) | no | 'foundation' |
| version | text | no | 'v1.0' |
| last_updated | date | no | CURRENT_DATE |
| documentation | jsonb | no | '{}' |
| module_references | uuid[] | no | '{}' |
| excel_file_url | text | yes | |
| is_flagship | boolean | no | false |
| is_published | boolean | no | true |
| sort_order | integer | no | 0 |
| created_at, updated_at | timestamptz | no | now() |

RLS: anon reads published rows; authenticated admins insert, update and delete. There is
no `fsre_published` schema on the project yet:

```sql
select n.nspname, c.relname, c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('fsre_published','fsre') or c.relname like 'finance_model%';
→ finance_models (r), finance_models_pkey (i), finance_models_slug_key (i)
```

Against the contract: `depth` matches `meta.depth` exactly; `name` matches `meta.name`;
`version` exists but is free text. Missing: `ticker`, `subIndustry`, `chainStage`, `pair`,
`status`, `provenance`, `conditionIds`, `asOf`, `contentHash`, and any link to the package
itself. The written proposal is `docs/company-models/schema-proposal-v3.md`. Nothing was
applied.

## 8. URL shape and the flag

Canonical URLs on this site are section path plus one slug: `/finance/capital-allocation/
:conditionSlug`, `/accounting/fsli/:slug`, and today's `/finance/finance-in-action/:modelSlug`.
Model pages keep that shape with the ticker as the slug, lower case:

```
/finance/finance-in-action/xcoa
```

A ticker is unique on IDX and does not change with a version, so the address survives a new
model version. Stage and sub-industry are carried by the breadcrumb, which links to the index
anchors (`/finance/finance-in-action#stage-extraction`, `#sub-SYN-COAL`).

The flag: `VITE_FIA_PREVIEW` is read once in `vite.config.ts` (`loadEnv`) and defined as the
compile-time constant `__FIA_PREVIEW__`. `App.tsx` chooses each route's lazy import with it,
so with the flag unset the preview pages, the fixtures and the engine are dead code that
Rollup drops: no chunk is emitted. `scripts/assert-no-synthetic.mjs` runs after `vite build`
and fails the build when `SYNTHETIC` appears in `dist/` with the flag off, or when the flag is
on in a Vercel production build.

## 9. What I think is wrong or underspecified in the brief, and what I did

1. **Branch.** This cloud session was opened on `claude/finance-in-action-v3-h5iwlk`. The
   brief names `feat/finance-in-action-v3`. I work on the brief's branch and push the same
   commits to the session branch too, so both point at the same history; the draft pull
   request is opened from `feat/finance-in-action-v3`.
2. **The handoff zip disagrees with the prompt.** Its `HANDOFF.md` and its copy of the brief
   say to stop after Commit 0 and wait for "gas", and ask for a mockup pull request in
   `fsre-skills`. The prompt as sent says to continue without waiting, and does not ask for
   the `fsre-skills` pull request. The prompt wins. The brief saved in the repository is the
   prompt, verbatim. The `fsre-skills` mockup pull request is not done; it is listed in the
   final report.
3. **Stage names.** The mockups use six stages (Raw-material extraction, Basic industry,
   Processing industry, Distribution, Sales channels, End users) that are not in the chain
   map. Constraint 6 decides: the index uses the seven `STAGES` of `industryChain.ts` in
   `COLUMNS` order, with their own labels. Coal sits on `stage-extraction`, cement on
   `stage-processing` (its own `detail` reads "Basic industry: …").
4. **`chainStage` cannot name a spanning layer.** The contract says "id from the chain map's
   stage data", but a power producer or a logistics company belongs to `band-energy` or
   `band-logistics`. The types accept a stage id or one of those two band ids; the schema
   proposal says so. No fixture uses a band.
5. **Cell addresses are not defined.** Formulas use "engine syntax, sheet-qualified
   references" but the contract does not say which address a row and a period have. I added
   the convention to the contract file: sheet name = sheet id (case-insensitive, as in
   Excel); row 1 is the header; `rows[n]` is row `n + 2`; column A is the label, column B the
   unit, column C the first period. The exported workbook uses the same layout, so formulas
   are written out verbatim.
6. **Rounding is not in the contract.** "Within the package's rounding" needs a number. I
   added optional `meta.rounding: { decimals }`; the subtotal tolerance is half a unit of the
   last decimal (0 decimals when absent).
7. **`peerBand.value` is a stored number.** Constraint 7 forbids stored per-unit figures that
   are not formulas over rows. I added optional `rowRef` to each peer-band entry; validation
   requires the value to equal that row's cell for the period, and the viewer reads the row.
8. **Two pieces of copy have no field.** "One line on what this model supplies" to a
   condition and the workpaper "preparer" are not in the contract. I added optional
   `meta.conditionNotes` (keyed by condition number) and `workpaper.preparedBy`.
9. **FSRE's existing contract is a different shape.** `fsre-skills/contracts/
   model_snapshot.schema.json` (`format: fsre-workbook`) has sheets `B_ O_ I_ CAL_ Z_ CTRL_
   FWD_ Model_Details`, cells keyed by A1 address with `s ∈ {input, gap, formula, label,
   header}`, evidence tiers and value ranges. v3.1's package is not that shape. P-2 must emit
   both or map one into the other (likely `I_` → assumptions, `O_` → model, sourced figures
   → reported, `gap` → `missing`). Recorded as open item 3; I did not change the v3.1 shape.
10. **Which subtotal is "operating profit".** The per-unit split along the chain uses the
    upstream operating profit per unit, but subtotal lines carry no meaning beyond their id.
    The viewer takes the last subtotal in `lines` as operating profit and the first as gross
    profit, and the validator requires at least one subtotal.
11. **The year-ago comparator** is the quarter four places earlier in the package's quarter
    sequence (financial-year columns skipped). A package without it shows "no comparator".
12. **The fixture period set** is read as eight reported quarters, one financial year and two
    forecast quarters: 24Q1–25Q4, FY 25, 26Q1E, 26Q2E.
13. **The peer band and "published".** Constraint 11 needs two published companies; the two
    synthetic coal companies are therefore `status: 'published'` inside the synthetic set
    (labelled SYNTHETIC everywhere). The third synthetic company is `preview`.
14. **The what-if.** The brief does not give its formula. The link card works the downstream
    gross-margin change, holding the downstream price, as `− cost share × upstream price
    change × cost of revenue ÷ revenue`, from measured weights and the downstream published
    unit economics only; with anything missing it names what is missing.
15. **The xlsx library.** The prototype loaded ExcelJS from a CDN; the site's CSP allows
    scripts only from `'self'`. ExcelJS 4.4.0 is added as an npm dependency and imported
    dynamically on click, so it is its own chunk and never loads with the page.
