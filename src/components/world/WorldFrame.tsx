/**
 * The frame (PRD §7.1, §7.3, §7.11, §7.14; mega prompt §6.4): the header with
 * the place buttons, the distance control, the shift overlay, the layer
 * toggles, search and the Skema toggle; the stage, which shows the poster
 * first and mounts the engine lazily after first paint or on the first
 * interaction; the reading strip at the bottom edge; the card dock; and the
 * board host. Under reduced motion it renders the schematic and one line.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChainPlate } from '@/components/industry-chain/ChainPlate';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { prefersReducedMotion } from '@/lib/motion';
import { CANVAS_DESCRIPTION, LAYERS, OVERLAYS, PLACES, TITLE, TOTAL_PLACED, WORLD_PATH, boardPath } from '@/lib/world/constants';
import { marksFor, type PlacedMark } from '@/lib/world/presentation';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { STATUS, type LensId, type ShiftId } from '@/data/industryChain';
import type { FrameReading, LayerName, OverlayName, Selection, ViewName, WorldHandle, WorldAction } from '@/world/engine/types';
import { Card } from './Card';
import { Search } from './Search';
import { useWorldData } from './useWorldData';
import { usePieces } from './usePieces';
import './world.css';

const Board = lazy(() => import('./Board'));
const ThinkTank = lazy(() => import('./ThinkTank'));

export interface WorldFrameProps {
  variant: 'preview' | 'full';
  heading: 'h1' | 'h2';
  /** The company whose board is open, from the route. */
  boardTicker?: string | null;
  /** Called when the board should open or close; the route owns that state. */
  onBoard?: (ticker: string | null) => void;
}

const DEFAULT_LAYERS: Record<LayerName, boolean> = { logistics: true, 'cold-chain': false, credit: false, energy: false, governance: false, regulation: false };

export default function WorldFrame({ variant, heading, boardTicker = null, onBoard }: WorldFrameProps) {
  const H = heading;
  const phone = useMediaQuery('(max-width: 640px)');
  const reduced = prefersReducedMotion();
  const navigate = useNavigate();
  const data = useWorldData();
  const pieces = usePieces();
  const [skema, setSkema] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mark, setMark] = useState<{ shift: ShiftId; targetId: string } | null>(null);
  const [overlay, setOverlay] = useState<OverlayName>('none');
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [distance, setDistance] = useState(0);
  const [reading, setReading] = useState<FrameReading | null>(null);
  const [view, setView] = useState<ViewName | null>(null);
  const [thinkTank, setThinkTank] = useState(false);
  const [piece, setPiece] = useState<string | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<WorldHandle | null>(null);
  const wanted = useRef(false);
  const lens: LensId = distance >= 0.5 ? 'finance' : 'economy';
  const shift = OVERLAYS.find((o) => o.overlay === overlay)?.shift ?? null;
  const marks: PlacedMark[] = useMemo(() => (shift ? marksFor(shift) : []), [shift]);

  const act = useCallback((a: WorldAction | { type: 'select'; id: string } | { type: 'open-piece'; slug: string }) => {
    if (a.type === 'open-board') { if (onBoard) onBoard(a.ticker); else navigate(boardPath(a.ticker)); }
    else if (a.type === 'open-index') navigate(`/finance/finance-in-action#sub-${a.code}`);
    else if (a.type === 'open-thinktank') setThinkTank(true);
    else if (a.type === 'select') { handle.current?.select(a.id); handle.current?.setDistance(0.75); setDistance(0.75); }
    else if (a.type === 'open-piece') { setPiece(a.slug); setThinkTank(true); }
    else if (a.type === 'open-condition') setMark(shift ? { shift, targetId: a.targetId } : null);
  }, [navigate, onBoard, shift]);

  // mount the engine lazily: after first paint, or on the first pointer or keyboard interaction, whichever first
  const mount = useCallback(async () => {
    if (wanted.current || reduced || skema || !host.current) return;
    wanted.current = true;
    try {
      const [{ createWorld }, { LAYOUT }] = await Promise.all([import('@/world/engine'), import('@/world/placement/layout.generated')]);
      if (!host.current) return;
      const font = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif';
      const h = createWorld(host.current, {
        registry: REGISTRY, layout: LAYOUT, theme: { font }, initialView: phone ? 'estate' : 'whole', reducedDetail: phone,
        debug: typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'),
        onSelect: (sel) => { setSelection(sel); if (sel) setMark(null); },
        onAction: act,
        onReady: () => setReady(true),
      });
      handle.current = h;
      const canvas = host.current.querySelector('canvas');
      if (canvas) { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', CANVAS_DESCRIPTION); }
      h.subscribe((r) => { setReading((prev) => (prev && prev.clock === r.clock && prev.readout === r.readout && prev.view === r.view && Math.abs(prev.night - r.night) < 0.05 ? prev : r)); setView(r.view); });
      for (const l of LAYERS) h.setLayer(l.layer, layers[l.layer]);
    } catch (e) { setFailed(e instanceof Error ? e.message : String(e)); }
  }, [act, layers, phone, reduced, skema]);

  // The engine mounts after first paint (PRD §7.1): once the poster has
  // loaded (so the two never compete for the connection), the stage is in
  // view, and the main thread is idle; or on the first pointer or keyboard
  // interaction with the stage, whichever comes first.
  useEffect(() => {
    if (reduced || skema || !host.current) return;
    const stage = host.current.parentElement!;
    const poster = stage.querySelector('img');
    let idle: number | ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const whenIdle = () => { idle = typeof requestIdleCallback === 'function' ? requestIdleCallback(() => { if (!cancelled) void mount(); }, { timeout: 2000 }) : setTimeout(() => { if (!cancelled) void mount(); }, 0); };
    // The poster is the page's largest paint: the engine's build, one long
    // task, waits until the browser has reported that paint (the first
    // largest-contentful-paint entry, or 3 s if the browser reports none),
    // then two frames more, so the build can never delay it.
    let po: PerformanceObserver | null = null, fallback: ReturnType<typeof setTimeout> | null = null;
    const twoFrames = () => requestAnimationFrame(() => requestAnimationFrame(() => { if (!cancelled) whenIdle(); }));
    const afterPaint = () => {
      const go = () => { if (cancelled) return; po?.disconnect(); po = null; if (fallback) { clearTimeout(fallback); fallback = null; } twoFrames(); };
      try { po = new PerformanceObserver(() => go()); po.observe({ type: 'largest-contentful-paint', buffered: true }); fallback = setTimeout(go, 3000); }
      catch { twoFrames(); }
    };
    const whenLoaded = () => { if (!poster || poster.complete) afterPaint(); else poster.addEventListener('load', afterPaint, { once: true }); };
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') { io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io?.disconnect(); io = null; whenLoaded(); } }, { rootMargin: '200px' }); io.observe(stage); }
    else whenLoaded();
    return () => { cancelled = true; io?.disconnect(); po?.disconnect(); if (fallback) clearTimeout(fallback); poster?.removeEventListener('load', afterPaint); if (idle !== null) { if (typeof cancelIdleCallback === 'function' && typeof idle === 'number') cancelIdleCallback(idle); else clearTimeout(idle as ReturnType<typeof setTimeout>); } };
  }, [mount, reduced, skema]);
  useEffect(() => () => { handle.current?.dispose(); handle.current = null; wanted.current = false; }, []);
  useEffect(() => { if (skema) { handle.current?.dispose(); handle.current = null; wanted.current = false; setReady(false); } }, [skema]);

  // data into the engine
  useEffect(() => { if (ready && handle.current) { handle.current.setModelStatus(data.statuses); handle.current.setFlowWeights(data.flows); } }, [ready, data.statuses, data.flows]);
  useEffect(() => { handle.current?.setOverlay(overlay); }, [overlay, ready]);
  useEffect(() => { if (ready && handle.current) for (const l of LAYERS) handle.current.setLayer(l.layer, layers[l.layer]); }, [layers, ready]);
  // the board's company is selected and exposed when the route names it
  useEffect(() => { if (ready && boardTicker && handle.current) { handle.current.select(boardTicker.toUpperCase()); handle.current.setDistance(1); setDistance(1); } }, [ready, boardTicker]);

  const closeCard = () => { setSelection(null); setMark(null); handle.current?.select(null); host.current?.querySelector('canvas')?.focus(); };
  const toggleLayer = (name: LayerName) => setLayers((s) => ({ ...s, [name]: !s[name] }));
  const onDistance = (t: number) => { setDistance(t); handle.current?.setDistance(t); };
  const night = reading?.night ?? 0;

  const headerTitle = <H className="text-2xl font-display font-semibold tracking-tight">{TITLE}</H>;
  const Sub = heading === 'h1' ? 'h2' : 'h3';
  const Stage = heading === 'h1' ? 'h3' : 'h4';

  if (reduced) {
    return (
      <div className="world-frame" data-world="reduced">
        <p className="world-coverage">A living version of this map exists; it is not shown while your system asks for reduced motion.</p>
        <ChainPlate variant={variant} heading={heading} />
      </div>
    );
  }
  if (skema) {
    return (
      <div className="world-frame" data-world="skema">
        <div className="world-frame__controls"><button type="button" className="world-btn" aria-pressed={true} onClick={() => setSkema(false)}>Skema</button><span className="world-coverage">The schematic. Press Skema again for the world.</span></div>
        <ChainPlate variant={variant} heading={heading} />
      </div>
    );
  }

  const places: ReactNode = PLACES.map((p) => <button key={p.view} type="button" className="world-btn" aria-current={view === p.view || (p.view === 'whole' && view === null && ready)} title={`${p.label} (${p.key})`} onClick={() => handle.current?.lookAt(p.view)}>{p.label}</button>);

  return (
    <div className="world-frame" data-world="on" data-ready={ready}>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          {headerTitle}
          <p className="world-coverage" aria-live="polite">
            {data.state === 'loading' ? 'Reading the published models…' : data.state === 'outage' ? 'Model status unavailable' : `${data.covered} of ${TOTAL_PLACED} sub-industries have a published model`}
          </p>
        </div>
        <Sub className="sr-only">Controls</Sub>
        <div className="world-frame__controls">
          {phone ? <details className="world-frame__group"><summary className="world-btn">Places</summary><div className="world-frame__group">{places}</div></details> : <div className="world-frame__group" aria-label="Places"><span>Places</span>{places}</div>}
          <div className="world-frame__group" aria-label="Zoom"><button type="button" className="world-btn" aria-label="Zoom in" onClick={() => { onDistance(Math.min(1, distance + 0.15)); }}>+</button><button type="button" className="world-btn" aria-label="Zoom out" onClick={() => { onDistance(Math.max(0, distance - 0.15)); }}>−</button></div>
          <label className="world-distance"><span className="text-muted-foreground">Economy</span><input type="range" min={0} max={1} step={0.01} value={distance} aria-label="Distance: economy to finance" onChange={(e) => onDistance(Number(e.target.value))} /><span className="text-muted-foreground">Finance</span></label>
          <div className="world-frame__group" role="radiogroup" aria-label="Shift overlay"><span>Shift</span>{OVERLAYS.map((o) => <button key={o.overlay} type="button" role="radio" className="world-btn" aria-checked={overlay === o.overlay} onClick={() => { setOverlay(o.overlay); setMark(null); }}>{o.label}</button>)}</div>
          <div className="world-frame__group" aria-label="Layers"><span>Layers</span>{LAYERS.map((l) => <button key={l.layer} type="button" className="world-btn" aria-pressed={layers[l.layer]} onClick={() => toggleLayer(l.layer)}>{l.label}</button>)}</div>
          <Search pieces={pieces} onPick={(hit) => { if (hit.kind === 'piece') act({ type: 'open-piece', slug: hit.id }); else act({ type: 'select', id: hit.id }); }} />
          <button type="button" className="world-btn" aria-pressed={false} onClick={() => setSkema(true)}>Skema</button>
          {variant === 'preview' && <a className="world-btn" href={WORLD_PATH}>Open the world</a>}
        </div>
      </header>
      <div className="world-frame__stage" onPointerDown={() => void mount()} onKeyDown={() => void mount()}>
        <img className="world-frame__poster" src="/world/poster-far.svg" alt="" data-hidden={ready} width={1600} height={952} decoding="async" fetchPriority="high" />
        <Stage className="sr-only">The map</Stage>
        <div className="world-frame__canvas-host" ref={host} data-ready={ready} />
        <div className="world-frame__night" style={{ opacity: night * 0.55 }} aria-hidden="true" />
        {reading && <div className="world-frame__clock" aria-hidden="true">{reading.clock}{night > 0.5 ? ' · night' : ''}{reading.paused ? ' · paused' : ''}</div>}
        {failed && <p className="world-note" role="status">The world needs WebGL, which this browser has turned off. The poster stays; press Skema for the schematic.</p>}
        <Card selection={selection} mark={mark} lens={lens} flows={data.flows} pieces={pieces} onClose={closeCard} onAction={act} />
        {boardTicker && (
          <Suspense fallback={<div className="world-board" role="status">Opening the board…</div>}>
            <Board ticker={boardTicker} data={data} pieces={pieces} onClose={() => { if (onBoard) onBoard(null); else navigate(WORLD_PATH); host.current?.querySelector('canvas')?.focus(); }} />
          </Suspense>
        )}
        {thinkTank && (
          <Suspense fallback={<div className="world-board" role="status">Opening the think tank…</div>}>
            <ThinkTank pieces={pieces} piece={piece} onPiece={(slug) => { setPiece(slug); const p = pieces.find((x) => x.slug === slug); handle.current?.highlightChain('', 1); handle.current?.setHighlight(p?.tags ?? []); }} onClose={() => { setThinkTank(false); setPiece(null); handle.current?.setHighlight([]); }} onSelect={(id) => act({ type: 'select', id })} />
          </Suspense>
        )}
      </div>
      {shift && (
        <ol className="world-frame__strip" aria-label="Reading strip: the marks of this shift in argument order">
          {marks.map((m) => { const st = STATUS[m.target.condition!.status]; return <li key={m.targetId}><button type="button" aria-pressed={mark?.targetId === m.targetId} onClick={() => { setMark({ shift, targetId: m.targetId }); setSelection(null); if (m.carrier.kind === 'gate' || m.carrier.kind === 'signpost') handle.current?.select(m.carrier.id); }}><span aria-hidden="true">{m.n}</span><span aria-hidden="true">{st.form === 'filled' ? '●' : st.form === 'open' ? '○' : '◌'}</span>{m.label} · {st.label}</button></li>; })}
        </ol>
      )}
      <p className="sr-only">{CANVAS_DESCRIPTION}</p>
    </div>
  );
}
