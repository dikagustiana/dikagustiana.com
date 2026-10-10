/**
 * The name box (PRD site sweep 2026-10, R4.3, R4.4): the selected cell's address, and Excel's Go To. Typing
 * an address and Enter goes there: `D9`, `$D$9`, a range (its top-left), or a cell on another sheet,
 * `'Consol SoFP 24'!D9` as Excel writes it or `Consol SoFP 24!D9` as a person types it. Esc puts the address
 * back and returns to the grid. Ctrl+G, anywhere in the viewer, lands here with the address selected.
 */
import { forwardRef, useId, useState, type KeyboardEvent } from 'react';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { cn } from '@/lib/utils';

interface NameBoxProps {
  /** The selected cell's address on its sheet. */
  address: string;
  /** Goes to what was typed; false when it names no cell of the workbook. */
  onGo: (typed: string) => boolean;
  /** Esc, or a successful Go: back to the grid. */
  onDone: () => void;
}

export const NameBox = forwardRef<HTMLInputElement, NameBoxProps>(function NameBox({ address, onGo, onDone }, ref) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

  const reset = () => {
    setDraft(null);
    setInvalid(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (draft === null || draft.trim() === '' || onGo(draft)) {
        reset();
        onDone();
      } else {
        setInvalid(true);
      }
    } else if (e.key === 'Escape') {
      // The viewer's Esc closes the inspector; here it only gives up the typing.
      e.preventDefault();
      e.stopPropagation();
      reset();
      onDone();
    }
  };

  return (
    <div className="relative flex flex-none">
      <input
        ref={ref}
        type="text"
        aria-label={COPY.nameBox}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={draft ?? address}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
        }}
        onFocus={(e) => e.target.select()}
        onBlur={reset}
        onKeyDown={onKeyDown}
        className={cn(
          'h-full w-[5.5rem] min-w-0 border-r border-border bg-transparent px-2.5 font-semibold tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:w-28',
          invalid && 'text-wb-error-fg',
        )}
      />
      {invalid && (
        <p id={errorId} role="alert" className="absolute left-0 top-full z-10 mt-1 w-max max-w-[16rem] rounded-sm border border-border bg-popover px-2 py-1 text-xs text-wb-error-fg shadow-sm">
          {COPY.noSuchCell}
        </p>
      )}
    </div>
  );
});
