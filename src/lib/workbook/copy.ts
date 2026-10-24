/**
 * The words of the working paper viewer and its page section (PRD site sweep 2026-10, R4; site cleanup
 * 2026-10, A4, A11), in one place. British English.
 *
 * Each string says where it comes from: the PRD (quoted with its line), the owner's decisions (D8–D11), the
 * cleanup spec (docs/prd/site-cleanup-2026-10/03-DESIGN.md §1), or the repo, where the same words already
 * stand. OWNER-REPLACEABLE marks a draft the owner is expected to rewrite.
 */
export const WORKBOOK_COPY = {
  /** PRD R4.6: 'judul "Working paper: PT Dummy C and its subsidiaries, PSAK 338"'. */
  heading: 'Working paper: PT Dummy C and its subsidiaries, PSAK 338',
  /** 03-DESIGN §1, `lede`. */
  lede: 'The full PSAK 338 consolidation workbook, sheet by sheet.',
  /** 03-DESIGN §1, `disclaimer` (PRD A4: the one line kept from the Method section). */
  disclaimer: "Figures are dummy and do not represent any company's data.",

  // Full screen (PRD A6; 03-DESIGN §1–2).
  /** 03-DESIGN §1, `fullScreen`. */
  fullScreen: 'Full screen',
  /** 03-DESIGN §1, `exitFullScreen`: the exit control's name. */
  exitFullScreen: 'Exit full screen',
  /** 03-DESIGN §2: the exit control's visible label from `md` up. */
  exit: 'Exit',

  // Cell words for a screen reader: what the cell colours say, now that no legend explains them.
  /** A figure typed into the workbook rather than worked. */
  cellConstant: 'from the workbook',
  cellFormula: 'formula',
  /** D8: shown as an error cell, in an error colour. */
  cellError: 'error',
  /** D10, "merah = penyesuaian/perhatian reviewer". */
  cellRed: "red type: an adjustment or a reviewer's flag",
  /** D10, "biru = input manual". */
  cellBlue: 'blue type: a manual input',

  // Sheet tabs, name box and formula bar.
  /** As Finance in Action's sheet tabs are named (src/components/finance-in-action/viewer/model/ModelGrid.tsx). */
  sheets: 'Sheets',
  /** The tab strip's scroll control (03-DESIGN §1: a ▸ when more tabs exist). */
  moreSheets: 'Show more sheets',
  /** PRD R4.3: 'NameBox + FormulaBar'. */
  nameBox: 'Name box',
  /** PRD R4.3: 'NameBox + FormulaBar'. */
  formulaBar: 'Formula bar',
  /** PRD R4.4: 'tombol "Back" (riwayat navigasi)'. */
  back: 'Back',
  /** OWNER-REPLACEABLE: the Back button's longer name, with where it returns to. */
  backTo: (address: string) => `Back to ${address}`,
  /** OWNER-REPLACEABLE: the name box was given something that is not a cell of this workbook. */
  noSuchCell: 'No such cell in this workbook.',
  /** The grid's name, as Finance in Action names its sheets (`… sheet`). */
  sheetLabel: (sheet: string) => `${sheet} sheet`,
  /** OWNER-REPLACEABLE: what a screen reader hears on reaching the grid. */
  gridKeys: 'Arrow keys move; Ctrl+G goes to a cell.',
  /** OWNER-REPLACEABLE: the column or row header of one the workbook hides, for a screen reader. */
  hiddenHeader: (name: string) => `${name}, hidden in the workbook`,
  /** OWNER-REPLACEABLE: for a screen reader, in an empty cell's name. */
  empty: 'empty',

  // Loading and failure.
  /** OWNER-REPLACEABLE: the viewer and its JSON are on their way. */
  loading: 'Loading the workbook…',
  /** OWNER-REPLACEABLE: the viewer's code or the workbook JSON did not load. */
  failedTitle: 'The workbook viewer did not load',
  /** 03-DESIGN §1, `failedMessage`. */
  failedMessage: 'The workbook could not be loaded just now. Reload the page to try again.',
} as const;
