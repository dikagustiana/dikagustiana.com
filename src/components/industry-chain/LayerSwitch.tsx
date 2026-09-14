/**
 * The switch at the left end of an enabling layer's band: one layer on or
 * off, on its own. Turning a layer off does not remove it — the band and its
 * ticks fade and keep their place, and any mark on it fades with them — so
 * the reader can thin the plate to the layers they are comparing and still
 * see where the others were. The shift control is not affected: it stays
 * exclusive, and its marks keep their numbers.
 */

import { useContext, type KeyboardEvent } from 'react';
import { BAND_BY_ID, CHAIN_COPY } from '@/data/industryChain';
import { ChainLensContext } from './chainLensContext';

const SIZE = 12;
/**
 * The drawn box is 12 units — 8.5 screen pixels at the 1280px breakpoint. The
 * transparent pad around it is what the reader actually hits, and it is sized
 * to clear 24px there: 34 units, which fits inside the band row's pitch.
 */
const HIT = 34;

export function LayerSwitch({ id, x, y }: { id: string; x: number; y: number }) {
  const { hidden, onToggleLayer } = useContext(ChainLensContext);
  const on = !hidden.has(id);
  const band = BAND_BY_ID[id];
  const onKey = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleLayer(id);
    }
  };
  return (
    <g
      className="cp-switch"
      data-switch={id}
      role="switch"
      tabIndex={0}
      aria-checked={on}
      aria-label={`${on ? CHAIN_COPY.controls.layerHide : CHAIN_COPY.controls.layerShow}: ${band.label}`}
      onClick={() => onToggleLayer(id)}
      onKeyDown={onKey}
    >
      <rect className="cp-hit-area" x={x - (HIT - SIZE) / 2} y={y - (HIT - SIZE) / 2} width={HIT} height={HIT} />
      <rect className="cp-switch-box" x={x} y={y} width={SIZE} height={SIZE} rx={1.5} />
      {on && <rect className="cp-switch-dot" x={x + 3} y={y + 3} width={SIZE - 6} height={SIZE - 6} rx={0.5} />}
    </g>
  );
}
