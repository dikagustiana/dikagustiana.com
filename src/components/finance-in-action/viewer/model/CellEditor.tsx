/**
 * Editing an assumption cell in place (brief §5.6). Typed in the house
 * format; a percentage row takes its figure in per cent. Enter commits,
 * Escape cancels, and nothing typed here leaves the page.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { decimalsFor, formatNumber, isRatioRow, parseHouseNumber } from '@/lib/finance-in-action/format';
import { PERCENT } from '@/lib/finance-in-action/layout';
import type { ModelView } from './useModelView';

export function CellEditor({ view, cellKey, close }: { view: ModelView; cellKey: string; close: () => void }) {
  const row = view.rowOf(cellKey);
  const current = view.values.get(cellKey);
  const ratio = row ? isRatioRow(row) : false;
  const start = typeof current === 'number' ? (ratio ? current * PERCENT : current) : null;
  const [text, setText] = useState(start === null ? '' : formatNumber(start, decimalsFor(start)));
  const [error, setError] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    const v = parseHouseNumber(text, ratio);
    if (v === null) {
      setError(true);
      return;
    }
    view.edit(cellKey, v);
    close();
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        value={text}
        inputMode="decimal"
        aria-label={`${row?.label ?? 'Assumption'}, new value${ratio ? ' in per cent' : ''}`}
        aria-invalid={error}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
        onBlur={close}
        className="h-11 w-full min-w-[6rem] border-2 border-fia-edited bg-background px-2 text-right tabular-nums text-foreground focus-visible:outline-none"
      />
      {error && (
        <span id={errorId} role="alert" className="absolute right-0 top-full z-20 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-destructive shadow">
          Type a number: a point for thousands, a comma for decimals
        </span>
      )}
    </div>
  );
}
