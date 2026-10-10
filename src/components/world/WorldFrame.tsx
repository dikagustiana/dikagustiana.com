/**
 * The frame (PRD §7.1, §7.3, §7.11, §7.14; mega prompt §6.4): the header with
 * the place buttons, the distance control, the shift overlay, the layer
 * toggles, search and the Skema toggle; the stage, which shows the poster
 * first and mounts the engine lazily after first paint or on the first
 * interaction; the reading strip at the bottom edge; the card dock; and the
 * board host. Under reduced motion it renders the schematic and one line.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChainPlate } from '@/components/industry-chain/ChainPlate';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { prefersReducedMotion } from '@/lib/motion';
import { CANVAS_DESCRIPTION, DEFAULT_LAYERS, GOODS_WORD, LAYERS, OVERLAYS, REDUCED_NOTE, REGION_VIEW, STORIES, WORLD_PATH, boardPath, coverageLine, storyById } from '@/lib/world/constants';
import { marksFor, type PlacedMark } from '@/lib/world/presentation';
import { REGISTRY, subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import { bindingsFrom } from '@/world/data/boundary';
import { archetypeForZone, stationFor } from '@/world/interiors/stations';
import { whiteboardFor } from '@/lib/world/whiteboard';
import type { StationBinding, WhiteboardContent } from '@/world/data/types';
import { JOINT_BY_ID, STATUS, type JointId, type LensId, type ShiftId } from '@/data/industryChain';
import type { FollowReading, FrameReading, Hover, LitHop, OverlayName, Selection, ViewName, WorldHandle, WorldAction, WorldMark } from '@/world/engine/types';
import { Card } from './Card';
import { FrameHeader, PHONE_QUERY, PosterImage, type FrameControls } from './FrameShell';
import { Search } from './Search';
import { useWorldData } from './useWorldData';
import { usePieces } from './usePieces';
import './frame.css';
import './world.css';

const Board = lazy(() => import('./Board'));

/** What the strip says Follow is doing (PRD v2 §3.10). */
/** A hop's place in words (counts are words where a visitor reads them); a story has seven hops at most. */
const HOP_WORD = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const FOLLOW_WORD: Record<FollowReading['mode'], string> = { ride: 'Riding a vehicle', glide: 'Along the route (nothing drives it)', stop: 'At the bay', end: 'The ride has ended' };
const ThinkTank = lazy(() => import('./ThinkTank'));

export interface WorldFrameProps {
  variant: 'preview' | 'full';
  heading: 'h1' | 'h2';
  /** The company whose board is open, from the route. */
  boardTicker?: string | null;
  /** Called when the board should open or close; the route owns that state. */
  onBoard?: (ticker: string | null) => void;
}

export default function WorldFrame({ variant, heading, boardTicker = null, onBoard }: WorldFrameProps) {
  const phone = useMediaQuery(PHONE_QUERY);
  const reduced = prefersReducedMotion();
  const navigate = useNavigate();
  const data = useWorldData();
  const pieces = usePieces();
  const [skema, setSkema] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hovered, setHovered] = useState<Hover | null>(null);
  const [mark, setMark] = useState<{ shift: ShiftId; targetId: string } | null>(null);
  const [overlay, setOverlay] = useState<OverlayName>('none');
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [distance, setDistance] = useState(0);
  const [reading, setReading] = useState<FrameReading | null>(null);
  const [view, setView] = useState<ViewName | null>(null);
  const [thinkTank, setThinkTank] = useState(false);
  const [piece, setPiece] = useState<string | null>(null);
  const [fullChain, setFullChain] = useState(false);
  // the lit story (PRD v2 §3.10) and its hops as the engine lit them
  const [story, setStory] = useState<string | null>(null);
  const [hops, setHops] = useState<LitHop[]>([]);
  const storyRef = useRef(story); storyRef.current = story;
  // Follow (PRD v2 §3.10): the engine rides and reports; while it rides, its stops' selections keep the story lit
  const [following, setFollowing] = useState<FollowReading | null>(null);
  const followingRef = useRef(following); followingRef.current = following;
  const fullChainRef = useRef(fullChain); fullChainRef.current = fullChain;
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<WorldHandle | null>(null);
  const wanted = useRef(false);
  const lens: LensId = distance >= 0.5 ? 'finance' : 'economy';
  const shift = OVERLAYS.find((o) => o.overlay === overlay)?.shift ?? null;
  const shiftRef = useRef<ShiftId | null>(shift); shiftRef.current = shift;
  const marks: PlacedMark[] = useMemo(() => (shift ? marksFor(shift) : []), [shift]);
  /** The marks with a place in the world: a gate, a signpost or a region's label; layers and return vehicles are read from the strip. */
  const worldMarks: WorldMark[] = useMemo(() => marks.flatMap((m): WorldMark[] => {
    const form = STATUS[m.target.condition!.status].form;
    if (m.carrier.kind === 'gate' || m.carrier.kind === 'signpost') return [{ targetId: m.targetId, n: m.n, label: m.label, form, at: { kind: 'entity' as const, id: m.carrier.id } }];
    if (m.carrier.kind === 'region') return [{ targetId: m.targetId, n: m.n, label: m.label, form, at: { kind: 'region' as const, id: m.carrier.id } }];
    return [];
  }), [marks]);
  const dragging = useRef(false);

  const act = useCallback((a: WorldAction | { type: 'select'; id: string } | { type: 'open-piece'; slug: string } | { type: 'chain-depth'; full: boolean } | { type: 'story'; id: string | null } | { type: 'follow'; id: string | null }) => {
    if (a.type === 'open-board') { if (onBoard) onBoard(a.ticker); else navigate(boardPath(a.ticker)); }
    else if (a.type === 'open-index') navigate(`/finance/finance-in-action#sub-${a.code}`);
    else if (a.type === 'open-thinktank') setThinkTank(true);
    else if (a.type === 'select') { handle.current?.select(a.id); handle.current?.setDistance(0.75); setDistance(0.75); }
    else if (a.type === 'open-piece') { setPiece(a.slug); setThinkTank(true); }
    else if (a.type === 'open-condition') setMark(shift ? { shift, targetId: a.targetId } : null);
    else if (a.type === 'chain-depth') setFullChain(a.full);
    else if (a.type === 'story') { if (!a.id) handle.current?.follow(null); setStory(a.id); }
    // the canvas takes focus, so Space and Escape reach the ride
    else if (a.type === 'follow') { handle.current?.follow(a.id); host.current?.querySelector('canvas')?.focus(); }
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
        registry: REGISTRY, layout: LAYOUT, theme: { font }, initialView: 'hero', reducedDetail: phone,
        debug: typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'),
        onSelect: (sel) => { if (sel?.kind === 'whiteboard') { const t = sel.info.rows.find(([k]) => k === 'Ticker')?.[1]; if (t) act({ type: 'open-board', ticker: t }); return; } if (sel?.kind === 'mark') { const id = sel.info.rows.find(([k]) => k === 'Target')?.[1]; setSelection(null); setMark(id && shiftRef.current ? { shift: shiftRef.current, targetId: id } : null); return; } setSelection(sel); if (sel) setMark(null); if (sel?.kind === 'route') return; const f = followingRef.current; if (f && f.mode !== 'end') return; if (sel && storyRef.current && ['building', 'company', 'vehicle'].includes(sel.kind)) setStory(null); handle.current?.highlightChain(sel && (sel.kind === 'building' || sel.kind === 'company' || sel.kind === 'vehicle') ? sel.id : null, sel?.kind === 'vehicle' ? 1 : fullChainRef.current ? 'all' : 1); },
        onHover: setHovered,
        // the ref at once: the engine reports a ride before it closes the last stop's card, and that selection must keep the story lit
        onFollow: (f) => { followingRef.current = f; setFollowing(f); if (f?.story && f.story !== storyRef.current) setStory(f.story); },
        onAction: act,
        onReady: () => setReady(true),
      });
      handle.current = h;
      const canvas = host.current.querySelector('canvas');
      if (canvas) { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', CANVAS_DESCRIPTION); }
      h.subscribe((r) => { setReading((prev) => (prev && prev.clock === r.clock && prev.readout === r.readout && prev.view === r.view && Math.abs(prev.night - r.night) < 0.05 ? prev : r)); setView(r.view); if (!dragging.current) setDistance((d) => (Math.abs(d - r.distance) > 0.02 ? r.distance : d)); });
      for (const l of LAYERS) h.setLayer(l.layer, layers[l.layer]);
    } catch (e) { setFailed(e instanceof Error ? e.message : String(e)); }
  }, [act, layers, phone, reduced, skema]);

  // The engine mounts after first paint (PRD §7.1): once the poster has
  // loaded (so the two never compete for the connection), the stage is in
  // view, and the main thread is idle; or on the first pointer or keyboard
  // interaction with the stage, whichever comes first.
  useEffect(() => {
    if (reduced || skema || !host.current) return;
    // On a phone the world starts on the first touch or key (the poster stays until then): a phone's main thread
    // cannot absorb the engine's build behind the page's largest paint (gate 2, D15); a wide screen starts after it.
    if (phone) return;
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
  }, [mount, reduced, skema, phone]);
  useEffect(() => () => { handle.current?.dispose(); handle.current = null; wanted.current = false; }, []);
  useEffect(() => { if (skema) { handle.current?.dispose(); handle.current = null; wanted.current = false; setReady(false); } }, [skema]);

  // data into the engine
  useEffect(() => { if (ready && handle.current) { handle.current.setModelStatus(data.statuses); handle.current.setFlowWeights(data.flows); } }, [ready, data.statuses, data.flows]);
  useEffect(() => { handle.current?.setOverlay(overlay); if (ready) handle.current?.setMarks(worldMarks); }, [overlay, ready, worldMarks]);
  useEffect(() => { if (ready && selection && (selection.kind === 'building' || selection.kind === 'company')) handle.current?.highlightChain(selection.id, fullChain ? 'all' : 1); }, [fullChain, ready, selection]);
  useEffect(() => { if (ready && handle.current) for (const l of LAYERS) handle.current.setLayer(l.layer, layers[l.layer]); }, [layers, ready]);
  // the published flow classes arrive after the first paint: a lit story's hops are read again as the engine redrew them
  useEffect(() => { const h = handle.current; if (ready && h && storyRef.current) setHops(h.storyHops()); }, [ready, data.flows]);
  // a story lit clears the selection first (its chain would replace the story's), then lights end to end and frames it
  useEffect(() => {
    const h = handle.current; if (!ready || !h) return;
    const s = story ? storyById(story) ?? null : null;
    if (s) { h.select(null); setSelection(null); setMark(null); }
    setHops(h.lightStory(s));
  }, [ready, story]);
  // the exposed company (PRD §7.8): the board's company, or a selected company with a published model. Its cost
  // lines bind to the stations of its archetype (the package's, else its zone's fallback); the engine gets labels only.
  const exposedTicker = boardTicker?.toUpperCase() ?? (selection?.kind === 'company' && /^[A-Z]{4}$/.test(selection.id) ? selection.id : null);
  const bindings: StationBinding[] = useMemo(() => {
    if (!exposedTicker) return [];
    const pkg = data.packageFor(exposedTicker); if (!pkg) return [];
    const sub = REGISTRY.subIndustries.find((x) => x.companies.some((c) => c.ticker === exposedTicker));
    const archetype = data.statuses.get(exposedTicker)?.archetype ?? archetypeForZone(sub?.zone ?? 'unplaced');
    return bindingsFrom(pkg, (unit, desc) => stationFor(archetype, unit, desc));
  }, [exposedTicker, data]);
  const whiteboard: WhiteboardContent | null = useMemo(() => { const pkg = exposedTicker ? data.packageFor(exposedTicker) : null; return pkg && data.reg ? whiteboardFor(pkg, data.reg.packages) : null; }, [exposedTicker, data]);
  useEffect(() => { if (ready && exposedTicker && handle.current) { handle.current.exposeCompany(exposedTicker, bindings, whiteboard); if (boardTicker) { handle.current.setDistance(1); setDistance(1); } } }, [ready, exposedTicker, bindings, whiteboard, boardTicker]);

  const closeCard = () => { setSelection(null); setMark(null); handle.current?.select(null); host.current?.querySelector('canvas')?.focus(); };
  const night = reading?.night ?? 0;
  const controls: FrameControls = {
    place: (v) => handle.current?.lookAt(v),
    distance: (t) => { setDistance(t); handle.current?.setDistance(t); },
    dragging: (on) => { dragging.current = on; },
    overlay: (o) => { setOverlay(o); setMark(null); },
    layer: (name) => setLayers((s) => ({ ...s, [name]: !s[name] })),
    story: (id) => setStory(id),
    skema: () => setSkema(true),
  };

  const Stage = heading === 'h1' ? 'h3' : 'h4';

  if (reduced) {
    return (
      <div className="world-frame" data-world="reduced">
        <p className="world-coverage">{REDUCED_NOTE}</p>
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

  return (
    <div className="world-frame" data-world="on" data-ready={ready}>
      <FrameHeader heading={heading} variant={variant} phone={phone} coverage={coverageLine(data.state, data.covered)} view={view} ready={ready} distance={distance} overlay={overlay} layers={layers} stories={STORIES} story={story} on={controls}
        search={<Search pieces={pieces} onPick={(hit) => {
          if (hit.kind === 'piece') act({ type: 'open-piece', slug: hit.id });
          else if (hit.kind === 'story') act({ type: 'story', id: hit.id });
          else if (hit.kind === 'load') { const id = handle.current?.vehicleOn(hit.id); if (id) act({ type: 'select', id }); }
          else act({ type: 'select', id: hit.id });
        }} />} />
      <div className="world-frame__stage" onPointerDown={() => void mount()} onKeyDown={(e) => {
          void mount();
          // S lights the stories in turn, then none (PRD v2 §3.10)
          if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey && !e.altKey && (e.target as HTMLElement).classList?.contains('world-canvas')) { e.preventDefault(); setStory((s) => { const i = s ? STORIES.findIndex((x) => x.id === s) : -1; return i + 1 < STORIES.length ? STORIES[i + 1].id : null; }); return; }
          if (e.key === 'Enter' && selection && (e.target as HTMLElement).classList?.contains('world-canvas')) { e.preventDefault(); host.current?.parentElement?.querySelector<HTMLElement>('.world-card__title')?.focus(); } }}>
        <PosterImage hidden={ready} />
        <Stage className="sr-only">The map</Stage>
        <div className="world-frame__canvas-host" ref={host} data-ready={ready} />
        {/* the engine sinks the unlit world itself after dark, so its lights stay bright; the veil only finishes the tone */}
        <div className="world-frame__night" style={{ opacity: night * 0.25 }} aria-hidden="true" />
        {reading && <div className="world-frame__clock" aria-hidden="true">{reading.clock}{night > 0.5 ? ' · night' : ''}{reading.paused ? ' · paused' : ''}</div>}
        {failed && <p className="world-note" role="status">The world needs WebGL, which this browser has turned off. The poster stays; press Skema for the schematic.</p>}
        {phone && !ready && !failed && !wanted.current && <button type="button" className="world-btn world-frame__start" onClick={() => void mount()}>Start the world</button>}
        <Card selection={selection} mark={mark} story={story && !selection && !mark ? { story: storyById(story)!, hops, following: following?.story === story ? following.mode : null } : null} lens={lens} flows={data.flows} weights={data.weights} fullChain={fullChain} pieces={pieces} onClose={closeCard} onAction={act} />
        {boardTicker && (
          <Suspense fallback={<div className="world-board" role="status">Opening the board…</div>}>
            <Board ticker={boardTicker} data={data} pieces={pieces} bindings={bindings} onStation={(lineId) => handle.current?.lightStation(lineId)} onClose={() => { if (onBoard) onBoard(null); else navigate(WORLD_PATH); host.current?.querySelector('canvas')?.focus(); }} />
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
          {marks.map((m) => { const st = STATUS[m.target.condition!.status]; return <li key={m.targetId}><button type="button" aria-pressed={mark?.targetId === m.targetId} onClick={() => { setMark({ shift, targetId: m.targetId }); setSelection(null); const h = handle.current; if (!h) return; if (m.carrier.kind === 'gate' || m.carrier.kind === 'signpost') { h.select(m.carrier.id); h.setDistance(0.6); } else if (m.carrier.kind === 'region') { h.select(null); h.lookAt(REGION_VIEW[m.carrier.id] ?? 'hero'); } }}><span aria-hidden="true">{m.n}</span><span aria-hidden="true">{st.form === 'filled' ? '●' : st.form === 'open' ? '○' : '◌'}</span>{m.label} · {st.label}</button></li>; })}
        </ol>
      )}
      {story && hops.length > 0 && (
        <div className="world-frame__story" data-story={story}>
          <ol className="world-frame__strip" aria-label={`Story: ${storyById(story)?.title ?? story}, its hops in order`}>
            {hops.map((h, i) => <li key={`${h.from}>${h.to}`}><button type="button" aria-current={following?.story === story && following.hop === i && following.mode !== 'end' ? 'step' : undefined} onClick={() => handle.current?.frameHop(i)}><span aria-hidden="true">{i + 1}</span>{subIndustryByCode(h.from)?.nameEn ?? h.from} → {subIndustryByCode(h.to)?.nameEn ?? h.to} · {GOODS_WORD[h.goods]} · {h.joints.length ? `crosses ${h.joints.map((j) => JOINT_BY_ID[j as JointId]?.label ?? j).join(' and ')}` : 'crosses no joint'}</button></li>)}
          </ol>
          <div className="world-frame__follow">
            {following?.story === story && following.mode !== 'end'
              ? <><progress max={1} value={following.progress} aria-label="How far the ride has come" /><span role="status">{FOLLOW_WORD[following.mode]} · hop {HOP_WORD[following.hop + 1] ?? 'next'} of {HOP_WORD[following.hops] ?? 'many'}{following.mode === 'stop' ? ' · Space goes on' : ''}</span><button type="button" className="world-btn" onClick={() => act({ type: 'follow', id: null })}>Stop following</button></>
              : <button type="button" className="world-btn" onClick={() => act({ type: 'follow', id: `story:${story}` })}>{following?.story === story ? 'Follow again' : 'Follow'}</button>}
          </div>
        </div>
      )}
      <p className="sr-only">{CANVAS_DESCRIPTION}</p>
      {/* the hover label, else the selection's readout, read out as it changes (PRD v2 §3.4, §3.15) */}
      <p className="sr-only" aria-live="polite" data-world-readout="">{hovered?.label ?? (selection ? reading?.readout ?? selection.info.title : '')}</p>
    </div>
  );
}
