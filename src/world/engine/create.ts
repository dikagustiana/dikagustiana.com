/**
 * createWorld: the engine's one entry (mega prompt §4.2).
 *
 * Nothing happens at import: no theme read, no renderer, no warm-up, no
 * element looked up by id. createWorld(container, options) does all of it,
 * in this order:
 * theme → context → ground → the layout's builders (Phase D) → warm-up →
 * view → frame loop, and hands back a handle whose dispose() leaves no
 * listener, no loop, no WebGL context and no module-level reference behind.
 */
import * as THREE from 'three';
import { createRng, DEFAULT_SEED } from './kernel/math';
import { createTheme } from './theme';
import { createContext, type EngineContext } from './context';
import { createClock, STEP, WARMUP_SECONDS } from './sim/clock';
import { buildSlab } from './world/ground';
import { createView, type View } from './view';
import { VIEW_NAMES, type Entity, type FrameReading, type LayerName, type OverlayName, type RendererLike, type ViewName, type WorldHandle, type WorldOptions } from './types';
import type { FlowWeight, ModelStatus, StationBinding, WhiteboardContent } from '@/world/data/types';
import { buildWorldScene, type WorldScene } from '@/world/world/build';
import { countInWords, createFlows, type FlowSystem } from '@/world/sim/flows';
import { createActivity, type Activity } from '@/world/sim/activity';
import { createMarks, type Marks } from './marks';
import { createChain, type Chain } from './chain';
import { createStations, type Stations } from './stations';

export { WARMUP_SECONDS };

/** The most simulated time one frame runs, in seconds. */
const FRAME_MAX = 0.25;

export class WorldError extends Error {
  constructor(readonly code: 'webgl-unavailable' | 'no-container', message: string) { super(message); this.name = 'WorldError'; }
}

interface DebugApi {
  step(seconds: number): void;
  /** Hold the simulation (the view still draws), so a test can point at a vehicle where it stands. */
  pause(on: boolean): void;
  skip(hours: number): void;
  select(id: string): void;
  selected(): string | null;
  screenOf(id: string): [number, number] | null;
  look(x: number, y: number, zoom: number): void;
  /** Centre the camera on an entity at a zoom in pixels per metre, at once (the probe sets each band with it). */
  centre(id: string, zoom: number): void;
  view(name: string): void;
  /** Every entity: its id, kind and card status, and a vehicle's facts (origin, destination, load, state). */
  all(): { id: string; kind: string; status: string; facts?: Record<string, string | number> }[];
  /** The flows' state: live vehicles and the cap, how many flows and cached routes, the fleet's draw calls. */
  flows(): { live: number; cap: number; flows: number; routes: number; instanced: number };
  /** The activity's state: how many of each kind stand in the world, its own time, and the clock's hour. */
  activity(): { counts: Record<string, number>; time: number; hour: number; night: number; families: Record<string, [number, number]>; litBlocks: number };
  drawCalls(): number;
  /** The distance control's reading of the camera, 0 at home and 1 at the near view. */
  distance(): number;
  /** What the pointer is over, as the hover label shows it. */
  hovered(): { id: string; kind: string; label: string } | null;
  /** Hover the thing at a canvas point now, as the pointer would. */
  hoverAt(px: number, py: number): { id: string; kind: string; label: string } | null;
  /** The camera's zoom, in screen pixels per metre (scripts/world/probe.mjs reads it). */
  zoom(): number;
  /** The band of detail the zoom is in (PRD v2 §3.3). */
  band(): string;
  /** How many text meshes the registry holds (the view hides small text through it): a redraw must not grow it. */
  textMeshes(): number;
  /** Whether an entity's first group is rendered: it and every ancestor visible (the LOD and the layers hide whole groups). */
  visible(id: string): boolean;
  /** One frame of the view by hand (the camera easing, the LOD switch, the peeks), dt in seconds; tests drive it where no animation frame runs. */
  tick(dt: number): void;
  statuses(): Record<string, ModelStatus>;
  /** Codes in the lit chain, the selected one first. */
  chain(): string[];
  chainDrawn(): { measured: number; expected: number; routes: number; outlined: number; dimmed: number; offset: number };
  expose(ticker: string, bindings?: StationBinding[], whiteboard?: WhiteboardContent | null): void;
  exposed(): { ticker: string; placed: Record<string, string>; lit: string | null } | null;
  dispose(): void;
}
declare global { interface Window { world?: DebugApi } }

export function createWorld(container: HTMLElement, options: WorldOptions): WorldHandle {
  if (!container) throw new WorldError('no-container', 'createWorld needs a container element');
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- the canvas and the renderer ----
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.tabIndex = 0;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
  container.append(canvas);
  let renderer: RendererLike;
  try {
    renderer = options.createRenderer ? options.createRenderer(canvas) : new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    canvas.remove();
    throw new WorldError('webgl-unavailable', `This figure needs WebGL, which this browser has turned off (${String(err)})`);
  }
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2));
  renderer.setClearColor(0x000000, 0);
  const WORLD = options.layout.world;
  // Anything outside the world's slab is cut, so traffic slides in and out of the plate's edge.
  renderer.clippingPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -WORLD.x0 + 0.05), new THREE.Plane(new THREE.Vector3(-1, 0, 0), WORLD.x1 + 0.05),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -WORLD.y0 + 0.05), new THREE.Plane(new THREE.Vector3(0, 0, -1), WORLD.y1 + 0.05)];

  // ---- theme and context ----
  const read = (token: string) => (typeof getComputedStyle === 'function' ? getComputedStyle(container).getPropertyValue(token) : '');
  const theme = createTheme(read);
  const rng = createRng(options.seed ?? DEFAULT_SEED);
  // one probe for a 2D canvas (text textures); a headless test environment has none and the text is left out
  const text2d = (() => { try { return !!document.createElement('canvas').getContext('2d'); } catch { return false; } })();
  const ctx: EngineContext = createContext({ rng, theme, layout: options.layout, font: options.theme.font, reduced, debug: !!options.debug, text2d });
  ctx.gfx.aniso = renderer.capabilities.getMaxAnisotropy();
  const clock = createClock();

  // ---- assemble, in a fixed order (the rng is drawn while building, so the order decides what the world looks like) ----
  ctx.scene.add(buildSlab(ctx));
  const world: WorldScene = buildWorldScene(ctx, options.layout, (a) => options.onAction?.(a));
  const flows: FlowSystem = createFlows(ctx, options.layout, options.registry.links, { phone: !!options.reducedDetail });
  // a gate's card counts the flows that cross it, in words (PRD v2 §3.11)
  ctx.flowsAt = (gateId) => { const n = flows.flowsThrough(gateId); const w = countInWords(n); return n ? `${w[0].toUpperCase()}${w.slice(1)} ${n === 1 ? 'flow crosses' : 'flows cross'} it` : 'No flow crosses it'; };

  // every family's activity, the lamps along the roads and the night's fires (PRD v2 §3.7, §3.8)
  const activity: Activity = createActivity(ctx, options.layout, world.sites, { phone: !!options.reducedDetail, busyGates: () => flows.busyGates() });

  // ---- the simulation step ----
  const systems: { update(dt: number): void }[] = [flows, activity];
  const stepOnce = (dt: number) => {
    clock.t += dt;
    for (const s of systems) s.update(dt);
    for (const e of ctx.entities) e.update?.(dt);
  };
  const warmup = options.warmupSeconds ?? WARMUP_SECONDS;
  for (let t = 0; t < warmup; t += STEP) stepOnce(STEP);

  // ---- the view ----
  const view: View = createView(ctx, {
    container, canvas, renderer, clock, reducedDetail: !!options.reducedDetail,
    onSelect: options.onSelect,
    onHover: options.onHover,
    onDetail: (tiny, far) => { world.nearGroup.visible = !far; flows.setDetail(tiny, far); activity.setDetail(tiny, far); },
  });
  if (options.initialView && options.initialView !== 'hero') view.lookAt(options.initialView);
  const marks: Marks = createMarks(ctx, (a) => options.onAction?.(a));
  // the chain lights the roads its links' goods take (PRD v2 §3.9): the flows know the lots and the routes
  const chain: Chain = createChain(ctx, options.registry.links, { routesOf: (a, b) => flows.routesOf(a, b), lotsOf: (c) => flows.lotsOf(c) });
  const stations: Stations = createStations(ctx);

  // ---- state the shell sets through the handle; Phase E–G give them their effects ----
  let overlay: OverlayName = 'none';
  const layers = new Map<LayerName, boolean>();
  let statuses = new Map<string, ModelStatus>();
  let exposed: { ticker: string; stations: readonly StationBinding[] } | null = null;

  // ---- the loop ----
  const subscribers = new Set<(r: FrameReading) => void>();
  let paused = false, last = typeof performance !== 'undefined' ? performance.now() : 0, acc = 0, raf: number | null = null, disposed = false;
  const reported = new Set<string>();
  const reading = (): FrameReading => ({ clock: clock.clock(clock.t), night: clock.night(), readout: view.selected()?.readout() ?? 'nothing selected', paused, view: view.currentView(), zoom: view.camera.zoom, distance: view.distanceOf(), band: view.band() });
  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    try { tick(now); } catch (err) { const k = String(err instanceof Error ? err.stack : err); if (!reported.has(k)) { reported.add(k); console.error('world frame error', err); } }
  }
  function tick(now: number) {
    // a slow frame runs up to a quarter of a second of the world, so a slow device keeps near real time (a hidden tab does not burst)
    const dt = Math.max(0, Math.min(FRAME_MAX, (now - last) / 1000)); last = Math.max(last, now);
    advance(dt);
  }
  /** One frame of dt seconds: the world's steps, the camera, the marks; the debug API's tick runs it with an exact dt. */
  function advance(dt: number) {
    if (!paused) { acc += dt; while (acc >= STEP) { stepOnce(STEP); acc -= STEP; } }
    if (clock.shift.h < clock.shift.goal) clock.shift.h = Math.min(clock.shift.goal, clock.shift.h + dt * (reduced ? 60 : 5));
    activity.draw();
    view.tick(dt, paused);
    marks.update(view.camera.zoom);
    chain.update(view.camera.zoom, paused ? 0 : dt);
    stations.update(view.camera.zoom);
    if (exposed && view.selected()?.id !== exposed.ticker) { exposed = null; stations.clear(); }
    if (subscribers.size) { const r = reading(); for (const fn of subscribers) fn(r); }
  }
  const find = (id: string | null) => (id ? ctx.entities.find((e) => e.id === id) ?? null : null);

  const handle: WorldHandle = {
    select: (id) => view.select(find(id)),
    selected: () => view.selected()?.id ?? null,
    lookAt: (name) => view.lookAt(name),
    setDistance: (t) => view.setDistance(t),
    setOverlay: (name) => { overlay = name; if (name === 'none') marks.set([]); },
    setMarks: (list) => marks.set(list),
    setLayer: (name, on) => { layers.set(name, on); flows.setLayer(name, on); activity.setLayer(name, on); },
    setModelStatus: (s) => { statuses = s; world.setStatuses(s); },
    setFlowWeights: (weights: FlowWeight[]) => { flows.setFlows(weights); chain.setFlows(weights); },
    highlightChain: (id, depth) => {
      chain.set(id, depth);
      // the full chain refits the camera to what is lit, at the district band (PRD v2 §3.9)
      const b = depth === 'all' && id ? chain.bounds() : null;
      if (b) view.frame(b);
    },
    setHighlight: (ids) => view.setHighlight(ids),
    exposeCompany: (ticker, bindings, whiteboard = null) => {
      const plot = world.lots.get(ticker.toUpperCase()), arch = world.archetypeOf(ticker);
      if (!plot || !arch) { exposed = null; stations.clear(); return; }
      exposed = { ticker: ticker.toUpperCase(), stations: bindings };
      plot.setWhiteboard(whiteboard);
      // the plot opens as a section while selected (the view's peek), and its stations are marked
      view.select(plot);
      stations.expose(arch, plot.box, bindings);
    },
    lightStation: (lineId) => stations.light(lineId),
    pause: (on) => { paused = on; },
    subscribe: (fn) => { subscribers.add(fn); return () => { subscribers.delete(fn); }; },
    step: (seconds) => { for (let t = 0; t < seconds; t += STEP) stepOnce(STEP); },
    dispose,
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    subscribers.clear();
    marks.dispose();
    chain.dispose();
    view.dispose();
    flows.dispose(); ctx.flowsAt = undefined; activity.dispose();
    ctx.scene.traverse((o) => disposeObject(o));
    ctx.sky.traverse((o) => disposeObject(o));
    ctx.scene.clear(); ctx.sky.clear();
    theme.dispose();
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch { /* a fake renderer, or a context already lost */ }
    canvas.remove();
    ctx.entities.length = 0; ctx.peeks.length = 0; ctx.texts.meshes.length = 0; systems.length = 0;
    statuses = new Map(); exposed = null; layers.clear(); stations.dispose();
    if (options.debug && typeof window !== 'undefined' && window.world?.dispose === dispose) delete window.world;
  }

  if (options.debug && typeof window !== 'undefined') {
    window.world = {
      step: handle.step,
      pause: handle.pause,
      skip: (hours) => { clock.shift.goal += hours; clock.shift.h = clock.shift.goal; },
      select: (id) => handle.select(id), selected: handle.selected,
      screenOf: (id) => { const e = find(id); return e ? view.screenOf(e) : null; },
      look: (x, y, k) => view.look(x, y, k),
      centre: (id, k) => { const e = find(id); if (e) view.lookAtEntity(e, k); },
      view: (name) => { if ((VIEW_NAMES as readonly string[]).includes(name)) view.lookAt(name as ViewName); },
      band: () => view.band(),
      textMeshes: () => ctx.texts.meshes.length,
      hovered: () => view.hovered(),
      hoverAt: (px, py) => view.hoverAt(px, py),
      all: () => ctx.entities.map((e: Entity) => { const facts = e.facts?.(); return facts ? { id: e.id, kind: e.kind, status: e.info().status, facts } : { id: e.id, kind: e.kind, status: e.info().status }; }),
      activity: () => ({ counts: activity.counts(), time: activity.time(), hour: clock.hourAt(clock.t), night: clock.night(), families: activity.families(), litBlocks: activity.litBlocks().size }),
      flows: () => ({ live: flows.live(), cap: flows.cap(), flows: flows.flows().length, routes: flows.roads.cached(), instanced: ctx.scene.getObjectByName('flows') ? flows.vehicles().length : 0 }),
      drawCalls: () => view.drawCalls(),
      distance: () => view.distanceOf(),
      zoom: () => view.camera.zoom,
      visible: (id) => { const e = find(id); const g = e?.groups[0]; if (!g) return false; for (let o: THREE.Object3D | null = g; o; o = o.parent) if (!o.visible) return false; return true; },
      // an exact dt, not one read back from the clock: a seed and a number of frames always give the same world
      tick: (dt) => { last += dt * 1000; advance(Math.max(0, Math.min(FRAME_MAX, dt))); },
      statuses: () => Object.fromEntries(statuses),
      chain: () => chain.codes(),
      chainDrawn: () => ({ ...chain.drawn(), dimmed: chain.dimmed(), offset: chain.offset() }),
      expose: (ticker, bindings = [], whiteboard = null) => handle.exposeCompany(ticker, bindings, whiteboard),
      exposed: () => (exposed ? { ticker: exposed.ticker, placed: Object.fromEntries(stations.placed()), lit: stations.lit() } : null),
      dispose,
    };
  }
  // the overlay is read by the shell's marks (setMarks); the layers by the flows
  void overlay;

  options.onReady?.();
  raf = requestAnimationFrame(frame);
  return handle;
}

function disposeObject(o: THREE.Object3D) {
  const m = o as THREE.Mesh;
  if (m.geometry) m.geometry.dispose();
  const mat = m.material as THREE.Material | THREE.Material[] | undefined;
  if (mat) for (const x of Array.isArray(mat) ? mat : [mat]) { const t = (x as THREE.MeshBasicMaterial).map; if (t) t.dispose(); x.dispose(); }
}
