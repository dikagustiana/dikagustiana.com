/**
 * The formula bar (PRD site sweep 2026-10, R4.3, R4.4), as the reference draws it: the name box, an italic
 * fx, then what the selected cell holds, a formula with its leading "=" as Excel shows it, or the value as
 * typed. Back returns from a Go To while there is one to return from. The inspector and its button are gone
 * (site cleanup 2026-10, A1).
 */
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { formulaBarText } from '@/lib/workbook/format';
import type { WorkbookCell } from '@/lib/workbook/types';
import { cn } from '@/lib/utils';

interface FormulaBarProps {
  nameBox: ReactNode;
  cell: WorkbookCell | undefined;
  /** Where Back returns to, as Excel would write it; null when there is nothing to go back to. */
  backTo: string | null;
  onBack: () => void;
}

const TOOL = 'inline-flex flex-none items-center gap-1.5 px-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

export function FormulaBar({ nameBox, cell, backTo, onBack }: FormulaBarProps) {
  const text = formulaBarText(cell);
  return (
    <div role="group" aria-label={COPY.formulaBar} className="flex min-h-9 items-stretch border-b border-border bg-popover text-[13px] [@media(pointer:coarse)]:min-h-11">
      {backTo && (
        <button type="button" onClick={onBack} aria-label={COPY.backTo(backTo)} title={COPY.backTo(backTo)} className={cn(TOOL, 'border-r border-border')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{COPY.back}</span>
        </button>
      )}
      {nameBox}
      <span aria-hidden="true" className="flex flex-none items-center border-r border-border px-2.5 italic text-muted-foreground">
        fx
      </span>
      <div data-formula-bar className="max-h-24 min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap break-all px-2.5 py-2 leading-5 tabular-nums text-foreground">
        {text}
      </div>
    </div>
  );
}
