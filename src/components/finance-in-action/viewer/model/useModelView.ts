/**
 * The state of one model page: its own workbook (never the registry's shared
 * one, so nothing a reader does on one visit survives to the next), the
 * reader's edits and their recalculation, the selection, and the Connections
 * lens marks. Nothing here leaves the browser (constraint 12).
 */
import { useCallback, useMemo, useState } from 'react';
import type { LensRole } from '@/lib/finance-in-action/constants';
import type { ModelPackage, Row } from '@/lib/finance-in-action/contract/types';
import { isNum, type CellChange, type Depth, type Value } from '@/lib/finance-in-action/engine';
import { runScenario } from '@/lib/finance-in-action/model/scenario';
import { Workbook } from '@/lib/finance-in-action/model/workbook';

export interface EditRecord {
  key: string;
  before: number | null;
  after: number;
}

export interface ModelView {
  pkg: ModelPackage;
  wb: Workbook;
  /** Current values: the package's, or the scenario's after an edit. */
  values: Map<string, Value>;
  /** The package's values, as published. */
  base: Map<string, Value>;
  selected: string | null;
  select: (key: string | null) => void;
  valueOf: (rowRef: string, periodId: string) => number | null;
  baseValueOf: (rowRef: string, periodId: string) => number | null;
  rowOf: (key: string) => Row | undefined;
  // The Connections lens
  lens: boolean;
  depth: Depth;
  setDepth: (d: Depth) => void;
  markOf: (key: string) => LensRole | null;
  // Edits
  edits: EditRecord[];
  edit: (key: string, value: number) => void;
  reset: () => void;
  changed: Map<string, CellChange>;
  /** Cells the latest edit moved, and a token that changes with every edit, so each flashes once. */
  flash: { keys: Set<string>; token: number };
}

export function useModelView(pkg: ModelPackage, lens = false): ModelView {
  const wb = useMemo(() => new Workbook(pkg), [pkg]);
  const base = useMemo(() => wb.values(), [wb]);
  const [selected, setSelected] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth>('one');
  const [scenario, setScenario] = useState<{
    edits: Map<string, number>;
    values: Map<string, Value>;
    changed: Map<string, CellChange>;
    flash: { keys: Set<string>; token: number };
  }>(() => ({ edits: new Map(), values: base, changed: new Map(), flash: { keys: new Set(), token: 0 } }));

  const values = scenario.values;

  const edit = useCallback(
    (key: string, value: number) => {
      setScenario((prev) => {
        const edits = new Map(prev.edits).set(key, value);
        const result = runScenario(wb, base, edits);
        const moved = new Set(result.changed.filter((c) => !Object.is(prev.values.get(c.key), c.after)).map((c) => c.key));
        for (const k of prev.changed.keys()) if (!result.changed.some((c) => c.key === k)) moved.add(k);
        return {
          edits,
          values: result.values,
          changed: new Map(result.changed.map((c) => [c.key, c])),
          flash: { keys: moved, token: prev.flash.token + 1 },
        };
      });
    },
    [wb, base],
  );

  const reset = useCallback(() => {
    runScenario(wb, base, new Map());
    setScenario((prev) => ({ edits: new Map(), values: base, changed: new Map(), flash: { keys: new Set(), token: prev.flash.token + 1 } }));
  }, [wb, base]);

  const read = useCallback(
    (vals: Map<string, Value>) => (rowRef: string, periodId: string) => {
      const key = wb.keyOf(rowRef, periodId);
      const v = key ? vals.get(key) : null;
      return isNum(v) ? v : null;
    },
    [wb],
  );
  const valueOf = useMemo(() => read(values), [read, values]);
  const baseValueOf = useMemo(() => read(base), [read, base]);
  const rowOf = useCallback(
    (key: string) => {
      const ref = wb.rowRefOf(key);
      return ref ? wb.row(ref) : undefined;
    },
    [wb],
  );

  const marks = useMemo(() => {
    if (!lens || !selected) return null;
    return {
      selected,
      pre: new Set(wb.graph.precedents(selected, depth)),
      dep: new Set(wb.graph.dependents(selected, depth)),
    };
  }, [lens, selected, depth, wb]);

  // Changes only with the marks, so with the lens off a new selection redraws nothing it marks.
  const markOf = useCallback(
    (key: string): LensRole | null => {
      if (!marks) return null;
      if (key === marks.selected) return 'selected';
      if (marks.pre.has(key)) return 'precedent';
      if (marks.dep.has(key)) return 'dependent';
      return null;
    },
    [marks],
  );

  const edits = useMemo<EditRecord[]>(
    () =>
      Array.from(scenario.edits.entries()).map(([key, after]) => {
        const b = base.get(key);
        return { key, before: isNum(b) ? b : null, after };
      }),
    [scenario.edits, base],
  );

  return {
    pkg,
    wb,
    values,
    base,
    selected,
    select: setSelected,
    valueOf,
    baseValueOf,
    rowOf,
    lens,
    depth,
    setDepth,
    markOf,
    edits,
    edit,
    reset,
    changed: scenario.changed,
    flash: scenario.flash,
  };
}
