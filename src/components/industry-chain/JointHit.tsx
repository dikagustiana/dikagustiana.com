/**
 * A joint on the wide plate: a transfer of title, and a door.
 *
 * Every joint is a real button, always present — a diamond on the flow, the
 * heaviest mark on the plate — with its chip always on. The chip's WORD is
 * the joint read at the distance that is on (economy or finance); the chip's
 * FORM is the kind of margin cut there, told by its border so it reads
 * without colour: solid for conversion, dashed for a spread, filled for a
 * fee. Click, tap or Enter opens the panel with the margin and the line of
 * the accounts that carries it. Under a shift that moves this joint the mark
 * is lit; every other joint recedes.
 *
 * The chip is drawn as a SIBLING of the button, not inside it, so the
 * button's box stays the diamond and its hit circle whatever the chip does.
 *
 * Geometry comes from the generator as props; every word comes from the data
 * file at run time.
 */

import { useContext, useId, type KeyboardEvent, type MouseEvent } from 'react';
import { JOINT_BY_ID, MARGIN_KINDS, shiftTarget, type JointId } from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';

export type ChipAt = 'rowA' | 'rowB' | 'left' | 'right';

const CHIP_H = 18;
const R = 8;
const chipWidth = (text: string) => Math.round(text.length * 14 * 0.56 + 16);

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
  const { lens, shift, selected, onSelect, panelId } = useContext(ChainLensContext);
  const joint = JOINT_BY_ID[id];
  const descriptionId = useId();
  const kind = MARGIN_KINDS[joint.margin];
  const word = joint.read[lens].chip;
  const open = selected === id;
  const lit = shiftTarget(shift, id) !== undefined;

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
        role="button"
        tabIndex={0}
        aria-label={joint.label}
        aria-describedby={descriptionId}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={select}
        onKeyDown={onKey}
      >
        <desc id={descriptionId}>{kind.label}. {joint.read[lens].chip}. {joint.read[lens].note}</desc>
        <circle cx={cx} cy={cy} r={18} fill="transparent" stroke="none" />
        <path className="cp-joint-mark" d={`M ${cx} ${cy - R} L ${cx + R} ${cy} L ${cx} ${cy + R} L ${cx - R} ${cy} Z`} />
      </g>
      <g className={cn('cp-joint-chip', `cp-chip--${kind.form}`)} data-for={id} data-lit={lit || undefined} aria-hidden="true">
        <path className="cp-joint-lead" d={leader} />
        <rect x={rx} y={chipY} width={w} height={CHIP_H} rx={2} />
        <text x={rx + w / 2} y={chipY + 13} textAnchor="middle">
          {word}
        </text>
      </g>
    </>
  );
}
