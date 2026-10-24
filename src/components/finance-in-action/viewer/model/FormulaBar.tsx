/**
 * The formula bar (sheet-first PRD R2.2): the name box, fx, and what the
 * selected cell holds. A formula shows as the engine and the workbook hold
 * it, "=" first; a sourced figure with its document and page; an assumption
 * as its value, which can be edited here as in the grid; a missing cell as
 * "Not disclosed". Read-only for everything but an assumption.
 *
 * The name box shows the selection's address (MODEL!E14) and is Excel's Go
 * To: type an address and Enter goes there, changing sheet when it names
 * another; an address that names no value cell says why under the box and
 * leaves the selection and the focus where they were. Escape puts the address
 * back. On a phone the bar is one line, cut short; the inspector holds it all.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { COPY } from '@/lib/finance-in-action/copy';
import { LIMITS } from '@/lib/finance-in-action/layout';
import { cn } from '@/lib/utils';

function NameBox({ address, onGo }: { address: string; onGo: (typed: string) => string | null }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const reset = () => {
    setDraft(null);
    setError(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (draft === null || draft.trim() === '') return reset();
      const miss = onGo(draft);
      if (miss) setError(miss);
      else reset();
    } else if (e.key === 'Escape') {
      // Full screen's Escape waits for this one: it only gives up the typing.
      e.preventDefault();
      e.stopPropagation();
      reset();
    }
  };

  return (
    <div className="relative flex flex-none">
      <input
        type="text"
        aria-label={COPY.nameBox}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={draft ?? address}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onFocus={(e) => e.target.select()}
        onBlur={reset}
        onKeyDown={onKeyDown}
        className={cn(
          'h-11 w-28 min-w-0 border-r border-border bg-transparent px-2 font-mono text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:w-36',
          error && 'text-destructive',
        )}
      />
      {error && (
        <p id={errorId} role="alert" className="absolute left-0 top-full z-30 mt-1 w-max max-w-[18rem] rounded-sm border border-border bg-popover px-2 py-1 text-xs text-destructive shadow-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export interface FormulaBarEdit {
  /** The row's label, for the edit button's name. */
  label: string;
  editor: (close: () => void) => ReactNode;
}

export function FormulaBar({
  address,
  onGo,
  text,
  edit,
}: {
  /** The selection's address, or empty. */
  address: string;
  /** Goes to a typed address; returns why not, or null when it went. */
  onGo: (typed: string) => string | null;
  /** What the selected cell holds, or empty. */
  text: string;
  /** Present when the selected cell is an assumption. */
  edit?: FormulaBarEdit | null;
}) {
  const [editing, setEditing] = useState(false);
  const [spoken, setSpoken] = useState(text);
  const editButton = useRef<HTMLButtonElement>(null);
  const closed = useRef(false);

  // The editor's input goes when it closes: the focus comes back to the bar, unless it went elsewhere.
  useEffect(() => {
    if (editing || !closed.current) return;
    closed.current = false;
    if (!document.activeElement || document.activeElement === document.body) editButton.current?.focus();
  }, [editing]);

  // Read out what the bar holds once the selection settles, not at every arrow key.
  useEffect(() => {
    const t = setTimeout(() => setSpoken(text), LIMITS.announceDelay);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => setEditing(false), [address]);

  const body = 'min-w-0 flex-1 px-2 py-1 tabular-nums text-foreground';
  /** One line cut short on a phone (the inspector holds it all); in full from a tablet up. */
  const wrap = 'truncate md:whitespace-normal md:break-words';
  return (
    <div role="group" aria-label={COPY.formulaBar} className="relative flex min-h-11 items-stretch border-y border-border bg-background text-[13px]">
      <NameBox address={address} onGo={onGo} />
      <span aria-hidden="true" className="hidden flex-none items-center border-r border-border px-2.5 font-serif italic text-muted-foreground lg:flex">
        fx
      </span>
      {edit && editing ? (
        <div className="min-w-0 flex-1">
          {edit.editor(() => {
            closed.current = true;
            setEditing(false);
          })}
        </div>
      ) : edit ? (
        <button
          ref={editButton}
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`${COPY.editInBar(edit.label)}: ${text}`}
          className={cn(body, wrap, 'text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring')}
          data-formula-bar
        >
          {text}
        </button>
      ) : (
        <div className={cn(body, 'flex items-center')} data-formula-bar>
          <span className={cn('min-w-0', wrap)}>{text}</span>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {spoken}
      </span>
    </div>
  );
}
