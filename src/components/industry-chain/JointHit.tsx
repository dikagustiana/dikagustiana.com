/**
 * A joint on the wide plate: a transfer of title, and a door.
 *
 * Every joint is a real button, always present — the heaviest mark on the
 * plate — with its chip always on. The MARK's form is the kind of margin cut
 * there, so the kind reads without colour and without a legend: a filled
 * diamond where a transforming stage sells (conversion), an open diamond
 * where a node that only holds title sells (spread), a square where a fee is
 * paid. The CHIP's word is the joint read at the distance that is on — the
 * macro variable that enters here, or the service performed here. Click, tap
 * or Enter opens the panel with the margin and the line of the accounts that
 * carries it. Under a shift that moves this joint the mark is lit and its
 * status outlined; every other joint recedes.
 *
 * The chip is drawn as a SIBLING of the button, not inside it, so the
 * button's box stays the diamond and its hit circle whatever the chip does;
 * pointing at the chip reads the same line the diamond does.
 *
 * Geometry comes from the generator as props; every word comes from the data
 * file at run time.
 */

import { useContext, useId, type KeyboardEvent, type MouseEvent } from 'react';
import { JOINT_BY_ID, MARGIN_KINDS, type JointId } from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';
import { isLit } from './chainTargets';

export type ChipAt = 'rowA' | 'rowB' | 'left' | 'right';

const CHIP_H = 18;
const R = 8;
const chipWidth = (text: string) => Math.round(text.length * 14 * 0.56 + 16);

/** The joint mark, in the form of its margin kind. */
function markPath(kind: (typeof MARGIN_KINDS)[keyof typeof MARGIN_KINDS]['mark'], cx: number, cy: number): string {
  if (kind === 'square') {
    const s = R - 1;
    return `M ${cx - s} ${cy - s} H ${cx + s} V ${cy + s} H ${cx - s} Z`;
  }
  return `M ${cx} ${cy - R} L ${cx + R} ${cy} L ${cx} ${cy + R} L ${cx - R} ${cy} Z`;
}

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
  const { lens, shift, selected, onSelect, onHover, panelId } = useContext(ChainLensContext);
  const joint = JOINT_BY_ID[id];
  const descriptionId = useId();
  const kind = MARGIN_KINDS[joint.margin];
  const word = joint.read[lens].chip;
  const open = selected === id;
  const lit = isLit(shift, id);

  const w = chipWidth(word);
  const rx = chipAt === 'left' ? chipX - w : chipAt === 'right' ? chipX : chipX - w / 2;
  const row = chipAt === 'rowA' || chipAt === 'rowB';
  const leader = row
    ? chipX === cx
      ? `M ${cx} ${cy + R + 1} L ${cx} ${chipY - 2}`
      : `M ${cx} ${cy + R + 1} L ${cx} ${chipY - 10} L ${chipX} ${chipY - 10} L ${chipX} ${chipY - 2}`
    : chipAt === 'left'
      ? `M ${cx - R - 1} ${cy} L ${chipX} ${cy}`
      : `M ${cx + R + 1} ${cy} L ${chipX} ${cy}`;

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
        data-lit={lit || undefined}
        data-kind={joint.margin}
        role="button"
        tabIndex={0}
        aria-label={joint.label}
        aria-describedby={descriptionId}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={select}
        onKeyDown={onKey}
        onMouseEnter={(e) => onHover(id, e.currentTarget)}
        onMouseLeave={() => onHover(null)}
        onFocus={(e) => onHover(id, e.currentTarget)}
        onBlur={() => onHover(null)}
      >
        <desc id={descriptionId}>{kind.label}. {joint.read[lens].chip}. {joint.read[lens].note}</desc>
        <circle cx={cx} cy={cy} r={18} fill="transparent" stroke="none" />
        <path className={cn('cp-joint-mark', `cp-joint-mark--${kind.mark}`)} d={markPath(kind.mark, cx, cy)} />
      </g>
      {/* The chip reads the same line as the diamond and opens the same door,
          so a reader who lands on the word is not one target away from it. */}
      <g
        className="cp-joint-chip"
        data-for={id}
        data-lit={lit || undefined}
        aria-hidden="true"
        onClick={(e) => onSelect(id, e.currentTarget)}
        onMouseEnter={(e) => onHover(id, e.currentTarget)}
        onMouseLeave={() => onHover(null)}
      >
        <path className="cp-joint-lead" d={leader} />
        <rect x={rx} y={chipY} width={w} height={CHIP_H} rx={2} />
        <text x={rx + w / 2} y={chipY + 13} textAnchor="middle">
          {word}
        </text>
      </g>
    </>
  );
}
