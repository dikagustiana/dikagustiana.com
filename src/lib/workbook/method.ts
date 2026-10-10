/**
 * What the Method panel lists (PRD site sweep 2026-10, R4.6): the sheets D9 leaves out and the error cells
 * D8 keeps. Written here rather than read from the workbook JSON, because the panel must stand when the
 * viewer or its JSON fails to load (R4.7); tests/unit/workbookViewer.test.tsx holds both lists to the JSON.
 * A new workbook that changes either fails that test until these are rewritten from its build report
 * (docs/consolidation/build-report.md).
 */
import XLSX_URL from '../../../docs/consolidation/source/pt-dummy-psak-338.xlsx?url';

/**
 * The published workbook, fetched only when the section nears the viewport and never part of a bundle:
 * public/ serves it at this path (Vite does not let a module import a file from public/).
 */
export const WORKBOOK_JSON_URL = '/consolidation/pt-dummy-psak-338.workbook.json';

/**
 * The owner's xlsx itself (D11), emitted by the build as a hashed asset from its one committed copy in
 * docs/consolidation/source/; the link saves it under D11's name.
 */
export const WORKBOOK_XLSX_URL = XLSX_URL;

export const EXCLUDED_SHEETS: readonly { name: string; reason: 'hidden' | 'empty' }[] = [
  { name: 'Face Report', reason: 'empty' },
  { name: 'WP Consol', reason: 'empty' },
  { name: 'Adjustment Consolaa', reason: 'hidden' },
];

/** D8's 49 error cells, sheet by sheet in workbook order, each sheet's cells row by row. */
export const ERROR_CELLS: readonly { sheet: string; code: string; cells: readonly string[] }[] = [
  {
    sheet: 'CF 23 Restated',
    code: '#REF!',
    cells: [
      'O4', 'AF4', 'AG4', 'O8', 'AF8', 'AG8', 'BE8', 'O10', 'AF10', 'AG10', 'G38', 'H38', 'O38', 'BE38', 'G41', 'H41', 'AF41', 'BE41',
      'G43', 'H43', 'AG43', 'BE43', 'G45', 'H45', 'G53', 'H53', 'G86', 'H86', 'G94', 'H94', 'G97', 'H97', 'O97', 'AF97', 'AG97',
    ],
  },
  { sheet: 'BS RP Disclosure 2024', code: '#REF!', cells: ['T218', 'V218', 'AC218', 'AE218', 'T219', 'V219', 'AC219', 'AE219'] },
  { sheet: 'Detail Elimination BS', code: '#VALUE!', cells: ['AO201', 'AO202', 'AO204', 'AO205', 'AO206', 'AO208'] },
];
