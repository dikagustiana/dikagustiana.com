/**
 * An enabling layer on the wide plate: a band directly under the chain, over
 * exactly the columns it serves, and a door. Same contract as a joint: always
 * a button, panel on click. Where the layer earns a fee its label carries the
 * fee glyph — a small filled square — and the band is TICKED with the same
 * square at every joint the service attaches to, so the fee is read where it
 * is paid rather than pinned to the far end of the row. A layer that is an
 * input into the stages (energy) is ticked with a rising arrow under each
 * stage; a layer that builds capacity (asset finance) is ticked with a block
 * on a post under each function whose activity needs a built asset, and names
 * the supporting layers it also funds; a layer that only sets the terms is
 * ticked open at the joints it governs and carries no fee glyph at all. Under
 * a shift that re-prices this layer the band is outlined in the form of its
 * status; the rest recede. A reader can switch the layer off with the small
 * square at its left end (LayerSwitch); the band then fades but keeps its
 * place.
 *
 * THE ENERGY BAND DRAWS ITS OWN ANATOMY. Read as one input, energy hides
 * three different relationships, and the site's one assessed reading turns on
 * telling them apart. So the band's top edge is the NETWORK: a dotted line
 * whose left end is a filled point — generation — and which carries an open
 * point under every consuming function — the connection — from which the
 * riser into that function leaves. The words for all three sit in the band's
 * own note row, with the alternative the drawing cannot show for one function
 * without asserting it for that function: generation on site. Descriptive
 * only; the panel and the essay say where any of the three actually binds.
 */

import { useContext, type KeyboardEvent, type MouseEvent } from 'react';
import { BAND_BY_ID, CHAIN_COPY, MARGIN_KINDS, MECHANISMS, shiftTarget } from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';
import { isLit } from './chainTargets';

const TICK = 6;

type TickForm = 'fee' | 'terms' | 'up' | 'asset';

function Tick({ form, x, y }: { form: TickForm; x: number; y: number }) {
  if (form === 'up') {
    return <path className="cp-tick--up" d={`M ${x} ${y + 6} L ${x} ${y - 5} M ${x - 3} ${y - 2} L ${x} ${y - 5} L ${x + 3} ${y - 2}`} />;
  }
  if (form === 'asset') {
    // A block on a post: the asset, built here, on the money that built it.
    return (
      <g className="cp-tick--asset">
        <path d={`M ${x} ${y + 6} L ${x} ${y - 4}`} />
        <rect x={x - 3.5} y={y - 11} width={7} height={7} />
      </g>
    );
  }
  return <rect className={`cp-tick--${form}`} x={x - TICK / 2} y={y - TICK / 2} width={TICK} height={TICK} />;
}

export function BandHit({
  id,
  x,
  y,
  width,
  height,
  noteX,
  shortLabel = false,
  showFunds = false,
  ticks,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the note starts, or null when the band is too short to hold it. */
  noteX: number | null;
  /** The band is too short for its full label: show the short form, keep the full one as the accessible name. */
  shortLabel?: boolean;
  /** Room after the note for the layers asset finance also funds. */
  showFunds?: boolean;
  /** The x of every point the layer attaches to the chain. */
  ticks: number[];
}) {
  const { shift, selected, onSelect, onHover, hidden, panelId } = useContext(ChainLensContext);
  const band = BAND_BY_ID[id];
  const open = selected === id;
  const lit = isLit(shift, id);
  const off = hidden.has(id);
  const energy = band.id === 'band-energy';
  const tickForm: TickForm =
    band.attaches === 'stages' ? 'up' : band.attaches === 'recipients' ? 'asset' : band.margin ? 'fee' : 'terms';
  const funds = band.financesLayers?.map((lid) => BAND_BY_ID[lid].short) ?? [];
  const lastTick = ticks.length ? Math.max(...ticks) : x;
  // What moves this layer under the shift that is on, where it is not the
  // price the map draws: named inside the lit strip, at its right end, so a
  // contract or a risk transfer is not read as a repricing.
  const mechanism = shiftTarget(shift, id)?.condition?.mechanism;
  const named = lit && mechanism && mechanism !== 'price' ? MECHANISMS[mechanism].label : null;
  const namedW = named ? Math.round(named.length * 14 * 0.62 + 12) : 0;

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
          note — or, for energy, the words of the anatomy drawn on its edge;
          for asset finance, the layers it also funds. Runs flow after one
          another, so nothing here guesses a width. */}
      <text x={x + 10} y={y + 18}>
        <tspan className="cp-band-t">{shortLabel ? band.short : band.label}</tspan>
        {band.margin && (
          <tspan className="cp-band-fee" dx={12}>
            {MARGIN_KINDS[band.margin].chip.toLowerCase()}
          </tspan>
        )}
        {noteX !== null && energy && (
          <tspan className="cp-band-n" dx={16} data-energy-legend="">
            {`● ${CHAIN_COPY.energy.generation} — ${CHAIN_COPY.energy.network} — ○ ${CHAIN_COPY.energy.connection} · ${CHAIN_COPY.energy.selfSupply}`}
          </tspan>
        )}
        {noteX !== null && !energy && band.note && (
          <tspan className="cp-band-n" dx={16}>
            {band.note}
          </tspan>
        )}
        {noteX !== null && showFunds && !energy && funds.length > 0 && (
          <tspan className="cp-band-n" dx={12} data-funds-layers="">
            {`· ${CHAIN_COPY.panel.financesLayersRun} ${funds.join(' · ')}`}
          </tspan>
        )}
      </text>
      {/* The energy network along the top edge: generation at its left end,
          a connection at every function it reaches. */}
      {energy && (
        <g className="cp-energy-anatomy" aria-hidden="true">
          <path className="cp-energy-net" d={`M ${x + 6} ${y} L ${lastTick} ${y}`} />
          <circle className="cp-energy-gen" cx={x + 6} cy={y} r={4} />
        </g>
      )}
      {named && (
        <g className="cp-callout cp-callout--mechanism" data-mechanism={mechanism} aria-hidden="true">
          <rect x={x + width - 6 - namedW} y={y + 3} width={namedW} height={18} rx={2} />
          <text x={x + width - 12} y={y + height / 2 + 5} className="cp-callout-t" textAnchor="end">
            {named}
          </text>
        </g>
      )}
      {/* Where the layer attaches: one tick per point, on the band's top edge. */}
      <g className={cn('cp-ticks', `cp-ticks--${tickForm}`)} aria-hidden="true">
        {ticks.map((tx) => (
          <g key={tx}>
            {energy && <circle className="cp-energy-conn" cx={tx} cy={y} r={3.5} />}
            <Tick form={tickForm} x={tx} y={energy ? y - 4 : y} />
          </g>
        ))}
      </g>
    </g>
  );
}
