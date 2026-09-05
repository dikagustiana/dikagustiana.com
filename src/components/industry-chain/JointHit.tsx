/**
 * A joint on the wide plate: a transfer of title, and a door.
 *
 * Every joint is a real button, always present, quiet at rest — a small
 * diamond on the flow. Hover, focus or the unit-economics lens shows the chip
 * with the margin kind cut there; click, tap or Enter opens the panel with
 * that margin and the line of the accounts that carries it. Nothing here is
 * reachable by hover alone.
 *
 * The chip is drawn as a SIBLING of the button, not inside it, so the
 * button's box stays the diamond and its hit circle whatever the chip does:
 * a pointer aimed at the marker always lands on the marker, and showing the
 * chip never moves the target under the pointer.
 *
 * Geometry comes from the generator as props; the label and the chip word
 * come from the data file at run time.
 */

import { useContext, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { JOINT_BY_ID, MARGIN_KINDS, type JointId } from '@/data/industryChain';
import { ChainLensContext } from './chainLensContext';

export type ChipAt = 'rowA' | 'rowB' | 'left' | 'right';

const CHIP_H = 18;
const chipWidth = (text: string) => Math.round(text.length * 14 * 0.62 + 16);

export function JointHit({
  id,
  cx,
  cy,
  chipX,
  chipY,
  chipAt,
}: {
  id: JointId;
  cx: number;
  cy: number;
  /** Centre x for a row chip; the near edge for a side chip. */
  chipX: number;
  /** Top edge of the chip. */
  chipY: number;
  chipAt: ChipAt;
}) {
  const { lens, selected, onSelect, panelId } = useContext(ChainLensContext);
  const [hot, setHot] = useState(false);
  const joint = JOINT_BY_ID[id];
  const kind = MARGIN_KINDS[joint.margin];
  const open = selected === id;
  const showChip = hot || open || lens === 'unit';

  const w = chipWidth(kind.chip);
  const rx = chipAt === 'left' ? chipX - w : chipAt === 'right' ? chipX : chipX - w / 2;
  const leader =
    chipAt === 'rowA' || chipAt === 'rowB'
      ? `M ${cx} ${cy + 8} L ${cx} ${chipY - 2}`
      : chipAt === 'left'
        ? `M ${cx - 8} ${cy} L ${chipX} ${cy}`
        : `M ${cx + 8} ${cy} L ${chipX} ${cy}`;

  const select = (event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>) => onSelect(id, event.currentTarget);
  const onKey = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(event);
    }
  };

  return (
    <>
      <g
        className="cp-hit cp-joint"
        data-id={id}
        role="button"
        tabIndex={0}
        aria-label={joint.label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={select}
        onKeyDown={onKey}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(false)}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
      >
        <circle cx={cx} cy={cy} r={18} fill="transparent" stroke="none" />
        <path className="cp-joint-mark" d={`M ${cx} ${cy - 6} L ${cx + 6} ${cy} L ${cx} ${cy + 6} L ${cx - 6} ${cy} Z`} />
      </g>
      {showChip && (
        <g className="cp-joint-chip" data-for={id} aria-hidden="true">
          <path className="cp-joint-lead" d={leader} />
          <rect x={rx} y={chipY} width={w} height={CHIP_H} rx={2} />
          <text x={rx + w / 2} y={chipY + 13} textAnchor="middle">
            {kind.chip}
          </text>
        </g>
      )}
    </>
  );
}
