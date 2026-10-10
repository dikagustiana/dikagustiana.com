/**
 * The cell legend (PRD site sweep 2026-10, R4.5): what each look in the grid means, drawn with the grid's
 * own classes (./look), so the two cannot drift apart. A figure typed into the workbook, a formula, an error
 * (D8), the workbook's red and blue type (D10), the selection's precedents and dependents as Finance in
 * Action names them (R4.9), and the hatched header of a row or column the workbook hides.
 */
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { cn } from '@/lib/utils';
import { LOOK } from './look';

/** The legend's sample figure, as the reference's legend writes it. */
const SAMPLE = '1.234';

const ITEMS: { chip: string; className: string; label: string }[] = [
  { chip: SAMPLE, className: LOOK.constant, label: COPY.legendConstant },
  { chip: SAMPLE, className: LOOK.formula, label: COPY.legendFormula },
  { chip: '#REF!', className: cn(LOOK.error, 'border-transparent'), label: COPY.legendError },
  { chip: SAMPLE, className: LOOK.red, label: COPY.legendRed },
  { chip: SAMPLE, className: LOOK.blue, label: COPY.legendBlue },
  { chip: `${LOOK.precedent.glyph} D9`, className: cn(LOOK.precedent.className, LOOK.precedentOutline), label: LOOK.precedent.label },
  { chip: `${LOOK.dependent.glyph} D9`, className: LOOK.dependent.className, label: LOOK.dependent.label },
  { chip: 'C', className: 'wb-hidden bg-background italic text-muted-foreground', label: COPY.legendHidden },
];

export function Legend({ className }: { className?: string }) {
  return (
    <ul aria-label={COPY.legendLabel} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground', className)}>
      {ITEMS.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn('inline-flex rounded-sm border border-border bg-popover px-1.5 text-[12px] leading-5 tabular-nums', item.className)}>
            {item.chip}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
