/**
 * An enabling layer on the wide plate: a band under exactly the columns it
 * serves, and a door. Same contract as a joint: always a button, its chip
 * always on, panel on click. The chip word is the layer's margin kind where
 * it earns a fee — drawn in the fee form, filled — or its own word where it
 * only sets the terms. Under a shift that re-prices this layer the band is
 * lit; the rest recede.
 */

import { useContext, type KeyboardEvent, type MouseEvent } from 'react';
import { BAND_BY_ID, MARGIN_KINDS, bandChip, isMarked, shiftTarget } from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';

const CHIP_H = 18;
const chipWidth = (text: string) => Math.round(text.length * 14 * 0.62 + 16);

export function BandHit({
  id,
  x,
  y,
  width,
  height,
  noteX: _noteX,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the note starts, or null when the band is too short to hold it. */
  noteX: number | null;
}) {
  const { shift, selected, onSelect, onHover, panelId } = useContext(ChainLensContext);
  const band = BAND_BY_ID[id];
  const chip = bandChip(band);
  const form = band.margin ? MARGIN_KINDS[band.margin].form : 'word';
  const open = selected === id;
  const target = shiftTarget(shift, id);
  const lit = target !== undefined && isMarked(target);
  const w = chip ? chipWidth(chip) : 0;
  const labelWidth = Math.round(band.label.length * 14 * 0.75);
  const chipX = Math.min(x + 18 + labelWidth, x + width - w - 8);
  const attachments = band.margin ? Array.from({ length: 11 }, (_, index) => x + (width * (index + 1)) / 12) : [];

  const select = (event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>) => onSelect(id, event.currentTarget);
  const onKey = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(event);
    }
  };

  return (
    <g
      className="cp-hit cp-band-hit"
      data-id={id}
      data-lit={lit || undefined}
      data-condition-status={lit ? target?.condition.status : undefined}
      role="button"
      tabIndex={0}
      aria-label={band.label}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      onClick={select}
      onKeyDown={onKey}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
    >
      <rect className="cp-band-rect" x={x} y={y} width={width} height={height} />
      <path className="cp-band-line" d={`M ${x} ${y} L ${x + width} ${y}`} />
      {attachments.map((at) => (
        <path key={at} className="cp-band-attachment" d={`M ${at} ${y} L ${at} ${y - 7}`} />
      ))}
      <text x={x + 10} y={y + 18} className="cp-band-t">
        {band.label}
      </text>
      {chip && (
        <g className={cn('cp-hit-chip', `cp-chip--${form}`)} aria-hidden="true">
          <rect x={chipX} y={y + (height - CHIP_H) / 2} width={w} height={CHIP_H} rx={2} />
          <text x={chipX + w / 2} y={y + (height - CHIP_H) / 2 + 13} textAnchor="middle">
            {chip}
          </text>
        </g>
      )}
    </g>
  );
}
