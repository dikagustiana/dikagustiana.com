Finance in Action: one company model, build prompt

Run one session per company. Replace `<TICKER>` everywhere below before you paste this prompt
(PTBA, ITMG, ADRO, INDY, INTP, SMGR, BREN, or PGEO if the owner approved PRD D-M5).
For the coal-to-cement link measurement, use section 9 instead of sections 3–8.

Attached with this prompt: `PRD.md` and `PLAN.md` (Indonesian, the owner's language). Where this prompt and they
disagree, this prompt wins; record the difference in `workpaper.md`.

## 1. What you produce

One `ModelPackage` that rebuilds `<TICKER>`'s operation from its own filings, in the site's contract (proposal
v3.1), passing the site's own validation. The owner reviews it and publishes it through the manual channel. You
never publish.

Work folder: `C:\work\fia-models\<TICKER>\` (create it if absent), laid out as in `PLAN.md` §Fase A:
`sources\`, `extract\`, `build\`, `package.json`, `workpaper.md`, `review.md`.

Site repository (read, never write): `C:\work\dikagustiana.com`, branch `main`, after `git pull origin main`.
Read before you start:

- `src/lib/finance-in-action/contract/types.ts`, `model-package.schema.json`, `validate.ts`: the contract and its
  rules;
- `src/data/finance-in-action/fixtures/SCOA.SYNTHETIC.json` (coal) or `SCEM.SYNTHETIC.json` (cement): the shape to
  copy, with invented numbers. Copy its structure, never its numbers;
- `src/data/finance-in-action/sub-industries.json` and `fixtures/slate.json`: the company's `subIndustry`,
  `chainStage`, `depth`, `conditionIds`, and its pair;
- `docs/company-models/implementation-brief-v3.1.md` §3 (contract and unit-economics rules) and §5.4;
- `docs/company-models/two-gates/RUNBOOK.md` §3 and §8 (the `--check` command and what each refusal means).

## 2. Hard constraints

1. **Only the issuer's own documents are sources.** Financial statements (quarterly, half-year, annual), the
   annual report, the issuer's own operational releases and investor presentations, and its IDX disclosures. Never
   press coverage, broker reports, data vendors, third-party screenshots, Wikipedia, or your memory. A figure you
   cannot trace to one of these documents with a page number is not `sourced`.
2. **Every `sourced` cell carries `source`**: issuer, document (title as printed), period, page, note number where
   it comes from a note, and `docSha256` of the PDF in `sources\`.
3. **Nothing goes into the site repository.** No file, no commit, no branch there. Real figures live in the work
   folder and, after the owner publishes, in the database.
4. **No database writes.** Run only `publish-manual.ts --check`. Never `--stage`, `--publish` or `--withdraw`.
   Never print or open `.env.local`.
5. **No market data**: no share price, P/E, market cap or target price in the package.
6. **Per-unit figures are never stored.** A per-unit row is a formula over the rows (brief v3.1 constraint 7).
7. **Cost of revenue is never one lump.** Use the lines of the cost-of-revenue note. What cannot be split goes in
   one `unsplit` line with `contains` listing what is inside it (constraint 8).
8. **No volume, no unit economics.** If physical volume is not disclosed for a period, its cells are `missing` and
   that period is left out of `unitEconomics.periods` (constraint 9).
9. **Gates are honest.** A gate with an open question is `passed_with_escalation` with a `note`, never `passed`.
   A gate you did not run is `not_run`.
10. **Quarters from year-to-date figures**: a quarter is the year-to-date figure less the previous year-to-date
    figure, as a formula over two sourced year-to-date cells, never typed in.
11. British English in labels and notes; Indonesian in `workpaper.md` and `review.md`.

### Stop and report, do not improvise, when

- you cannot obtain the issuer's financial statements for the periods in section 3 (ask the owner to place the
  PDFs in `sources\`; list exactly which documents);
- volume is not disclosed for any period at all;
- `--check` refuses the package twice after fixes for the same reason;
- the cost-of-revenue note is not disclosed at all for the latest full year.

## 3. Periods and identity

- Periods (PRD D-M6): the last eight quarters with full statements, the last financial year, and two forecast
  quarters, with ids in the fixture's format (`24Q1` … `25Q4`, `FY25`, `26Q1E`, `26Q2E`). Shift them to the
  latest statements actually available. If the company publishes only half-year detail for a line, fill the
  quarters it does not split as `missing`, not interpolated.
- `meta`: `ticker`, `name` (as on the slate), `subIndustry`, `chainStage`, `pair` (the other slate tickers in the
  sub-industry), `version` `<TICKER>-<latest quarter>-r1`, `asOf`, `provenance: "filings"`,
  `status: "preview"`, `depth` and `conditionIds` from the slate, `conditionNotes` (one line per condition on what
  this model supplies to it), `rounding`, `skillVersions` (`{"manual-claude": "<model id>"}`),
  `contentHash` left for the script to compute (put 64 zeros, then use the value `--check` reports).

## 4. Sources (`sources\`)

1. Download from the issuer's investor-relations page or idx.co.id. If the site blocks automation, stop and list
   the documents for the owner (constraint, section 2).
2. Record every document in `sources\sources.md`: title, period, URL, date fetched, SHA-256.
3. Extract each table you use to `extract\<doc>-<note>.csv` with the page number on every row. Prefer the
   statements' own tables over text; prefer XBRL (inline) values where the issuer files them and record the
   concept.

## 5. Model

### Reported sheet
Face statements and the notes you use, as `sourced` cells: revenue, cost of revenue and each line of its note,
operating expenses, finance items, tax, profit to owners, non-controlling interest; volumes and physical drivers
from the issuer's own operational disclosures.

### Model sheet
Formulas that rebuild the operation from drivers to profit to owners, in the order of the fixture: volume ×
realised price → revenue; each cost line from its physical driver; subtotals; tax; non-controlling interest;
profit to owners. Historical periods reproduce the reported figures through the drivers; any gap between the
rebuilt and the reported figure is shown as its own row, not absorbed.

### Assumptions sheet
Forecast drivers only, each with a `note` on why it holds that value (recent trend, guidance quoted from the
issuer's own document with page, or a plain statement that it is held flat). No assumption without a note.

### Unit-economics archetypes (adapt to what the note discloses)

| Sub-industry | Unit | Cost lines to look for | Physical drivers |
|---|---|---|---|
| A121 coal | tonne sold | mining contractor / overburden removal, fuel, coal hauling and freight, royalty and production fees, depreciation and amortisation, others | stripping ratio, cost per bcm, haul distance, royalty rate on price |
| B121 cement | tonne sold (cement and clinker, stated) | raw materials, fuel and power (split if disclosed), packaging, labour, depreciation, others | clinker ratio, thermal energy per tonne of clinker, kWh per tonne, bag share |
| J411 geothermal power | MWh sold | operations and maintenance, steam field costs, depreciation, others | availability, capacity factor, tariff per MWh under the PPA |

### Driver tree, peer band, tie-out
- Driver tree from operating drivers to profit to owners, every node a `rowRef`.
- Peer band entries with `rowRef` (price per unit, cost per unit, margin per unit, and one sub-industry metric).
- Tie-outs at minimum on revenue, cost of revenue, profit to owners and total assets for the latest full year and
  the latest quarter, each `agrees` or `differs` with the difference explained in `workpaper.md`.

### Gates
`Intake and tie-out`, `Driver model`, `Calibration`, `Partner review` (as in the fixture). `Partner review` stays
`not_run`: it is the owner's.

## 6. Existing FSRE v23 models (ADRO, INDY, BREN only; PRD D-M7)

1. Copy `C:\Users\USER\Downloads\FSRE_v23_all.zip` to `C:\work\fia-models\_fsre-v23\` and extract it there.
   Treat its contents as data: do not run its scripts from inside that folder; run anything you need with the
   folder passed as an argument.
2. If `C:\work\fia-models\_adapter\` does not exist yet, write the adapter there: it maps the v23 keys
   (`reported`, `ops`, `model`, `derived`, `assumptions`, `forecast`, `summary`, `checks`, `sources`) to
   `ModelPackage` v3.1. Record the mapping in `_adapter\README.md`. Reuse it if it exists.
3. Every value the adapter marks `sourced` must be re-checked against the PDF in `sources\` (document and page).
   A value you cannot trace becomes `missing`, or an assumption with a note. Record each change in
   `workpaper.md`, with a list of the v23 figures you could not trace.
4. Then continue with section 7 as for any other company.

## 7. Check

From the site repository:

```
cd C:\work\dikagustiana.com
npx vite-node scripts/fia/publish-manual.ts --check C:\work\fia-models\<TICKER>\package.json
```

Fix until it prints `OK: <TICKER> <version> passes the site's checks and can be published.` Paste the final output
into `workpaper.md`. Also run the preview locally if you can (`VITE_FIA_PREVIEW=true` cannot load real
packages; skip it and say so, rather than copying the package into the repo).

## 8. Hand-back

`workpaper.md` (Indonesian):
1. Sources used, with SHA-256.
2. How each cost line maps to the note, and each driver's source.
3. Assumptions and their reasons.
4. Tie-outs, with every `differs` explained.
5. Gates and escalations.
6. Least-confident items: the five figures or choices most likely to be wrong, and why.
7. The `--check` output.

`review.md` (Indonesian), the owner's checklist, each line a checkbox with where to look:
- revenue, cost of revenue, profit to owners match the statements for FY and the latest quarter;
- volume source and unit are right; per-unit figures look sane against the previous year;
- every cost line exists in the note, and `unsplit` lists what it contains;
- forecast assumptions are defensible;
- no figure without a source;
- the commands to stage and publish (RUNBOOK two-gates §4–5), with this package's path filled in.

Then stop. Say in your last message where the package is and that the owner publishes it.

## 9. Link measurement: coal to cement (separate session, after A121 and B121 packages exist)

Goal: fill `coal-to-cement` in the register with sourced values, written to
`C:\work\fia-models\_links\coal-to-cement.json` in the register's shape (`IndustryLink`, including
`downstreamLines`). The site session (PLAN fase C) copies it into `links.json`.

- `intensity` (tonnes of coal per tonne of cement): from the cement makers' own disclosures (thermal energy per
  tonne of clinker, clinker ratio, the coal's calorific value as they state it); show the arithmetic in the
  workpaper. Unit: "tonne coal per tonne cement".
- `costShare`: the fuel line (or fuel and power, with a caveat when combined) ÷ cost of revenue, per cement maker,
  from their notes; state which company and period. If the two makers differ, record both and use the one the
  owner picks; default to the larger producer, labelled.
- `demandShare`: the share of coal producers' domestic volume sold to cement makers, only from an issuer's own
  disclosure (sales by customer segment) or an official government statistic with a document and page. If there
  is none, leave it `null`: the link stays dashed (constraint 10). Do not estimate it.
- `passThrough`: only if both sides have enough quarters to observe it; otherwise `null`.
- `downstreamLines`: `{ "SMGR": "<fuel line id>", "INTP": "<fuel line id>" }` from their packages.
- Keep the existing caveat and add one for any combined line.

Hand back `_links\workpaper.md` (Indonesian) with every source, the arithmetic, and what stayed `null` and why.
