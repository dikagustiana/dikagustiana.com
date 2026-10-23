Finance in Action: the chain view, build prompt (site)

You are working in the `dikagustiana/dikagustiana.com` repository. If the current folder is not that repository,
find it under the current folder and work there.

Attached with this prompt: `PRD.md` and `PLAN.md` (Indonesian, the owner's language) and `PROMPT-model.md` (the
separate prompt for building company models; not yours to run). They are the specification. Where this prompt
and they disagree, this prompt wins; record the difference in your report.

## First action

`git fetch origin` and create branch `feat/fia-chain-view` from `origin/main`. Record the HEAD SHA (expected
`836faf1` or later). Save `PRD.md`, `PLAN.md`, `PROMPT-site.md` and `PROMPT-model.md` verbatim under
`docs/company-models/chain-view/` as the first commit. Then work through commits 2 to 9 of `PLAN.md` §Fase B
without waiting for approval between them. Finish with one draft pull request and the report in section 7.

## 1. What this is

Section 06 (`/finance/finance-in-action`) shows company models ordered along the industry chain. Today the chain
stops at sub-industries: a model page does not show the companies upstream and downstream of it, the homepage
chain map does not lead into the section, and the model page has no at-a-glance summary. This work makes the
chain visible at company level and gives the pages a layout modelled on StockMap (oyenza.trade, `#models-<code>`):
stage pills, a company rail, key-figure cards, and the model in one large card with a cell legend and
Reset / Full screen / Download.

Read before you start, and keep every constraint in them that this prompt does not change:
`docs/company-models/implementation-brief-v3.1.md` (sections 2, 3, 5, 6), `docs/company-models/two-gates/PRD.md`,
`docs/DECISIONS.md` entries for Finance in Action, `src/lib/finance-in-action/**`,
`src/components/finance-in-action/**`, `src/pages/finance-in-action/**`, `src/data/industryChain.ts`,
`src/components/industry-chain/**`.

## 2. Hard constraints

1. **No market data.** No share price, P/E, P/B, market cap or target price (brief v3.1 constraint 5, PRD D-M1).
   StockMap's valuation tiles become operating figures.
2. **No real company figures in the repository.** Tests, fixtures and screenshots committed to the repo use the
   SYNTHETIC fixtures only. Real packages live in the database (`fia.model_packages`). Production screenshots, if
   any, are described in the report, not committed.
3. **The package contract does not change.** `src/lib/finance-in-action/contract/types.ts` and
   `model-package.schema.json` stay as they are, and so does `fia.contract_schema`. The only data-shape change is
   in the link register (constraint 4).
4. **Link register change (PRD D-C1).** Add an optional `downstreamLines?: Record<string, string>` to
   `IndustryLink` in `contract/links.ts`: ticker → `unitEconomics.lines[].id` of the downstream company's line that
   carries this input. Update `link-register.schema.json`, its validation and tests. A ticker or line id that does
   not resolve against a loaded package is reported by validation and ignored on screen, never guessed.
5. **Company-level chain is derived, never hand-written (PRD D-C2).** Upstream companies of X are the companies
   in `link.from` for every link whose `to` is X's sub-industry; downstream likewise. Use `linksFrom` / `linksTo`
   in `lib/finance-in-action/links.ts`. Bands (`band-energy`, `band-logistics`) appear as their own group.
6. **One source per list.** Stages and bands come from `src/data/industryChain.ts` via
   `lib/finance-in-action/chain.ts`; never a new list. Statuses, cell kinds, line roles and colour roles stay
   single exported constants.
7. **No number literals in components and no stored per-unit figures** (brief v3.1 constraint 7). Every key
   figure is worked from package rows; per-unit figures are row ÷ the `denominatorRowRef` row.
8. **Every v3.1 screen rule still holds**: no unit economics without volume (constraint 9), measured links only
   with both weights sourced (constraint 10), peer band only from two or more published companies (11), edits
   never leave the browser (12), colour never carries meaning alone (13), British English and the one number
   formatter (14).
9. **No new dependency for charts.** The sankey and every other drawing are hand-built SVG like `LinkLayer.tsx`
   and the unit-economics waterfall. Do not add d3, recharts, react-flow, a sankey package or a spreadsheet engine.
10. **Theme refined, not redesigned.** Existing tokens, fonts and shadcn components. New tokens only where a new
    colour role is needed, in the file where tokens already live, recorded in the report.
11. **No database or production writes.** No migrations, no `publish-manual.ts --stage/--publish`, no Vercel or
    Supabase settings. Reading production pages and `fia.model_packages` with the public key is allowed.
12. **Do not touch** auth, admin, authoring, the TipTap editor, the FSRE pipeline, or the economy distance of the
    homepage chain map.
13. **CI as in `.github/workflows/ci.yml`**: eslint under its ceiling, typecheck clean, vitest green,
    `assert-test-count` floor raised and never lowered, build, live build with `assert-no-synthetic`.
14. **Draft PR only.** Never merge, never push to `main`.

### Stop and report, do not improvise, when

- a change would need the package contract, a migration, or any database write;
- the homepage chain map's stage boxes cannot take a link without changing the economy distance or breaking its
  keyboard and screen-reader behaviour;
- a test fails twice after a fix attempt.

Anything else that differs (a component in a different place, a token that does not map cleanly): make the
closest choice that keeps every constraint, record it, carry on.

## 3. Screens

### 3.1 Index (`/finance/finance-in-action`)

- Below the subhead, a row of **stage pills**: every stage and band in chain order, each with its count of
  companies on the slate and the count published (for example "Geological extraction 4 · 0 published"). Selecting
  a pill scrolls to that stage's section and sets the URL hash. Pills scroll sideways on phones, with the current
  one kept in view.
- Every stage section gets an `id` of `stage-<stageId>` (bands: `band-<id>`), so `#stage-stage-extraction` style
  anchors work from anywhere. Choose the exact id format once, export it as a helper, and use it from the
  homepage (3.6).
- Everything already on the index (filters, status legend, "Models along the chain", the Connections lens, the
  link card) stays.

### 3.2 Model page, top

- **Company rail** on the left on desktop and tablet, a sideways row on phones: the companies in the same
  sub-industry first, then the rest of the stage, each with ticker, short name and status glyph plus word. The
  current company is marked with `aria-current="page"`. Unpublished companies are listed and not linked.
- **Key-figure cards** (PRD D-M1), for the latest period in `unitEconomics.periods` (or the latest quarter with
  full statements when unit economics is not available):
  1. volume sold (the denominator row), with the same period a year earlier as a pill: "+4.1% year on year";
  2. revenue per unit;
  3. cost of revenue per unit;
  4. operating profit per unit, or gross profit per unit when there is no operating subtotal;
  5. profit to owners for the period, if the model sheet has the row.
  Which rows play these roles is read from `unitEconomics` (denominator, the `revenue` line, `cost`/`unsplit`
  lines, `subtotal` lines). Profit to owners is read from the driver tree's root. When a role cannot be found,
  the card says "Not in this model" and shows no number. Each card states its unit and period.

### 3.3 Model page, "The model" card

One large card holding: the tabs Reported / Model / Assumptions; the cell legend (sourced, formula, assumption,
missing), each a swatch plus a word; the unit line; the grid; and the actions **Reset** (only after an edit),
**Full screen** (the card fills the viewport, Esc returns, focus is kept), **Download .xlsx** (the existing
export, still the only primary action on the page). Keep the inspector working as it does now.

### 3.4 Model page, "Along the chain"

A section after the driver row, before unit economics, with three groups:

- **Upstream**: for each link into this sub-industry, the upstream sub-industry, what flows (`whatFlows`), the
  link state (measured, or "expected, not measured"), and its companies with status and a link to each published
  model.
- **This stage**: the pair and other companies in the sub-industry (the same list as the rail; a short line, not a
  repeat of the rail on desktop).
- **Downstream**: the same for links out of this sub-industry.
- Bands: when the company sits on a band (`band-energy`), say which stages it feeds ("an input into every stage").
- Selecting a link opens the existing `LinkCard`.

Empty groups say so ("No upstream link in the register yet.").

### 3.5 Model page, "Where a unit of [product] goes" (sankey)

Placed directly after the unit-economics waterfall, sharing its period selector.

- Hand-built SVG. Right: revenue per unit. Flows split it into each `cost` and `unsplit` line and the profit
  subtotal, in `lines` order, widths proportional to the per-unit values (worked in the viewer, constraint 7).
- Left: for every register link whose `downstreamLines[thisTicker]` names a line, an upstream node labelled with
  the upstream sub-industry and its published companies, joined to that line. Selecting the node goes to the
  upstream company (one published) or opens the link card (several).
- The `unsplit` flow is hatched and lists `contains` on hover and focus; negative profit is drawn as a separate
  marked flow, not a negative width.
- Every flow carries its label and value as text. A table under the chart gives the same figures; screen readers
  get the table. Keyboard: each node and flow is focusable in a sensible order.
- No volume: the section says "Not available: volumes not disclosed" and draws nothing (constraint 9).

### 3.6 Link card, company level

In "One [unit] of [downstream product], split along the chain", add two selects: the upstream company and the
downstream company, each listing published companies only. Default to the first published company on each side,
and label the result with both tickers. When one side has no published company, keep today's "not yet available"
structure. Never average companies.

### 3.7 Homepage chain map (finance distance only)

On `/?distance=finance`, each stage box whose stage has companies on the slate shows a small "n models" label
(published count, or "planned" when none is published) and becomes a link to
`/finance/finance-in-action#<anchor from 3.1>`. The economy distance is unchanged. Keep the map's existing
keyboard order and accessible names; the link's accessible name says where it goes ("Geological extraction: 4
company models in Finance in Action").

## 4. Data

- `src/data/finance-in-action/links.json`: add `"downstreamLines": {}` to `coal-to-cement` (real values come
  later from the model work; leave it empty).
- `fixtures/links.SYNTHETIC.json`: fill `downstreamLines` for SCEM and XCEM with their fuel line ids, so 3.4–3.6
  are exercised in preview.
- If 3.5 needs a second synthetic link to show more than one upstream node, add one SYNTHETIC link (for example a
  synthetic energy band input) and say so.

## 5. Tests

At minimum, each with SYNTHETIC fixtures:

- link register: `downstreamLines` validates; an unknown ticker or line id is reported and ignored;
- company-level chain derivation (upstream, downstream, band) from the register;
- key-figure cards: each role resolves from `unitEconomics`; a missing role shows "Not in this model"; no
  literals (extend the existing literal guard if there is one);
- sankey: flow values equal the waterfall's per-unit values for the same period; the not-available state;
  hatching and text labels present;
- link card company selects: defaults, labels, no averaging;
- stage anchors: index ids and the homepage links use the same helper; the homepage economy distance renders
  unchanged (snapshot or DOM assertion);
- keyboard: the Full screen card traps and returns focus.

Raise `MIN_TESTS` in the same commit that adds tests.

## 6. Quality floor

Keyboard reach and visible focus on every control; touch targets 44px or more; text contrast 4.5:1 or more;
tabular figures in cards, grid, waterfall and sankey; layouts checked at 360, 768, 1024 and 1440px with no
horizontal page scroll (the grid and the charts scroll inside their own boxes). `prefers-reduced-motion`: no
animation added by this work.

## 7. Report

`docs/company-models/chain-view/report.md`, in Indonesian, with:

1. Start and end SHA, commit list.
2. Verbatim output of every CI command.
3. Screenshots with the preview flag on at 360, 768, 1024 and 1440px of the index (pills), a model page (rail,
   cards, model card), the sankey, Along the chain, the company-level link card, and the homepage finance
   distance; one of the not-available state; one with the flags as in production showing the live index.
4. Every deviation from this prompt and every choice you made yourself, with the reason; new tokens.
5. Open items for the owner, including anything in `PRD.md` §4 that blocked or bent the work.
