/**
 * How a working paper cell looks (PRD site sweep 2026-10, R4.5): one place for the grid, the legend and
 * the inspector, so the three never disagree.
 *
 * The cell legend follows Finance in Action's (R4.9): a figure typed into the workbook is in the sourced
 * colour, a worked figure in ink, as Finance in Action's Sourced and Formula cells are. The workbook's own
 * red and blue type (D10) wins over both; an error cell (D8) has its own fill. Precedents and dependents
 * take Finance in Action's lens fills, ▲ and ▼.
 */
import { LENS_ROLES, byId } from '@/lib/finance-in-action/constants';
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
  precedent: byId(LENS_ROLES, 'precedent')!,
  /** The reference's dashed outline round a precedent, in the site's accent, over the lens fill. */
  precedentOutline: 'outline-dashed outline-[1.5px] -outline-offset-2 outline-accent',
  dependent: byId(LENS_ROLES, 'dependent')!,
  selected: byId(LENS_ROLES, 'selected')!,
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
