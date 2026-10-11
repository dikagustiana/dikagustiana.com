# PHE FY2024: the source statements

PT Pertamina Hulu Energi dan entitas anaknya, consolidated financial statements for the year
ended 31 December 2024, expressed in thousands of United States dollars. This folder holds the
audited statements (`source.pdf`), what was read from them (`statements.json`), and PRD §A6's
golden values (`golden.json`).

## The file

| | |
|---|---|
| `source.pdf` | 9 pages, 587,012 bytes, sha256 `12e1c9df3e0673010f4b938b6fb696a6d38a15dcf81fa5e443ed08fadc451969` |
| What it is | Pages 10–18 of the full audited report, extracted by Dika on 11 October 2026 (iLovePDF). The full report ("FS PHE 2024.pdf", 10,532,833 bytes, in Dika's Google Drive) is over the 10 MB limit of both the session upload and the Drive connector. |
| Page numbers | Excerpt page *n* is report page *n* + 9. Every `source_page` in `statements.json` is a **report** page, so it can be checked against the full report. |
| Text | The statement pages (report pp. 11–18) are native text, with no images. Report p. 10, the end of the auditor's report, is a scan with an OCR text layer and is not read for figures. |

## The report

| | | Read on |
|---|---|---|
| Auditor | KAP Purwantono, Sungkoro & Surja (EY), Public Accountant Registration No. AP.1726 | p. 10 |
| Report No. | 00489/2.1032/AU.1/02/1726-4/1/III/2025, dated 28 March 2025 | p. 10 |
| Opinion | Unmodified, as PRD §A5 states | not in this excerpt: the opinion paragraph is on the report's earlier pages |

## Page map

| Report page | Excerpt page | Content | Schedule |
|---|---|---|---|
| 10 | 1 | Independent auditor's report, last page (vii) | |
| 11–13 | 2–4 | Consolidated statement of financial position | Daftar 1/1–1/3 |
| 14–15 | 5–6 | Consolidated statement of profit or loss and other comprehensive income | Daftar 2/1–2/2 |
| 16 | 7 | Consolidated statement of changes in equity (printed in landscape) | Daftar 3 |
| 17 | 8 | Consolidated statement of cash flows | Daftar 4 |
| 18 | 9 | Notes, first page | Daftar 5/1 |

PRD §A6 placed the cash flow statement on pp. 17–18 and asked for that to be confirmed by
reading: it is one page, p. 17. Page 18 opens the notes.

## Extraction (Plan 1.4)

Read on 11 October 2026 by `scripts/fs_extract_phe_fy2024.py` (needs `pdfplumber`; not run in
CI). Every figure and every note reference is taken from the PDF's text layer by position:
the row's line, the notes column, the 2024 column, the 2023 column. Nothing numeric is typed.
What is typed is the structure the layout shows and the text does not carry (row type, indent,
the subtotal a row sums into, the `line_key` the rules use) and the labels, joined across their
printed lines. Each typed label is checked against the PDF: ignoring whitespace and dashes, it
must equal the text printed between the previous row and this one. `--check` re-reads the PDF
and fails if `statements.json` differs.

Rows read against rows printed:

| Report page | Statement | Headings | Rows with figures | Lines with a 2024 figure in the PDF |
|---|---|---|---|---|
| 11 | SoFP | 5 | 28 | 28 |
| 12 | SoFP | 7 | 28 | 28 |
| 13 | SoFP | 5 | 10 | 10 |
| 14 | P&L and OCI | 4 | 20 | 20 |
| 15 | P&L and OCI | 2 | 6 | 6 |
| 16 | SoCE | 13 rows × 10 columns = 130 cells: 1 blank, 69 dashes, 60 figures | | |
| 17 | Cash flows | 3 | 24 | 24 |

The last column counts, independently of the extraction, the lines below each page's column
heading that carry a figure in the 2024 column.

### Conventions

- **Labels** are verbatim, including the issuer's spelling ("penggunaanya" in one SoCE column
  heading, "Others Equity Component"). A label printed over several lines is joined with single
  spaces. Where the text layer runs two words together because the PDF has no space character
  between them ("byPertamina", "taxespayables"), the label is written as the page shows it, with
  the space.
- **Dashes.** The dash that marks a sub-item ("- Pihak berelasi") or a qualifier ("- bagian
  lancar") is written once, before the qualifier, in both languages. The English column prints
  it at the end of the line, mirrored ("Related parties -"). A sub-item's dash becomes its indent.
- **Figures** are as presented: a figure in parentheses is negative. A printed "-" is nil and
  stored as 0; a cell with nothing printed in it is stored as null (one SoCE cell: Dividend
  declared to NCI, 2023, Unappropriated).
- **Note references** are verbatim. The income tax row prints its references over two lines
  ("3s,43c" / "43d,43e"); they are joined with a comma.
- **Not stored**, as page furniture: the company name, statement title, period and unit lines,
  the column headings, the closing line "Catatan atas laporan keuangan konsolidasian terlampir
  … / The accompanying notes …", and the repeated heading "LIABILITAS DAN EKUITAS (lanjutan)"
  at the top of p. 13. The SoCE's two group headings ("Diatribusikan kepada pemilik entitas
  induk / Attributable to the owners of the parent", "Saldo laba / Retained earnings") are not
  stored either: the schema has no column groups, so each column carries its own heading.
- **Unlabelled totals.** P. 15 prints the totals of the two attribution blocks (3,121,035 and
  3,083,675) with no label of their own. They are stored as totals carrying the label of the
  heading they total, and marked `label_note` in the JSON.
- **Bold.** The FS prints some single-figure rows in bold (Revenues, income tax, non-controlling
  interest, opening cash). The viewer sets bold by row type, so these show as ordinary rows.
- **`fsli_slug`** links a row to its line-item page on the site. It is not read from the PDF.

## Checker result

`python3 scripts/fs_check.py data/fs/phe/fy2024/statements.json`: **173 rules, 171 passed,
2 failed** (exit 1). Every golden value matches to the unit (40 of 40). Both failures are one
difference printed in the audited cash flow statement itself, 2024 column:

| Row (p. 17) | Printed | Sum of its rows | Sum − printed |
|---|---|---|---|
| Kas neto yang diperoleh dari aktivitas operasi / Net cash generated from operating activities | 5,629,285 | 5,629,286 | +1 |
| (Penurunan)/kenaikan neto kas dan setara kas / Net (decrease)/increase in cash and cash equivalents | (2,384,682) | (2,384,683), from the printed subtotals | −1 |

The net decrease the FS prints, (2,384,682), is the one its operating items give (5,629,286 −
3,798,984 − 4,214,984). The rounding sits in the printed operating subtotal. Nothing has been
changed to make it foot. How the gate treats a difference the issuer printed is open with Dika.
