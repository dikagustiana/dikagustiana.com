/**
 * What the lens and an edit add to a cell, a node or a bar: a tint and a
 * glyph for precedents (▲) and dependents (▼), a tint and a delta for a
 * changed value, an outline for an edited one, and a one-time flash. Colour
 * never carries the meaning alone: each role has its glyph and its words
 * (constraint 13).
 */
import { LENS_ROLES, byId, type LensRole } from '../constants';
import type { Row } from '../contract/types';
import type { CellChange } from '../engine/recalc';
import { formatDeltaForRow } from '../format';

export interface Decoration {
  className?: string;
  glyph?: string;
  note?: string;
  label?: string;
  flash?: boolean;
}

export interface DecorationInput {
  mark: LensRole | null;
  change: CellChange | undefined;
  edited: boolean;
  flashing: boolean;
  flashToken: number;
  row: Pick<Row, 'unit' | 'style'> | undefined;
}

const role = (id: LensRole) => byId(LENS_ROLES, id)!;

/** Inside a tinted item, secondary text becomes ink: muted grey on the dependent tint is 3,80:1. */
export const TINTED_TEXT = '[&_.text-muted-foreground]:text-foreground';

export function decoration(i: DecorationInput): Decoration | null {
  const classes: string[] = [];
  const labels: string[] = [];
  let glyph: string | undefined;
  if (i.mark === 'precedent' || i.mark === 'dependent') {
    classes.push(role(i.mark).className);
    glyph = role(i.mark).glyph;
    labels.push(role(i.mark).label.toLowerCase());
  }
  let note: string | undefined;
  if (i.change) {
    if (!glyph) classes.push(role('changed').className);
    note = i.change.delta !== null && i.row ? formatDeltaForRow(i.change.delta, i.row) : undefined;
    labels.push(`${role('changed').label.toLowerCase()}${note ? `, ${note}` : ''}`);
  }
  if (i.edited) {
    classes.push(role('edited').className);
    labels.push(role('edited').label.toLowerCase());
  }
  if (i.flashing) classes.push(`fia-flash-${i.flashToken % 2}`);
  // Muted text does not hold 4.5:1 on the tints, so inside a tinted item it
  // takes the ink colour.
  if (glyph || i.change) classes.push(TINTED_TEXT);
  if (!classes.length && !glyph && !note) return null;
  return { className: classes.join(' '), glyph, note, label: labels.join(', ') || undefined, flash: false };
}
