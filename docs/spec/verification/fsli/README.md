# FSLI viewer: verification evidence (Plan 1.8)

Measured on 11 October 2026 against the head of `claude/sharp-noether-a2fkj7` (the 1.6 commit
plus the fold-out fix in the same commit as this file).

## How the page was run

- Production bundle (`vite build`), served with `vite preview` on 127.0.0.1:4319.
- `VITE_SUPABASE_URL` pointed at the production project with its publishable (anon) key, so
  the page read what a reader reads: PHE FY2024, published by `fs_run_publish_gate()` at
  16:38:41 UTC that day.
- Chromium (Playwright's bundled build), axe-core 4.10.2, Lighthouse 12.2.1.
- Raw numbers: `fsli-evidence.json` in this folder.

## Screenshots

| File | What |
|---|---|
| `fsli-sofp-1440-first-screen.png` | 1440×900, statement of financial position, first screen |
| `fsli-sofp-1440-full.jpg` | 1440, statement of financial position, full page |
| `fsli-pl_oci-1440-first-screen.png` | 1440×900, profit or loss and OCI, first screen |
| `fsli-pl_oci-1440-full.jpg` | 1440, profit or loss and OCI, full page |
| `fsli-sofp-375-first-screen.png` | 375×812, statement of financial position, first screen |
| `fsli-sofp-375-full.jpg` | 375, statement of financial position, full page |
| `fsli-pl_oci-375-first-screen.png` | 375×812, profit or loss and OCI, first screen |
| `fsli-pl_oci-375-full.jpg` | 375, profit or loss and OCI, full page |
| `fsli-375-row-open.png` | 375, a row's English label, notes and page folded open |
| `fsli-line-item-1440.png` | 1440, `/accounting/fsli/trade-receivables-net`: the heading's two rows from `fs_line` |

## Checker output

`python3 scripts/fs_check.py data/fs/phe/fy2024/statements.json`: 175 rules, 175 passed, exit 0
(in CI since 1.4). Two of the 175 are `DECLARED` rows, the cash flow statement's printed
rounding (`data/fs/phe/fy2024/README.md`, "Checker result"). After the load, `fs_tieout()` re-ran
the 125 rules that read only stored rows and matched the checker on every one, description
included (`docs/db/verify/04_fs_publish_gate.sql`); 0 failed, and the period was published.

## Row counts

| Report page | Statement | Rows in `statements.json` | Rows read against the PDF | Rows on the page |
|---|---|---|---|---|
| 11 | SoFP | 33 | 5 headings + 28 with figures | |
| 12 | SoFP | 35 | 7 headings + 28 with figures | |
| 13 | SoFP | 15 | 5 headings + 10 with figures | |
| 11–13 | SoFP | 83 | | **83** at 1440 and 375 |
| 14 | P&L and OCI | 24 | 4 headings + 20 with figures | |
| 15 | P&L and OCI | 8 | 2 headings + 6 with figures | |
| 14–15 | P&L and OCI | 32 | | **32** at 1440 and 375 |

The PDF column is the extraction's own count (`data/fs/phe/fy2024/README.md`, "Extraction"):
the lines below each page's column heading that carry a 2024 figure, counted independently
of the extraction. `tests/unit/fsViewer.test.tsx` renders the committed `statements.json` and
checks every row of both statements: label ID and EN verbatim, notes verbatim, both figures as
printed, its page, nothing added.

## PRD §A8, item by item

| Acceptance item | Result | Artefact |
|---|---|---|
| Checker exits 0, golden table matches to the unit | 175/175, 40 `GOLDEN` rules among them | CI step; `data/fs/phe/fy2024/checks.json` |
| A one-unit error in any item fails and names the rule | Checker: `scripts/tests/test_fs_check.py`. Database: nine mutations in `04_fs_publish_gate.sql`, each failing exactly the rules it breaks | both run clean |
| Every row of SoFP p.11–13 and P&L/OCI p.14–15, labels and notes verbatim, no extra row | 83 and 32 rows | table above; `fsViewer.test.tsx` |
| Publish button disabled while the latest run has a failure | Disabled and says so; the server re-runs the rules regardless | `fsViewer.test.tsx` ("publishing"); `04_fs_publish_gate.sql` ("a failing gate") |
| `/accounting/fsli` redirects | → `/accounting/fsli/phe/fy2024` at both widths | `fsli-evidence.json` → `redirected_to`; `fsViewer.test.tsx` (route table) |
| Lighthouse accessibility ≥ 95 | **99** desktop, **99** mobile | `fsli-evidence.json` → `lighthouse` |
| Body text contrast ≥ 4.5:1, measured | Labels and figures rgb(33,42,54) on rgb(250,250,250): **13.88:1**. English labels, notes and the header lines rgb(98,112,132): **4.82:1**, the lowest on the page. axe `color-contrast`: pass | `fsli-evidence.json` → `contrast`, `axe_wcag` |

## Other checks

- **Sideways scroll:** none at 375 (`scrollWidth` 375 on both statements) or 1440.
- **Fonts:** Plus Jakarta Sans and Spectral only (`/fonts/plus-jakarta-sans-latin.woff2`,
  `/fonts/spectral-normal-{400,700}-latin.woff2`); 0 elements in a monospace face. Figures are
  set with `tabular-nums`; Plus Jakarta Sans carries the `tnum` feature (checked in the font
  file's GSUB table), so the digits line up.
- **axe, WCAG 2.0/2.1 A and AA:** 0 violations at 1440 and 375 (34 rules pass). One
  "incomplete" at 375, `aria-valid-attr-value` on the site header's mobile menu button: site
  chrome, as in the tracker's evidence. The first run here also flagged the rows' fold-out
  buttons, whose `aria-controls` named an element drawn only when open; the fold-out is now
  always in the document, `hidden` until opened.
- **Lighthouse's one failing audit**, `heading-order`: the site footer's `<h4>` headings after
  the page's `<h1>`. On every page; outside this PR.
- **Line-item pages:** 21 of the 24 show figures from their `fs_line` row, with a link to it in
  the statement. The other three (`trade-receivables-net-non-current`,
  `other-non-current-receivables`, `other-non-current-assets`) have no FS row with their label
  (discovery §19) and show none.

## The old figures (PRD §A1)

Searched for on the viewer's four tabs and all 24 line-item pages: 823,348; 801,429; 520,885;
28,830; 85,053; 94,887; 809,397; 275,812; 2,203,018; 3i.6; 3b,4dc. None of them comes from the
page's own figures any more: `fsli_pages`' figure columns are read nowhere, and the 1440
screenshots show the audited values.

**They do still appear in four published essays**, in the prose the essays were written around:

| Line-item page | Essay text | Audited |
|---|---|---|
| `trade-receivables-net` | trade receivables, net, 2,203,018 (2023: 2,063,070); related parties 823,348 (2023: 801,429); third parties 520,885 | The FS prints no such total. Related parties 2,626,183 (2023: 2,053,070); third parties 520,685 (2023: 715,327) |
| `due-from-government` | 85,053 (2023: 94,887), "a fall of 9,834 or 10.4 percent"; other receivables 28,830 | 623,448 (2023: 501,429), a rise; other receivables, related parties, 28,630 |
| `inventories-net` | 809,397, total assets 30,303,898 | 806,397; total assets 30,434,955 |
| `corporate-dividend-taxes-receivable-current` | 300,738 as corporate and dividend taxes receivable (2023: 275,812) | 300,738 is other taxes receivable, current (2023: 275,612); corporate and dividend taxes receivable, current, is 26,288 (2023: 12,503) |

The essays' arguments rest on those numbers (one essay's heading says the line "fell 10.4
percent"; the audited line rose), so correcting them is a rewrite of the author's analysis, not a
substitution. That is left to the author; nothing in the essays was changed in this PR.
