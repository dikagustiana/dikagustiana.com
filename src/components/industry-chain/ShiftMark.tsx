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
 * The disc's FORM is the element's status, read before any click: filled
 * for stuck, open for moving, dashed for unpriced — the same three forms the
 * outline on the element and the badge in the panel use.
 *
 * Two rules the brief is strict about, both enforced here:
 *   - a mark exists only where the target has a condition, so the map never
 *     grows a hole where an empty panel would open;
 *   - the marked set does not change when the distance control moves — only
 *     what the mark says does.
 *
 * Pointing at a mark pins one line beside it; selecting it opens the panel.
 */

import { useContext, type KeyboardEvent, type MouseEvent } from 'react';
import { SHIFT_BY_ID, STATUS, targetStatus, type ShiftId } from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';
import { markNumber, targetLabel } from './chainTargets';

const R = 11;

export function ShiftMark({ shift, id, cx, cy }: { shift: ShiftId; id: string; cx: number; cy: number }) {
  const { selected, onSelect, onHover, hidden, panelId } = useContext(ChainLensContext);
  const n = markNumber(shift, id);
  // No condition yet: no mark, and no gap either — the numbers close up
  // because they are positions, not names.
  if (n === 0) return null;
  const status = targetStatus(shift, id)!;

  const open = selected === id;
  const label = `${SHIFT_BY_ID[shift].label} · ${targetLabel(id)} · ${STATUS[status].label}`;
  const select = (event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>) => onSelect(id, event.currentTarget);

  return (
    <g
      className={cn('cp-mark', `cp-mark--${status}`)}
      data-mark={id}
      data-n={n}
      data-status={status}
      data-hidden={hidden.has(id) || undefined}
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
      onMouseEnter={(e) => onHover(id, e.currentTarget)}
      onMouseLeave={() => onHover(null)}
      onFocus={(e) => onHover(id, e.currentTarget)}
      onBlur={() => onHover(null)}
    >
      <circle cx={cx} cy={cy} r={R} />
      <text x={cx} y={cy + 5} textAnchor="middle">
        {n}
      </text>
    </g>
  );
}
