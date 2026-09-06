/**
 * An enabling layer on the wide plate: a band under exactly the columns it
 * serves, and a door. Same contract as a joint: always a button, its chip
 * always on, panel on click. The chip word is the layer's margin kind where
 * it earns a fee — drawn in the fee form, filled — or its own word where it
 * only sets the terms. Under a shift that re-prices this layer the band is
 * lit; the rest recede.
 */

import { useContext, type KeyboardEvent, type MouseEvent } from 'react';
import { BAND_BY_ID, MARGIN_KINDS, bandChip, shiftTarget } from '@/data/industryChain';
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
  noteX,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the note starts, or null when the band is too short to hold it. */
  noteX: number | null;
}) {
  const { shift, selected, onSelect, panelId } = useContext(ChainLensContext);
  const band = BAND_BY_ID[id];
  const chip = bandChip(band);
  const form = band.margin ? MARGIN_KINDS[band.margin].form : 'word';
  const open = selected === id;
  const lit = shiftTarget(shift, id) !== undefined;
  const w = chip ? chipWidth(chip) : 0;

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
      role="button"
      tabIndex={0}
      aria-label={band.label}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      onClick={select}
      onKeyDown={onKey}
    >
      <rect className="cp-band-rect" x={x} y={y} width={width} height={height} />
      <path className="cp-band-line" d={`M ${x} ${y} L ${x + width} ${y}`} />
      <text x={x + 10} y={y + 18} className="cp-band-t">
        {band.label}
      </text>
      {noteX !== null && band.note && (
        <text x={noteX} y={y + 18} className="cp-band-n">
          {band.note}
        </text>
      )}
      {chip && (
        <g className={cn('cp-hit-chip', `cp-chip--${form}`)} aria-hidden="true">
          <rect x={x + width - w - 8} y={y + (height - CHIP_H) / 2} width={w} height={CHIP_H} rx={2} />
          <text x={x + width - 8 - w / 2} y={y + (height - CHIP_H) / 2 + 13} textAnchor="middle">
            {chip}
          </text>
        </g>
      )}
    </g>
  );
}
