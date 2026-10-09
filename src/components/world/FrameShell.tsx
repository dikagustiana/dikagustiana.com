/**
 * The parts of the frame its first paint draws (gate 4, O8): the header with
 * its controls, the search field and the poster. WorldFrame renders them
 * live; the poster fallback (Poster.tsx) renders the same components, inert,
 * before the frame's chunk has arrived, so the page's largest paint (the
 * poster) happens at its final place and size and nothing moves when the
 * frame takes over. Nothing here reads the registry or the engine: this
 * module travels with the landing page's chunk when the flag is on.
 */
import { useId, type ReactNode, type Ref } from 'react';
import { LAYERS, OVERLAYS, PLACES, TITLE, WORLD_PATH } from '@/lib/world/constants';
import type { LayerName, OverlayName, ViewName } from '@/world/engine/types';

/** Below this width the stage is a 4:5 bottom-to-edge panel and the places fold into one button (frame.css). */
export const PHONE_QUERY = '(max-width: 640px)';
const POSTER_SRC = '/world/poster-far.svg';

/** What the header's controls do; the fallback passes one handler that only fetches the frame. */
export interface FrameControls {
  place(view: ViewName): void;
  distance(t: number): void;
  dragging(on: boolean): void;
  overlay(overlay: OverlayName): void;
  layer(layer: LayerName): void;
  skema(): void;
}

export interface FrameHeaderProps {
  heading: 'h1' | 'h2';
  variant: 'preview' | 'full';
  phone: boolean;
  coverage: string;
  view: ViewName | null;
  ready: boolean;
  distance: number;
  overlay: OverlayName;
  layers: Readonly<Record<LayerName, boolean>>;
  search: ReactNode;
  on: FrameControls;
}

export function FrameHeader({ heading, variant, phone, coverage, view, ready, distance, overlay, layers, search, on }: FrameHeaderProps) {
  const H = heading;
  const Sub = heading === 'h1' ? 'h2' : 'h3';
  const places: ReactNode = PLACES.map((p) => <button key={p.view} type="button" className="world-btn" aria-current={view === p.view || (p.view === 'whole' && view === null && ready)} title={`${p.label} (${p.key})`} onClick={() => on.place(p.view)}>{p.label}</button>);
  return (
    <header className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <H className="text-2xl font-display font-semibold tracking-tight">{TITLE}</H>
        <p className="world-coverage" aria-live="polite">{coverage}</p>
      </div>
      <Sub className="sr-only">Controls</Sub>
      <div className="world-frame__controls">
        {phone ? <details className="world-frame__group"><summary className="world-btn">Places</summary><div className="world-frame__group">{places}</div></details> : <div className="world-frame__group" aria-label="Places"><span>Places</span>{places}</div>}
        <div className="world-frame__group" aria-label="Zoom"><button type="button" className="world-btn" aria-label="Zoom in" onClick={() => on.distance(Math.min(1, distance + 0.15))}>+</button><button type="button" className="world-btn" aria-label="Zoom out" onClick={() => on.distance(Math.max(0, distance - 0.15))}>−</button></div>
        <label className="world-distance"><span className="text-muted-foreground">Economy</span><input type="range" min={0} max={1} step={0.01} value={distance} aria-label="Distance: economy to finance" onChange={(e) => on.distance(Number(e.target.value))} onPointerDown={() => on.dragging(true)} onPointerUp={() => on.dragging(false)} onPointerCancel={() => on.dragging(false)} /><span className="text-muted-foreground">Finance</span></label>
        <div className="world-frame__group" role="radiogroup" aria-label="Shift overlay"><span>Shift</span>{OVERLAYS.map((o) => <button key={o.overlay} type="button" role="radio" className="world-btn" aria-checked={overlay === o.overlay} onClick={() => on.overlay(o.overlay)}>{o.label}</button>)}</div>
        <div className="world-frame__group" aria-label="Layers"><span>Layers</span>{LAYERS.map((l) => <button key={l.layer} type="button" className="world-btn" aria-pressed={layers[l.layer]} onClick={() => on.layer(l.layer)}>{l.label}</button>)}</div>
        {search}
        <button type="button" className="world-btn" aria-pressed={false} onClick={() => on.skema()}>Skema</button>
        {variant === 'preview' && <a className="world-btn" href={WORLD_PATH}>Open the world</a>}
      </div>
    </header>
  );
}

/** The search field; Search.tsx gives it the index and the results list, the fallback renders it empty. */
export function SearchField({ value, onChange, results }: { value: string; onChange: (q: string) => void; results?: (listId: string) => ReactNode }) {
  // useId's colons are not valid in an id token for aria-controls (axe aria-valid-attr-value)
  const id = `ws${useId().replace(/:/g, '')}`;
  const list = results?.(`${id}-list`) ?? null;
  return (
    <div className="world-search" role="search">
      <label htmlFor={id} className="sr-only">Search companies, sub-industries and analyses</label>
      <input id={id} type="search" placeholder="Search" value={value} onChange={(e) => onChange(e.target.value)} aria-controls={list ? `${id}-list` : undefined} autoComplete="off" />
      {list}
    </div>
  );
}

/** The far view, at the stage's size: the page's largest paint until the engine draws over it. */
export function PosterImage({ hidden, imgRef }: { hidden?: boolean; imgRef?: Ref<HTMLImageElement> }) {
  return <img ref={imgRef} className="world-frame__poster" src={POSTER_SRC} alt="" data-hidden={hidden} width={1600} height={952} decoding="async" fetchPriority="high" />;
}
