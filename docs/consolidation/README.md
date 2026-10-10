# Consolidation working paper: source files

The working paper on `/accounting/consolidated-reporting` (PRD site sweep 2026-10, R4) is built from the
files in this folder. Nothing here is shipped as code.

## `source/pt-dummy-psak-338.xlsx`

The owner's own dummy PSAK 338 consolidation workbook, "PT Dummy - C and its subsidiaries": 33 sheets,
15,485 formulas, every formula with Excel's cached value, no external links. Attached by the owner on
10 October 2026 as `DGI - PT Dummy and Its subsidiaries PSAK 338.xlsx` and committed as cleaned by
`npm run sanitize:workbook` (`scripts/consolidation/sanitize-workbook.ts`), on the owner's instruction of the
same day (docs/sweep-2026-10/DECISIONS.md D15–D16): the names of real companies are removed (26 cell values
deleted, 5 labels shortened, chosen by address so the names are not written into the repository) and so is
the file's metadata (author fields, the OneDrive path, every comment and its authors, 73,336 legacy defined
names; the four print ranges stay). No number, formula or cached value changed: a cell-by-cell comparison
with openpyxl over all 31,869 cells differed at exactly the 31 edited cells. The original stays with the
owner and is not in the repository or its pushed history.

- Original: sha256 `8fae6f0e71b6407b7ce2b5f77cd2069a051ab9bc5f75155bdfc5d8ad1323da5c`, 1,333,305 bytes.
- Committed: sha256 `cda94c8ede22a84a749d9d1f5ba493445ef44b1d73d4b3c4bdadc51c73d6c2db`, 601,127 bytes.
- A new version of the workbook needs its own review of names: the script refuses any input but the
  original above, so its cell list cannot be applied to the wrong cells.
- The figures are dummy. They are not any company's data and must not be read as such.
- Corrections to the workbook (its 49 error cells, its work notes) are made by the owner in Excel and
  committed as a new version of this file; the site never edits it (PRD R4.2, D8).

## The published workbook

`npm run build:workbook` (`scripts/consolidation/build-workbook.ts`) reads the xlsx with exceljs and writes
`public/consolidation/pt-dummy-psak-338.workbook.json`, the file the viewer fetches. Its shape is
`src/lib/workbook/types.ts`:

- per sheet: name, position in the source, dimension, column widths, row heights, hidden rows and columns,
  merged ranges and frozen panes;
- per cell: address, Excel's cached value (a date as ISO 8601, an error as its code), the formula without
  its `=` (a shared formula written out as the cell's own), number format, bold, alignment, top and bottom
  borders, and the font colour when it is red or blue (D10). Styles sit in one table the cells index into.

Sanitising (D9, R4.2): sheets that are hidden or hold no value are left out, which is exactly
`Face Report`, `WP Consol` and `Adjustment Consolaa`; the build fails if the rule ever drops anything
else. Defined names are dropped. No value is changed. The output is deterministic and records the
source's sha256, so a new workbook means: replace the xlsx, run the build, commit both.

## `build-report.md`

Written by the same build, for the owner's review: the sheets before and after sanitising, the counts
set against the PRD's profile (§1.2.4), the error cells (D8), every font colour with ten red and ten blue
examples (D10), the work notes (R4.2), and text naming a `PT` that is not a Dummy. The build reports;
it changes nothing in the workbook.

## `reference/Company_models__PTBA.html`

The PTBA company-model page, kept as the visual reference for the viewer (tokens, fonts, cell legend, formula
bar, sheet tabs, inspector). It is not shipped. Committed with its DATA block emptied, on the owner's
instruction of 10 October 2026 (docs/sweep-2026-10/DECISIONS.md D17): every reported figure (`rep`) and the
source register (`docs`) are gone, and the legend's sample figure, which came from PTBA's statements, reads
`1.234`. The keys that hold no figure (identity, units, periods, the fixed-asset and cost-line labels) stay,
so the page still draws its grid, with every input OPEN.
