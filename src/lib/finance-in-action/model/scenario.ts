/**
 * A reader's scenario: assumption edits recalculated through the engine
 * (brief §5.6). Nothing here is persisted or sent anywhere (constraint 12);
 * the page holds the edits in memory and forgets them on Reset or on leaving.
 */
import { recalcWithEdits, type RecalcResult } from '../engine/recalc';
import type { Value } from '../engine/engine';
import type { Workbook } from './workbook';

/** Only assumption cells may be edited. */
export const isEditable = (wb: Workbook, key: string): boolean => wb.cell(key)?.kind === 'assumption';

/**
 * Sets every assumption cell to its edit, or back to the package's value, then
 * recalculates and reports each cell that differs from `base` (the package as
 * published).
 */
export function runScenario(wb: Workbook, base: Map<string, Value>, edits: ReadonlyMap<string, number>): RecalcResult {
  for (const key of edits.keys()) if (!isEditable(wb, key)) throw new Error(`${key} is not an assumption`);
  for (const key of wb.allKeys()) {
    const cell = wb.cell(key);
    if (cell?.kind !== 'assumption') continue;
    wb.engine.setValue(key, edits.has(key) ? (edits.get(key) as number) : cell.value);
  }
  return recalcWithEdits(wb.engine, base, []);
}
