/**
 * The inspector (PRD site sweep 2026-10, R4.3, R4.4): the selected cell's address, its value as the grid
 * shows it and as the file holds it, its formula, what the formula reads and what on the sheet reads the
 * cell. A precedent on this sheet is a chip that selects it; one on another sheet a button that opens that
 * sheet at the cell; one on a sheet D9 leaves out, or on no sheet at all, is named and says so. An error cell
 * (D8) and the workbook's red and blue type (D10) are said in words, not left to the colour.
 *
 * At a wide screen it stands beside the grid; on a narrow one it is a sheet along the bottom edge, as Finance
 * in Action's inspector is, with no animation. Its button closes it, as Esc does.
 */
import { forwardRef, type ReactNode } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { formatCell, rawValue } from '@/lib/workbook/format';
import { decodeA1, qualifiedRef, type Precedent } from '@/lib/workbook/refs';
import type { Cell } from '@/lib/workbook/sheet';
import type { WorkbookCell, WorkbookStyle } from '@/lib/workbook/types';
import { cn } from '@/lib/utils';
import { LOOK, kindOf, lookOf } from './look';

/** How many precedents and dependents are listed before "and n more". */
const LIST_MAX = 24;

interface CellInspectorProps {
  id: string;
  open: boolean;
  sheet: string;
  address: string;
  cell: WorkbookCell | undefined;
  style: WorkbookStyle | undefined;
  precedents: Precedent[];
  /** Cells on this sheet whose formulas read this one, A1 addresses in workbook order. */
  dependents: string[];
  /** Selects a cell, on this sheet or another, remembering where Back returns to. */
  onGo: (sheet: string, cell: Cell) => void;
  onClose: () => void;
}

const CHIP =
  'inline-flex min-h-7 items-center gap-1 rounded-sm border border-border bg-secondary px-1.5 text-[12px] tabular-nums text-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-3">
      <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Chips<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.slice(0, LIST_MAX).map(render)}
      {items.length > LIST_MAX && <li className="self-center text-xs text-muted-foreground">{COPY.more(items.length - LIST_MAX)}</li>}
    </ul>
  );
}

function PrecedentChip({ p, onGo }: { p: Precedent; onGo: CellInspectorProps['onGo'] }) {
  const top = { col: p.left, row: p.top };
  if (p.local)
    return (
      <li>
        <button type="button" className={cn(CHIP, LOOK.precedent.className)} data-chip={p.ref} onClick={() => onGo(p.sheet, top)}>
          <span aria-hidden="true" className="text-[10px]">
            {LOOK.precedent.glyph}
          </span>
          {p.ref}
        </button>
      </li>
    );
  const name = qualifiedRef(p.sheet, p.ref);
  if (p.status === 'published')
    return (
      <li>
        <button type="button" className={CHIP} data-jump={name} aria-label={COPY.goTo(name)} onClick={() => onGo(p.sheet, top)}>
          {name}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </li>
    );
  return (
    <li className="inline-flex flex-wrap items-center gap-x-1.5 text-[12px]">
      <span className="rounded-sm border border-dashed border-border px-1.5 py-0.5 tabular-nums text-muted-foreground">{name}</span>
      <span className="text-muted-foreground">{p.status === 'excluded' ? COPY.notPublished : COPY.noSuchSheet}</span>
    </li>
  );
}

export const CellInspector = forwardRef<HTMLElement, CellInspectorProps>(function CellInspector(
  { id, open, sheet, address, cell, style, precedents, dependents, onGo, onClose },
  ref,
) {
  const kind = kindOf(cell);
  const shown = cell ? formatCell(cell, style?.numFmt) : '';
  const raw = cell ? rawValue(cell) : '';

  return (
    <aside
      ref={ref}
      id={id}
      aria-label={COPY.inspector}
      tabIndex={-1}
      hidden={!open}
      className={cn(
        'border-border bg-popover text-popover-foreground focus-visible:outline-none',
        // Narrow screens: a sheet along the bottom edge.
        'fixed inset-x-0 bottom-0 z-40 max-h-[55vh] overflow-y-auto border-t p-4 shadow-lg',
        // Wide screens: beside the grid.
        'lg:static lg:z-auto lg:max-h-none lg:w-80 lg:flex-none lg:border-l lg:border-t-0 lg:shadow-none',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-base font-semibold text-foreground">{COPY.inspector}</h3>
          <p className="mt-0.5 break-all text-[13px] tabular-nums text-muted-foreground" data-inspector-address>
            {qualifiedRef(sheet, address)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={COPY.closeInspector}
          className="-mr-2 -mt-2 inline-flex h-11 w-11 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          <dt className="text-muted-foreground">{COPY.value}</dt>
          <dd className={cn('min-w-0 break-words font-semibold tabular-nums', lookOf(cell, style), kind === 'error' && 'justify-self-start rounded-sm px-1')}>
            {shown || <span className="font-normal text-muted-foreground">{COPY.emptyCell}</span>}
          </dd>
          {raw !== '' && raw !== shown && (
            <>
              <dt className="text-muted-foreground">{COPY.rawValue}</dt>
              <dd className="min-w-0 break-all tabular-nums text-foreground">{raw}</dd>
            </>
          )}
          {cell?.f !== undefined && (
            <>
              <dt className="text-muted-foreground">{COPY.formula}</dt>
              <dd className="min-w-0 break-all tabular-nums text-foreground" data-inspector-formula>
                ={cell.f}
              </dd>
            </>
          )}
        </dl>

        {kind === 'error' && <p className="rounded-sm bg-wb-error-bg px-2 py-1.5 text-wb-error-fg">{COPY.errorNote}</p>}
        {kind === 'constant' && <p className="text-muted-foreground">{COPY.typedValue}</p>}
        {style?.color === 'red' && <p className="text-wb-red">{COPY.fontRed}</p>}
        {style?.color === 'blue' && <p className="text-wb-blue">{COPY.fontBlue}</p>}

        {cell?.f !== undefined && (
          <Section title={COPY.precedents}>
            {precedents.length ? (
              <Chips items={precedents} render={(p) => <PrecedentChip key={`${p.sheet}!${p.ref}`} p={p} onGo={onGo} />} />
            ) : (
              <p className="text-muted-foreground">{COPY.noPrecedents}</p>
            )}
          </Section>
        )}

        <Section title={COPY.dependents}>
          {dependents.length ? (
            <Chips
              items={dependents}
              render={(a) => (
                <li key={a}>
                  <button type="button" className={cn(CHIP, LOOK.dependent.className)} data-chip={a} onClick={() => onGo(sheet, decodeA1(a)!)}>
                    <span aria-hidden="true" className="text-[10px]">
                      {LOOK.dependent.glyph}
                    </span>
                    {a}
                  </button>
                </li>
              )}
            />
          ) : (
            <p className="text-muted-foreground">{COPY.noDependents}</p>
          )}
        </Section>
      </div>
    </aside>
  );
});
