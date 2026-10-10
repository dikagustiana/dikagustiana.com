# Consolidation working paper: source files

The working paper on `/accounting/consolidated-reporting` (PRD site sweep 2026-10, R4) is built from the
files in this folder. Nothing here is shipped as code.

## `source/pt-dummy-psak-338.xlsx`

The owner's own dummy PSAK 338 consolidation workbook, "PT Dummy - C and its subsidiaries": 33 sheets,
15,485 formulas, every formula with Excel's cached value, no external links. Committed byte for byte as
the owner attached it on 10 October 2026, renamed from `DGI - PT Dummy and Its subsidiaries PSAK 338.xlsx`.

- sha256 `8fae6f0e71b6407b7ce2b5f77cd2069a051ab9bc5f75155bdfc5d8ad1323da5c`, 1,333,305 bytes.
- The figures are dummy. They are not any company's data and must not be read as such.
- Corrections to the workbook (its 49 error cells, its work notes) are made by the owner in Excel and
  committed as a new version of this file; the site never edits it (PRD R4.2, D8).

## `reference/Company_models__PTBA.html` — not committed

The PRD (Part 3, Phase E step 1) asks for the PTBA company-model page to be committed here as the visual
reference for the viewer (tokens, fonts, cell legend, formula bar, sheet tabs). It is not committed:
its DATA block holds PT Bukit Asam's reported figures transcribed from the FY2025 financial statements,
and PRD §1.6 keeps real issuer figures out of the repo. Part 1 wins over Part 3, so the file stays
outside the repo until the owner decides (commit it as is, commit a copy with the DATA block emptied, or
keep it out). The visual reference it describes is summarised in PRD §1.2.4.
