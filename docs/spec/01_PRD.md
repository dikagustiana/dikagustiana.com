# PRD — FSLI Viewer (all four statements) + Green Transition Tracker rebuild

Owner: Dika Gustiana. Repo: dikagustiana.com (Vite + React 18 + TS + Tailwind + shadcn/ui + Supabase + Vercel).
Status: approved for implementation 2026-10-11. Nothing ships to production without Dika's review of the preview deployment.

## Decisions already made (do not reopen)

| # | Decision |
|---|---|
| D1 | Schema is built for all four statements (SoFP, P&L/OCI, SoCE, Cash Flow). UI ships SoFP + P&L/OCI first; SoCE and CF tabs render "not yet loaded" from the same component. |
| D2 | Existing PHE balance-sheet rows in Supabase are **discarded and re-extracted** through the new pipeline. They contain wrong figures (see §4). Do not patch them row by row. |
| D3 | YoY delta and common-size columns are **out of scope** for this release. Schema must not block them later. |
| D4 | `company` is a first-class dimension. Routes are `/accounting/fsli/:company/:period`, e.g. `/accounting/fsli/phe/fy2024`. The old `/accounting/fsli` redirects to the PHE FY2024 page. |
| D5 | Tracker is folded into the green-transition essay series as a per-sector data appendix. It stops being a standalone "quarterly readings" product. Route stays `/green-transition/tracker` so inbound links survive. |
| D6 | Tracker Q1 and Q2 2025 issues are **rewritten with primary sources**. A claim with no primary source is deleted, not softened. Q3 2025 onward is not written in this release. |
| D7 | Site theme, nav, fonts (serif headings / sans body) are refined, not redesigned. Monospace label styling is removed from the Tracker. |

---

## Part A — FSLI Viewer

### A1. Problem

The current FSLI page shows only the asset side of one balance sheet, and the figures on it do not match the audited statements they claim to reproduce. Verified against PT Pertamina Hulu Energi FY2024 consolidated FS (EY report 00489/2.1032/AU.1/02/1726-4/1/III/2025, statement pages 11–16 of the PDF):

| Row shown on site | Site value (2024 / 2023) | Audited (2024 / 2023) |
|---|---|---|
| Trade receivables – related parties | 823,348 / 801,429 | 2,626,183 / 2,053,070 |
| Trade receivables – third parties | 520,885 / 715,327 | 520,685 / 715,327 |
| Other receivables – related (shown as "net") | 28,830 / 28,217 | 28,630 / 28,217 |
| Due from the Government | 85,053 / 94,887 | 623,448 / 501,429 |
| Inventories, net | 809,397 / 658,712 | 806,397 / 658,712 |
| "Corporate and dividend taxes receivable" | 300,738 / 275,812 | That figure is *Other taxes receivable – current*: 300,738 / 275,612 |
| "Trade receivables, net 2,203,018" | exists on site | does not exist in the FS |
| Note refs | "3i.6", "3b,4dc" | "3f,6", "3h,8,44c" |

None of this would have survived a footing check: the displayed rows do not sum to the audited Total Current Assets of 8,036,328. The page has no such check.

### A2. Goal

A page where every figure is traceable to a page of an audited PDF and is arithmetically proven against the statement's own subtotals before it can be published. Extraction is done by Claude from the PDF; the checker, not the extractor, is the gate.

### A3. Users

Dika (author, reviewer); senior finance readers of the site; scholarship/admissions panels assessing rigour. The second and third groups must be able to see *that* the figures tie, not just the figures.

### A4. Scope

**In**
- Supabase schema for four statements, multi-company, multi-period (§A5).
- Extraction + validation pipeline runnable from Claude Code (§A6).
- FSLI page: tabs for four statements, SoFP and P&L/OCI populated for PHE FY2024 (with FY2023 comparatives as shown in the FS).
- Tie-out badge on the page that reads from stored check results.
- Admin: draft → published flow; publish button disabled while any check fails.

**Out**
- YoY / common-size (D3). Note-level drill-down to the 240 pages of notes. Any company other than PHE in this release (schema must support it; data is not loaded).

### A5. Data model

One line table for the three "vertical" statements, one cell table for SoCE.

```sql
-- companies
create table fs_company (
  id text primary key,                -- 'phe'
  legal_name text not null,           -- 'PT Pertamina Hulu Energi dan entitas anaknya'
  short_name text not null,           -- 'PHE'
  created_at timestamptz default now()
);

-- one audited report = one period
create table fs_period (
  id uuid primary key default gen_random_uuid(),
  company_id text references fs_company(id),
  period_key text not null,           -- 'fy2024'
  period_end date not null,           -- 2024-12-31
  comparative_end date not null,      -- 2023-12-31
  currency text not null,             -- 'USD'
  unit text not null,                 -- 'thousands'
  auditor text,                       -- 'KAP Purwantono, Sungkoro & Surja (EY)'
  auditor_report_no text,
  auditor_opinion text,               -- 'unmodified'
  source_file text not null,          -- storage path of the PDF
  status text not null default 'draft' check (status in ('draft','published')),
  unique (company_id, period_key)
);

-- vertical statements: sofp, pl_oci, cf
create table fs_line (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references fs_period(id) on delete cascade,
  statement text not null check (statement in ('sofp','pl_oci','cf')),
  parent_id uuid references fs_line(id),
  sort_order int not null,
  line_type text not null check (line_type in ('header','item','subtotal','total')),
  indent smallint not null default 0,
  label_id text not null,             -- Indonesian, verbatim from FS
  label_en text not null,             -- English, verbatim from FS
  notes_ref text,                     -- '3h,8,44c' verbatim
  value_cy numeric,                   -- current year, sign as presented (negatives are negatives)
  value_py numeric,                   -- prior year
  computed_cy numeric,                -- subtotal/total only: sum of children
  computed_py numeric,
  source_page int not null,           -- PDF page the figure was read from
  unique (period_id, statement, sort_order)
);

-- statement of changes in equity is a matrix
create table fs_soce_cell (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references fs_period(id) on delete cascade,
  row_key text not null,              -- 'balance_2022','dividend','dividend_nci','appropriation','oci','tci','balance_2023',...
  row_label_id text not null,
  row_label_en text not null,
  row_order int not null,
  col_key text not null,              -- 'share_capital','appropriated','unappropriated','apic','oci','other_equity','merging','total_parent','nci','total'
  col_label_id text not null,
  col_label_en text not null,
  col_order int not null,
  value numeric,
  source_page int not null,
  unique (period_id, row_key, col_key)
);

-- checker results, one row per rule per run
create table fs_check (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references fs_period(id) on delete cascade,
  run_at timestamptz default now(),
  rule_id text not null,              -- 'SOFP-FOOT-TCA', 'XS-PL-SOCE-PROFIT', ...
  statement text,
  description text not null,
  expected numeric,
  actual numeric,
  diff numeric,
  passed boolean not null
);
```

Rules that follow from the model:
- Values are stored **as presented**, including sign and classification. PHE books G&A and "expense from other operations" inside Cost of Revenue (upstream-oil-and-gas format). That is how it is stored and displayed. No reclassification into a standard template.
- `computed_*` is populated only on `subtotal`/`total` rows and always equals the sum of direct children with `line_type in ('item','subtotal')`. `value_*` on those rows is what the FS prints. The two are stored separately so the diff is visible, not silently reconciled.
- Labels are verbatim. Note refs are verbatim. If the FS prints "3h,8,44c" the row stores "3h,8,44c".

### A6. Extraction and validation pipeline

Runs from Claude Code against a PDF in the repo (`data/fs/<company>/<period>/source.pdf`).

1. **Locate** the primary statements (for PHE FY2024: PDF p.11–13 SoFP, p.14–15 P&L/OCI, p.16 SoCE, p.17–18 CF — confirm p.17–18 by reading).
2. **Extract** to `data/fs/<company>/<period>/statements.json` matching the schema above, one object per `fs_line` / `fs_soce_cell`, with `source_page` on every record.
3. **Validate** with `scripts/fs_check.py` (stdlib only). Rules:

   | Rule | Check |
   |---|---|
   | FOOT-* | every subtotal/total = sum of its children, both years |
   | SOFP-BAL | Total assets = Total liabilities + Total equity, both years |
   | SOFP-EQ | Equity to parent + NCI = Total equity |
   | PL-GP | Revenue − Total costs of revenue = Gross profit |
   | PL-PBT | Gross profit + items below GP = Profit before tax |
   | PL-NI | PBT − Tax = Profit for the year |
   | PL-TCI | Profit + OCI items = Total comprehensive income |
   | PL-ATTR | Parent + NCI = Profit; Parent + NCI = TCI |
   | XS-SOCE-PROFIT | SoCE "total comprehensive income" row (parent column) = P&L TCI attributable to parent |
   | XS-SOCE-BAL | SoCE closing balance (total) = SoFP Total equity; closing NCI = SoFP NCI |
   | XS-CF-CASH | CF closing cash = SoFP cash and cash equivalents (only when CF is loaded) |
   | SIGN | no `item` under a cost/expense header carries a positive sign unless the FS prints it positive (e.g. finance income) |
   | LABEL | every line has non-empty label_id and label_en |

   Exit code non-zero on any failure. Output is a table of rule / expected / actual / diff.
4. **Load** to Supabase as `status='draft'` only if the checker exits 0. Checker results are written to `fs_check` either way.
5. Dika reviews the preview deployment. Publish flips `status`. The publish action re-runs the checker server-side (edge function or RPC) and refuses on failure.

**Golden values for PHE FY2024** (the checker's fixture test must reproduce these; USD thousands, 2024 / 2023):

| | 2024 | 2023 |
|---|---|---|
| Total current assets | 8,036,328 | 9,879,695 |
| Total non-current assets | 22,398,627 | 21,009,221 |
| Total assets | 30,434,955 | 30,888,916 |
| Total current liabilities | 6,158,999 | 6,017,916 |
| Total non-current liabilities | 9,168,604 | 10,692,445 |
| Total liabilities | 15,327,603 | 16,710,361 |
| Equity attributable to parent | 14,433,117 | 13,534,126 |
| NCI | 674,235 | 644,429 |
| Total equity | 15,107,352 | 14,178,555 |
| Revenues | 14,330,340 | 14,568,384 |
| Total costs of revenue | (9,330,714) | (8,917,865) |
| Gross profit | 4,999,626 | 5,650,519 |
| Profit before tax | 4,892,576 | 4,492,029 |
| Income tax expense, net | (1,771,541) | (1,766,491) |
| Profit for the year | 3,121,035 | 2,725,538 |
| Total comprehensive income | 3,083,675 | 2,726,914 |
| Profit attributable to parent / NCI | 3,001,475 / 119,560 | 2,599,686 / 125,852 |
| TCI attributable to parent / NCI | 2,972,602 / 111,073 | 2,603,070 / 123,844 |

Everything else is read from the PDF, not from this document.

### A7. Page design

Route `/accounting/fsli/:company/:period`.

**Header**: company legal name (ID / EN), statement title, period, "Expressed in thousands of USD unless otherwise stated", auditor and opinion in one line. One search box, as now.

**Tabs**: Posisi Keuangan · Laba Rugi & OCI · Perubahan Ekuitas · Arus Kas. Tabs with no data render the same shell with a one-line empty state: "Not yet loaded from the FY2024 report."

**Table** (vertical statements):
- Columns: Label (ID on first line, EN in smaller muted text on second line) · Notes · 31 Dec 2024 · 31 Dec 2023.
- Drop the right-hand English column that exists today; it forces the eye to travel 900px per row.
- Negatives in parentheses, tabular figures, right-aligned. Headers and totals in bold with a top rule; totals with a double rule, as the FS prints them.
- Sticky column header on scroll. Indent from `indent`.
- Row hover shows `source_page` as "p.11" at the far right.

**SoCE**: rendered as the matrix it is, horizontally scrollable on narrow screens, with first column sticky.

**Tie-out badge** under the header, driven by `fs_check` for the latest run: "✓ Ties to audited FS — 14 checks passed · p.11–15" or "✗ 2 checks failing" (draft only; a published period can never show ✗ because publish is blocked).

**Company picker**: a small select in the header listing `fs_company`. Single entry for now.

**Mobile**: table collapses to label + CY + PY; notes and EN label fold under a tap. No horizontal scroll on the vertical statements at 375px.

### A8. Acceptance

- `scripts/fs_check.py data/fs/phe/fy2024/statements.json` exits 0 and the golden table above matches to the unit.
- Introducing a deliberate 1-unit error into any item makes the checker exit non-zero and names the failing rule.
- Published page shows every row of SoFP p.11–13 and P&L/OCI p.14–15, labels and note refs verbatim, no row the FS does not have.
- Publish button is disabled while `fs_check` has any `passed=false` for the latest run.
- Old URL `/accounting/fsli` redirects.
- Lighthouse accessibility ≥ 95 on the page; body text contrast ≥ 4.5:1 measured.

---

## Part B — Green Transition Tracker

### B1. Problem

The page reads as machine-written. Audit findings (slop-filter, AFTER mode):

**Content**
1. Zero sources. "ESDM's revised pricing framework", "PLN issued a partial procurement signal", "OJK's sustainable finance taxonomy continued in draft" — no regulation number, date, or link anywhere. Violates the site's own Verification Register.
2. The page opens with an apology. "Paused" stated four times before any finding: intro ("and paused there"), label "PAUSED ARCHIVE", paragraph "This archive is paused, not current…", footer "No new quarter was added."
3. Contradictory dates: "Last substantive update 14 September 2026" against coverage ending June 2025.
4. Deliberately vague claim: "at least one advancing while at least one regressed" when the next paragraph names geothermal and solar.
5. W-02 reversals: "That is a statement about sector selection inside this asset class — not about whether to hold it." / "This archive is paused, not current."
6. W-04 manufactured parallelism in intro: "policy architecture, capital positioning, institutional incentive shifts, and execution friction" — none reused below.
7. W-20 titles are moods, not findings: "Stalling", "Fragmenting".
8. W-07 load-bearing-nothing phrases: "execution friction", "institutional ambiguity", "procedurally incomplete", "policy architecture".
9. Changed / Held / Reversed taxonomy is incoherent: "Reversed" column contains good news (geothermal momentum returned).

**Interface**
10. U-18: three typefaces — serif headings, sans body, monospace small-caps labels. The monospace labels are the strongest AI tell on the page.
11. Boxes on everything: three bordered cards stacked, containing plain text that needs no container.
12. Scale: ~490px content column on a 2000px viewport, ~11px light-grey body text; Changed/Held/Reversed columns ~130px each, 4–5 words per line. Contrast likely below 4.5:1 (U-19) — measure.
13. Order inverted: archive status → issue summary → what changed. The finding is below the fold.

### B2. Goal

A per-sector register of what Indonesian energy-transition policy actually did in H1 2025, every row sourced to a primary document, serving as the data appendix to the "current condition" essay series (opening essay: "Learn from the UK").

### B3. Scope

**In**
- Rewrite of Q1 2025 and Q2 2025 content as per-sector entries with sources.
- Page restructure and restyle within the existing theme.
- Supabase content model for tracker entries (if content currently lives in code/markdown, migrate to the same place the essays live — follow whatever the essay pipeline uses).
- Redirect-safe: `/green-transition/tracker` stays.

**Out**
- Writing Q3 2025 onward. Changing the five-tab Green Transition sub-nav.

### B4. Content model

```
tracker_entry
  id, quarter ('2025Q1','2025Q2'), sector (enum: geothermal, solar, pln_procurement, jetp, ojk_taxonomy, danantara, other),
  status (enum: advanced, unchanged, regressed, mixed),
  finding text          -- one sentence, names the instrument and the date
  detail text           -- 2–4 sentences, what the document says and what it does not
  sources jsonb         -- [{title, issuer, doc_no, date, url, accessed}] — at least one, primary only
  verification text     -- 'verified' | 'unverifiable' ; unverifiable entries are never published
  published boolean
```

Primary source means: the regulation, decree, circular, RUPTL, press release, or company disclosure itself — not a news article summarising it. A news article may be cited *in addition* for date-of-event, never alone.

### B5. Page design

Order, top to bottom:

1. **Title** "Indonesia Green Transition Tracker" (serif, as now) and one-line standfirst that states the H1 2025 finding with sector names, e.g. the direction of: *Geothermal pricing moved (ESDM Permen No. __/2025, [date]); solar procurement stalled on TKDN; JETP disbursement did not start.* Exact wording comes from what the sources support.
2. **Status line**, one sentence, muted: "Covers January–June 2025. Not updated since. Continued in the current-condition essay series →" with a link to the series index. This is the only mention of the pause.
3. **Sector register** — one table, full content width (max ~880px), rows = sectors, columns: Sector · Q1 2025 · Q2 2025 · Source(s). Each cell is the one-sentence `finding`; status shown as a text label (advanced / unchanged / regressed), not a colour dot alone. Clicking a row expands `detail`.
4. **Issues** — Q2 then Q1, each as a short essay section with a finding-first title (W-20) replacing "Fragmenting" / "Stalling". Body text at the site's standard essay size, not 11px.
5. **Sources** — consolidated list, numbered, matching inline [n] references in the issues.

Typography: serif headings, sans body, nothing else. No monospace. No bordered cards; section breaks are a single hairline rule. Body text ≥ 16px at desktop, contrast measured ≥ 4.5:1. Table ≥ 44px row height.

### B6. Acceptance

- Every published `tracker_entry` has ≥ 1 source with `url` and `doc_no` or `date`; `verification='verified'`.
- No published entry text contains: "not just", "isn't about", "execution friction", "institutional ambiguity", "policy architecture", "paused" (the status line is the exception, once).
- "Paused"/"archive" appears at most once on the page.
- Only two font families loaded on the route.
- Body text contrast ≥ 4.5:1, checked with axe or equivalent, reported in the PR.
- Lighthouse accessibility ≥ 95.
- Dika signs off on every rewritten entry before `published=true`. Entries Claude cannot source are delivered as a separate "unverifiable — proposed for deletion" list in the PR, not silently dropped and not silently kept.

---

## Non-functional

- All schema changes as Supabase migrations in the repo, reversible.
- No new runtime dependencies for the checker (Python stdlib).
- Preview deployment on Vercel per PR; production deploy only after Dika's approval.
- Existing Verification Register conventions apply to both parts.
