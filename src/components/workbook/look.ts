/**
 * How a working paper cell looks (PRD site sweep 2026-10, R4.5).
 *
 * A figure typed into the workbook is in the sourced colour, a worked figure in ink, as Finance in Action's
 * Sourced and Formula cells are. The workbook's own red and blue type (D10) wins over both; an error cell
 * (D8) has its own fill. The legend, the inspector and the precedent and dependent fills are gone (site
 * cleanup 2026-10, A1, A2, A9); the selected cell keeps its outline (SheetGrid).
 */
import type { WorkbookCell, WorkbookStyle } from '@/lib/workbook/types';

export type CellKind = 'constant' | 'formula' | 'error' | 'empty';

export function kindOf(cell: WorkbookCell | undefined): CellKind {
  if (!cell || cell.v === undefined) return cell?.f !== undefined ? 'formula' : 'empty';
  if (cell.t === 'e') return 'error';
  return cell.f !== undefined ? 'formula' : 'constant';
}

export const LOOK = {
  constant: 'text-fia-sourced',
  formula: 'text-foreground',
  error: 'bg-wb-error-bg text-wb-error-fg font-medium',
  red: 'text-wb-red',
  blue: 'text-wb-blue',
} as const;

/** A cell's text colour and fill: the error fill, else the workbook's red or blue, else typed or worked. */
export function lookOf(cell: WorkbookCell | undefined, style: WorkbookStyle | undefined): string {
  const kind = kindOf(cell);
  if (kind === 'error') return LOOK.error;
  if (style?.color) return LOOK[style.color];
  // Labels are typed too, but only a typed figure is an input; text stays in ink.
  if (kind === 'constant' && typeof cell?.v === 'number') return LOOK.constant;
  return LOOK.formula;
}

/** Excel's border line styles, drawn in ink: the rules under subtotals and totals. */
const LINES: Record<string, string> = {
  hair: '1px dotted',
  dotted: '1px dotted',
  dashed: '1px dashed',
  dashDot: '1px dashed',
  dashDotDot: '1px dashed',
  thin: '1px solid',
  medium: '2px solid',
  mediumDashed: '2px dashed',
  mediumDashDot: '2px dashed',
  mediumDashDotDot: '2px dashed',
  slantDashDot: '2px dashed',
  thick: '3px solid',
  double: '3px double',
};

export const borderCss = (line: string): string => `${LINES[line] ?? LINES.thin} hsl(var(--foreground))`;
