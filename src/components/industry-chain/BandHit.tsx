/**
 * An enabling layer on the wide plate: a band directly under the chain, over
 * exactly the columns it serves, and a door. Same contract as a joint: always
 * a button, panel on click. Where the layer earns a fee its label carries the
 * fee glyph — a small filled square — and the band is TICKED with the same
 * square at every joint the service attaches to, so the fee is read where it
 * is paid rather than pinned to the far end of the row. A layer that is an
 * input into the stages (energy) is ticked with a rising arrow under each
 * stage; a layer that only sets the terms is ticked open at the joints it
 * governs and carries no fee glyph at all. Under a shift that re-prices this
 * layer the band is outlined in the form of its status; the rest recede.
 * A reader can switch the layer off with the small square at its left end
 * (LayerSwitch); the band then fades but keeps its place.
 */

import { useContext, type KeyboardEvent, type MouseEvent } from 'react';
import { BAND_BY_ID, MARGIN_KINDS, shiftTarget } from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';

const TICK = 6;

export function BandHit({
  id,
  x,
  y,
  width,
  height,
  noteX,
  ticks,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the note starts, or null when the band is too short to hold it. */
  noteX: number | null;
  /** The x of every point the layer attaches to the chain. */
  ticks: number[];
}) {
  const { shift, selected, onSelect, onHover, hidden, panelId } = useContext(ChainLensContext);
  const band = BAND_BY_ID[id];
  const open = selected === id;
  const lit = shiftTarget(shift, id) !== undefined;
  const off = hidden.has(id);
  const tickForm = band.attaches === 'stages' ? 'up' : band.margin ? 'fee' : 'terms';

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
      data-hidden={off || undefined}
      data-attaches={band.attaches}
      role="button"
      tabIndex={0}
      aria-label={band.label}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      onClick={select}
      onKeyDown={onKey}
      onMouseEnter={(e) => onHover(id, e.currentTarget)}
      onMouseLeave={() => onHover(null)}
      onFocus={(e) => onHover(id, e.currentTarget)}
      onBlur={() => onHover(null)}
    >
      <rect className="cp-band-rect" x={x} y={y} width={width} height={height} />
      <path className="cp-band-line" d={`M ${x} ${y} L ${x + width} ${y}`} />
      {/* One text, three runs: the label, the kind of margin it earns, the
          note. Runs flow after one another, so nothing here guesses a width. */}
      <text x={x + 10} y={y + 18}>
        <tspan className="cp-band-t">{band.label}</tspan>
        {band.margin && (
          <tspan className="cp-band-fee" dx={12}>
            {MARGIN_KINDS[band.margin].chip.toLowerCase()}
          </tspan>
        )}
        {noteX !== null && band.note && (
          <tspan className="cp-band-n" dx={16}>
            {band.note}
          </tspan>
        )}
      </text>
      {/* Where the layer attaches: one tick per point, on the band's top edge. */}
      <g className={cn('cp-ticks', `cp-ticks--${tickForm}`)} aria-hidden="true">
        {ticks.map((tx) =>
          tickForm === 'up' ? (
            <path key={tx} className="cp-tick--up" d={`M ${tx} ${y + 6} L ${tx} ${y - 5} M ${tx - 3} ${y - 2} L ${tx} ${y - 5} L ${tx + 3} ${y - 2}`} />
          ) : (
            <rect key={tx} className={`cp-tick--${tickForm}`} x={tx - TICK / 2} y={y - TICK / 2} width={TICK} height={TICK} />
          ),
        )}
      </g>
    </g>
  );
}
