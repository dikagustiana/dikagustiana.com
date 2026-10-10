/**
 * The words of the working paper viewer and its page section (PRD site sweep 2026-10, R4), in one place.
 * British English.
 *
 * Each string says where it comes from: the PRD (quoted with its line), the owner's decisions (D8–D11), or
 * the repo, where the same words already stand. OWNER-REPLACEABLE marks a draft the owner is expected to
 * rewrite; the PRD's default is kept where it gives one. Nothing here is the owner's own thesis.
 */
import { NUMBER_CONVENTION } from '@/lib/finance-in-action/format';

export const WORKBOOK_COPY = {
  /** PRD R4.6: 'judul "Working paper: PT Dummy C and its subsidiaries, PSAK 338"'. */
  heading: 'Working paper: PT Dummy C and its subsidiaries, PSAK 338',
  /**
   * OWNER-REPLACEABLE: PRD R4.6, 'lede satu kalimat milik Dika (OWNER-REPLACEABLE, default: "The full
   * consolidation workbook, sheet by sheet. Click a cell to see its formula and follow where it comes from.")'.
   */
  lede: 'The full consolidation workbook, sheet by sheet. Click a cell to see its formula and follow where it comes from.',

  // Toolbar (PRD R4.3: 'Toolbar (Full screen, Download sesuai D11, "Copy cell address")').
  /** PRD R4.3, verbatim. */
  fullScreen: 'Full screen',
  /** As Finance in Action's model page words it (src/lib/finance-in-action/copy.ts). */
  download: 'Download .xlsx',
  /** D11: the file a visitor saves. */
  downloadName: 'pt-dummy-psak-338-working-paper.xlsx',
  /** PRD R4.3, verbatim. */
  copyAddress: 'Copy cell address',
  /** As the share button words it (src/components/editorial/ShareButton.tsx). */
  copied: 'Copied',
  /** OWNER-REPLACEABLE: the browser refused the clipboard. */
  copyFailed: 'This browser did not allow copying.',

  // Legend (PRD R4.5: 'legenda sel: from the workbook (konstanta), formula, error, dan dua warna font sesuai D10').
  /** OWNER-REPLACEABLE: R4.5's "from the workbook", a figure typed into the workbook rather than worked. */
  legendConstant: 'from the workbook',
  /** OWNER-REPLACEABLE: R4.5's "formula". */
  legendFormula: 'formula',
  /** OWNER-REPLACEABLE: R4.5's "error" (D8: shown as an error cell, in an error colour). */
  legendError: 'error',
  /** OWNER-REPLACEABLE: D10, "merah = penyesuaian/perhatian reviewer". */
  legendRed: "red type: an adjustment or a reviewer's flag",
  /** OWNER-REPLACEABLE: D10, "biru = input manual". */
  legendBlue: 'blue type: a manual input',
  /** OWNER-REPLACEABLE: the viewer shows the rows and columns the workbook hides, their headers hatched. */
  legendHidden: 'hidden in the workbook',
  /** As Finance in Action's legend is named (src/components/finance-in-action/viewer/model/ModelGrid.tsx). */
  legendLabel: 'Cell legend',

  // Sheet tabs, name box and formula bar.
  /** As Finance in Action's sheet tabs are named (src/components/finance-in-action/viewer/model/ModelGrid.tsx). */
  sheets: 'Sheets',
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
  gridKeys: 'Arrow keys move; Enter opens the inspector; Ctrl+G goes to a cell.',
  /** OWNER-REPLACEABLE: the column or row header of one the workbook hides, for a screen reader. */
  hiddenHeader: (name: string) => `${name}, hidden in the workbook`,

  // Inspector (PRD R4.3: 'alamat, nilai terformat, nilai mentah, formula, daftar precedent …, status error').
  /** As Finance in Action names its panel (src/components/finance-in-action/viewer/model/Inspector.tsx). */
  inspector: 'Inspector',
  /** As Finance in Action's inspector words its close button (same file). */
  closeInspector: 'Close the inspector',
  /** OWNER-REPLACEABLE: the button that opens the inspector on a narrow screen. */
  openInspector: 'Open the inspector',
  /** PRD R4.3: 'nilai terformat' (the formatted value). */
  value: 'Value',
  /** PRD R4.3: 'nilai mentah' (the raw value). */
  rawValue: 'Raw value',
  /** PRD R4.3: 'formula'. */
  formula: 'Formula',
  /** PRD R4.3: 'daftar precedent' (the list of precedents). */
  precedents: 'Precedents',
  /** OWNER-REPLACEABLE: PRD R4.4, 'Dependents (sel yang memakai sel ini) ditampilkan di inspector untuk sheet yang sama'. */
  dependents: 'Dependents on this sheet',
  /** OWNER-REPLACEABLE: a cell with nothing in it. */
  emptyCell: 'Empty in the workbook.',
  /** OWNER-REPLACEABLE: a figure or a label typed into the workbook. */
  typedValue: 'Typed into the workbook, not worked from other cells.',
  /** OWNER-REPLACEABLE: D8, an error cell. */
  errorNote: "Excel could not work this cell out; the error is the workbook's own and is shown as Excel shows it.",
  /** OWNER-REPLACEABLE: a precedent on a sheet D9 leaves out. */
  notPublished: 'not published: hidden or empty in the workbook',
  /** OWNER-REPLACEABLE: a precedent on a sheet the workbook does not have. */
  noSuchSheet: 'no such sheet in the workbook',
  /** OWNER-REPLACEABLE: a formula that reads no cell. */
  noPrecedents: 'None: the formula reads no cell.',
  /** OWNER-REPLACEABLE: no formula on the sheet reads the cell. */
  noDependents: 'No formula on this sheet reads this cell.',
  /** OWNER-REPLACEABLE: a list cut short. */
  more: (n: number) => `and ${n} more`,
  /** OWNER-REPLACEABLE: a jump button's name for a screen reader. */
  goTo: (address: string) => `Go to ${address}`,
  /** OWNER-REPLACEABLE: D10, "merah = penyesuaian/perhatian reviewer", said of a red cell in the inspector. */
  fontRed: "Red type in the workbook: an adjustment or a reviewer's flag.",
  /** OWNER-REPLACEABLE: D10, "biru = input manual", said of a blue cell in the inspector. */
  fontBlue: 'Blue type in the workbook: a manual input.',
  /** OWNER-REPLACEABLE: for a screen reader, in an empty cell's name. */
  empty: 'empty',

  // Loading and failure (R4.7: 'Halaman tanpa viewer (JS gagal) tetap menampilkan Method dan tautan unduh').
  /** OWNER-REPLACEABLE: the viewer and its JSON are on their way. */
  loading: 'Loading the workbook…',
  /** OWNER-REPLACEABLE: the viewer's code or the workbook JSON did not load. */
  failedTitle: 'The workbook viewer did not load',
  /** OWNER-REPLACEABLE: R4.7, what stays when the viewer fails: the Method panel and the download. */
  failedMessage: 'The method below and the .xlsx download do not depend on it.',

  // Method panel (PRD R4.6: 'panel Method (sumber …; tahun; sheet yang dikecualikan; 49 sel error sesuai D8; nilai cache)').
  /** PRD R4.6: 'panel Method'. */
  method: 'Method',
  /**
   * OWNER-REPLACEABLE: PRD R4.6, 'sumber: workbook dummy buatan Dika' (the source: a dummy workbook Dika
   * made), with the group named as the heading names it.
   */
  methodSource:
    "Source: Dika Gustiana's dummy PSAK 338 consolidation workbook for PT Dummy C and its subsidiaries. Its figures are dummy: they are not any company's data.",
  /** OWNER-REPLACEABLE: the years its statements cover. */
  methodYears: 'Years: 2022, 2023 and 2024.',
  /** PRD R4.3, verbatim. */
  methodCached: "Figures are Excel's own calculated values; the viewer does not recalculate.",
  /** OWNER-REPLACEABLE: D9, the sheets left out, listed after it. */
  methodExcluded: 'Sheets left out because the workbook hides them or they hold nothing:',
  /** D9: 'sheet hidden dan kosong' (hidden and empty sheets), the reason after each sheet's name. */
  excludedReason: { hidden: 'hidden', empty: 'empty' } as const,
  /** OWNER-REPLACEABLE: D8, the error cells, listed after it by sheet. */
  methodErrors: (n: number) => `${n} cells show an Excel error, kept as the workbook has them:`,
  /** OWNER-REPLACEABLE: the hidden rows and columns the viewer shows. */
  methodHidden: 'Rows and columns the workbook hides are shown, with their headers hatched.',
  /** The site's number convention, as Finance in Action states it. */
  methodNumbers: NUMBER_CONVENTION,
} as const;
