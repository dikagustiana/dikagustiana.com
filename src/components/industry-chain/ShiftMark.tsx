/**
 * One numbered mark on the wide plate.
 *
 * A mark is an index, not a label: it says "there is something to read here,
 * and it is the third thing". The number comes from the reading order the
 * generator computed from where the marks actually land — left to right, then
 * top to bottom, layers last — and is renumbered from one every time the
 * overlay changes, so it is never an identity. Identity is the slug in the
 * data file, which the URL carries and an essay links to.
 *
 * Two rules the brief is strict about, both enforced here:
 *   - a mark exists only where the target can answer at BOTH distances, so
 *     the map never grows a hole where an empty panel would open;
 *   - the marked set does not change when the distance control moves — only
 *     what the mark says does — because `isMarked` reads both distances.
 *
 * Pointing at a mark writes one line into the readout under the plate; it
 * never opens a floating tooltip, which on a plate this dense would cover
 * the thing the reader is pointing at. Selecting it opens the panel.
 */

import { useContext, type KeyboardEvent, type MouseEvent } from 'react';
import { SHIFT_BY_ID, type ShiftId } from '@/data/industryChain';
import { ChainLensContext } from './chainLensContext';
import { markNumber, targetLabel } from './chainTargets';

const R = 11;

export function ShiftMark({ shift, id, cx, cy }: { shift: ShiftId; id: string; cx: number; cy: number }) {
  const { selected, onSelect, onHover, panelId } = useContext(ChainLensContext);
  const n = markNumber(shift, id);
  // No reading yet at one of the two distances: no mark, and no gap either —
  // the numbers close up because they are positions, not names.
  if (n === 0) return null;

  const open = selected === id;
  const label = `${SHIFT_BY_ID[shift].label} · ${targetLabel(id)}`;
  const select = (event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>) => onSelect(id, event.currentTarget);

  return (
    <g
      className="cp-mark"
      data-mark={id}
      data-n={n}
      style={{ ['--cp-n' as string]: n - 1 }}
      role="button"
      tabIndex={0}
      aria-label={`${n}. ${label}`}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      onClick={select}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(event);
        }
      }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
    >
      <circle cx={cx} cy={cy} r={R} />
      <text x={cx} y={cy + 5} textAnchor="middle">
        {n}
      </text>
    </g>
  );
}
