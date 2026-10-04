/**
 * The state of one model page: its own workbook (never the registry's shared
 * one, so nothing a reader does on one visit survives to the next), the
 * values, and the selected cell. Nothing here leaves the browser
 * (constraint 12).
 */
import { useCallback, useMemo, useState } from 'react';
import type { ModelPackage, Row } from '@/lib/finance-in-action/contract/types';
import { isNum, type Value } from '@/lib/finance-in-action/engine';
import { Workbook } from '@/lib/finance-in-action/model/workbook';

export interface ModelView {
  pkg: ModelPackage;
  wb: Workbook;
  values: Map<string, Value>;
  selected: string | null;
  select: (key: string | null) => void;
  /** A row's value in a period, as a number, or null. */
  valueOf: (rowRef: string, periodId: string) => number | null;
  /** The row behind a cell key. */
  rowOf: (key: string) => Row | undefined;
}

export function useModelView(pkg: ModelPackage): ModelView {
  const wb = useMemo(() => new Workbook(pkg), [pkg]);
  const values = useMemo(() => wb.values(), [wb]);
  const [selected, setSelected] = useState<string | null>(null);

  const valueOf = useCallback(
    (rowRef: string, periodId: string) => {
      const key = wb.keyOf(rowRef, periodId);
      const v = key ? values.get(key) : null;
      return isNum(v) ? v : null;
    },
    [wb, values],
  );
  const rowOf = useCallback(
    (key: string) => {
      const ref = wb.rowRefOf(key);
      return ref ? wb.row(ref) : undefined;
    },
    [wb],
  );

  return { pkg, wb, values, selected, select: setSelected, valueOf, rowOf };
}
