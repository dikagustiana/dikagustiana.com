// Original to this repository (Kawasan Industri world engine, fallback kernel).
/**
 * The view: the camera, the visitor's hands on it, and the frame.
 *
 * The camera is orthographic and never turns. It looks down the isometric
 * diagonal (from the south-east, above), so world +x runs down-right on
 * screen and +y down-left, the projection the poster is drawn with. Its zoom
 * is in screen pixels per metre: at zoom z a sprite scaled 22 / z is 22
 * pixels tall whatever the distance, which is how the sky's markers keep
 * their size.
 *
 * Distance is the slider's reading of the zoom: 0 at the hero, the home view
 * (PRD v2 §3.1: the estate with the ring's near arc and the gateway's first
 * blocks, at no less than 1.25 px/m on a wide stage and 1 px/m on a phone),
 * and 1 at the near view, on a log scale between the two, so every step of the
 * slider feels the same. The map view (Whole) zooms out past the hero to frame
 * everything drawn. Moving between views eases; dragging and the wheel act at
 * once. The zoom decides the level of detail (PRD v2 §3.3), in three bands with
 * hysteresis: district below 4 px/m (small text and walkers hidden), street from
 * 4 px/m, inside from 10 px/m (a selected lot opens as its section drawing);
 * the band is reported to the caller through onDetail.
 *
 * The view owns no DOM beyond the canvas it is given: every listener it
 * adds is on that canvas, plus one ResizeObserver on the container, and
 * dispose() removes them all.
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { W } from '../kernel/iso';
import { setTextFar } from '../kernel/part';
import { approach, clamp } from '../kernel/math';
import { idleHooks, type EngineContext } from '../context';
import type { Clock } from '../sim/clock';
import type { Band, Entity, Hover, Peek, RendererLike, Selection, ViewName } from '../types';
import type { Box, GeneratedLayout, Pt } from '@/world/placement/types';

export interface ViewOptions {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  renderer: RendererLike;
  clock: Clock;
  /** Phones: the walkers wait for a closer view, and the hero's floor is lower. */
  reducedDetail: boolean;
  onSelect?: (sel: Selection | null) => void;
  /** The thing under the pointer changed (PRD v2 §3.4): its id, kind and label, or null. */
  onHover?: (h: Hover | null) => void;
  /** The band of detail changed (PRD v2 §3.3): tiny hides the smallest movers, far hides the small text and street details. */
  onDetail?: (tiny: boolean, far: boolean, band: Band) => void;
}

export interface View {
  camera: THREE.OrthographicCamera;
  select(ent: Entity | null): void;
  selected(): Entity | null;
  lookAt(view: ViewName): void;
  /** 0 the home view … 1 the near view on the selected (or last selected) building. */
  setDistance(t: number): void;
  distanceOf(): number;
  /** The band of detail the camera's zoom is in (PRD v2 §3.3). */
  band(): Band;
  zoomBy(k: number): void;
  /** Select the next or previous company (a lot with a ticker) or building, in registry order (PRD v2 §3.4). */
  cycle(d: 1 | -1, kind?: 'company' | 'building'): void;
  /** What the pointer is over, as the hover label shows it. */
  hovered(): Hover | null;
  /** Hover the thing at a canvas point now, as the pointer would (tests, the debug API). */
  hoverAt(px: number, py: number): Hover | null;
  setHighlight(ids: readonly string[]): void;
  currentView(): ViewName | null;
  tick(dt: number, paused: boolean): void;
  drawCalls(): number;
  screenOf(ent: Entity): [number, number];
  /** Put the camera over world (x, y) at a zoom in pixels per metre, at once. */
  look(x: number, y: number, zoom: number): void;
  resize(): void;
  dispose(): void;
}

/** A region of the world to frame: its footprint and the heights it spans; pts, when given, are the ground points to fit instead of the box's corners. */
export interface Frame { box: Box; z: readonly [number, number]; pts?: readonly Pt[] }

const boundsOfPts = (pts: readonly Pt[]): Box => ({ x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) });
const corners = (b: Box): Pt[] => [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];

/** The places the shell's buttons name, as boxes to frame. */
export function viewBoxes(layout: GeneratedLayout): Record<ViewName, Frame> {
  // the map frames everything drawn, point by point, so an empty corner of the slab costs it no zoom
  const drawn: Pt[] = [...layout.regions.flatMap((r) => r.polygon), ...layout.blocks.flatMap((b) => corners(b.box)), ...layout.fixtures.flatMap((f) => corners(f.box))];
  if (layout.port) drawn.push(...corners(layout.port.water));
  const whole: Frame = drawn.length ? { box: boundsOfPts(drawn), z: [-4, 30], pts: drawn } : { box: layout.world, z: [-4, 30] };
  const boundsOf = (ids: readonly string[]): Box | null => {
    const pts = layout.regions.filter((r) => ids.includes(r.id)).flatMap((r) => r.polygon);
    return pts.length ? boundsOfPts(pts) : null;
  };
  const region = (ids: readonly string[]): Frame => { const b = boundsOf(ids); return b ? { box: b, z: [0, 20] } : whole; };
  const tank = layout.fixtures.find((f) => f.kind === 'think-tank');
  const hillZ = layout.hill?.height ?? 0;
  const thinktank: Frame = tank
    ? { box: { x0: tank.box.x0 - 30, x1: tank.box.x1 + 30, y0: tank.box.y0 - 30, y1: tank.box.y1 + 30 }, z: [hillZ, hillZ + 10] }
    : layout.hill ? { box: { x0: layout.hill.centre[0] - layout.hill.radius, x1: layout.hill.centre[0] + layout.hill.radius, y0: layout.hill.centre[1] - layout.hill.radius, y1: layout.hill.centre[1] + layout.hill.radius }, z: [0, hillZ + 10] } : region(['hill']);
  // the hero (PRD v2 §3.1): the layout's own frame (the poster draws the same), else the estate
  const est = boundsOf(['estate']);
  const hero: Frame = layout.hero ? { box: layout.hero, z: [0, 20] } : est ? { box: est, z: [0, 20] } : whole;
  return { hero, whole, ring: region(['ring-geological', 'ring-biological']), estate: region(['estate']), gateway: region(['gateway']), town: region(['town']), thinktank };
}

// ---- the projection ----
/** How far the camera stands back along the diagonal; far enough that the whole world lies in front of it. */
const BACK = 4000;
const S2 = Math.SQRT2, S6 = Math.sqrt(6);
/** Screen right and screen up, in three.js axes. */
const RIGHT = new THREE.Vector3(1, 0, -1).normalize(), UP = new THREE.Vector3(-1, 2, -1).normalize();
/** The ground point (world x, y at z = 0) that sits at a given screen offset (right, up, in metres) from the ground origin. */
const groundAt = (r: number, u: number): [number, number] => [(r * S2 - u * S6) / 2, (-u * S6 - r * S2) / 2];
/** A world point's screen offset (right, up, in metres) from the ground origin. */
const screenOfPoint = (x: number, y: number, z: number): [number, number] => [(x - y) / S2, (2 * z - x - y) / S6];

/** The hero's floor in pixels per metre (PRD v2 §2.3, §3.14): a wide stage, and a phone's. */
const HERO_ZOOM = 1.25, HERO_ZOOM_PHONE = 1.0, PHONE_WIDTH = 640;
/** The bands of detail (PRD v2 §3.3), in pixels per metre, each switching with a hysteresis of a tenth either side. */
const STREET = 4, INSIDE = 10, HYSTERESIS = 0.1;
/** Easing rate of the camera, per second. */
const EASE = 6;
/** How often the pointer is checked for what is under it, in milliseconds: the label shows within 150 ms (PRD v2 §3.4). */
const HOVER_EVERY = 60;
/** How long a touch must rest for the hover label (a long press), in milliseconds. */
const LONG_PRESS = 500;
/** The hover label's text height on screen, in CSS pixels. */
const LABEL_PX = 15;
const KEY_VIEWS: Record<string, ViewName> = { '0': 'whole', '1': 'ring', '2': 'estate', '3': 'gateway', '4': 'town', '5': 'thinktank', h: 'hero', H: 'hero' };
const noRaycast = () => {};

/** The twelve edges of a unit cube, for the selection frame (scaled to an entity's bounds). */
const CUBE_EDGES = [
  0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0,
  0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0,
  0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1,
];

export function createView(ctx: EngineContext, o: ViewOptions): View {
  const { canvas, renderer, container } = o;
  const frames = viewBoxes(ctx.layout);
  let w = 1, h = 1;

  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, BACK * 5);
  camera.up.set(0, 1, 0);
  camera.position.set(BACK, BACK, BACK);
  camera.lookAt(0, 0, 0);

  // ---- camera state: the ground point at the centre of the frame, and the zoom (kept as its log) ----
  const cur = { x: 0, y: 0, logZ: 0 }, goal = { x: 0, y: 0, logZ: 0 };
  // homeLog is the hero's zoom (the slider's 0), mapLog the map's (the furthest out), nearLog the slider's 1
  let homeLog = 0, mapLog = 0, nearLog = 1, home = { x: 0, y: 0 }, map = { x: 0, y: 0 };
  let named: ViewName | null = 'hero';

  /** The centre and zoom that frame a box (or the frame's points) with a margin. */
  function fit(f: Frame, margin: number): { x: number; y: number; logZ: number } {
    let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity;
    const pts = f.pts ?? [[f.box.x0, f.box.y0], [f.box.x1, f.box.y0], [f.box.x1, f.box.y1], [f.box.x0, f.box.y1]];
    for (const [x, y] of pts) for (const z of f.z) {
      const [r, u] = screenOfPoint(x, y, z);
      r0 = Math.min(r0, r); r1 = Math.max(r1, r); u0 = Math.min(u0, u); u1 = Math.max(u1, u);
    }
    const zoom = Math.min(w / Math.max(1e-6, (r1 - r0) * margin), h / Math.max(1e-6, (u1 - u0) * margin));
    const [x, y] = groundAt((r0 + r1) / 2, (u0 + u1) / 2);
    return { x, y, logZ: Math.log(zoom) };
  }
  /** The ground point under a world point, as the camera sees it: centring it puts the point in the middle of the frame. */
  const groundUnder = (x: number, y: number, z: number): [number, number] => { const [r, u] = screenOfPoint(x, y, z); return groundAt(r, u); };

  function measure() {
    w = Math.max(1, container.clientWidth || canvas.clientWidth || 0);
    h = Math.max(1, container.clientHeight || canvas.clientHeight || 0);
    // the hero frames its box, never below its floor; on a narrow stage the floor wins and the hero shows part of it
    const heroFit = fit(frames.hero, 1.04), floor = Math.log(w < PHONE_WIDTH ? HERO_ZOOM_PHONE : HERO_ZOOM);
    homeLog = Math.max(heroFit.logZ, floor); home = { x: heroFit.x, y: heroFit.y };
    const mapFit = fit(frames.whole, 1.03);
    mapLog = Math.min(mapFit.logZ, homeLog); map = { x: mapFit.x, y: mapFit.y };
    nearLog = Math.max(homeLog + Math.log(8), Math.log(Math.min(w, h) / 40));
    camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
    renderer.setSize(w, h, false);
    ctx.theme.setResolution(w, h);
    markerMat.resolution.set(w, h); hoverMat.resolution.set(w, h);
  }
  const zoomRange = () => [mapLog + Math.log(0.85), nearLog + Math.log(1.25)] as const;
  const distOf = (logZ: number) => clamp((logZ - homeLog) / (nearLog - homeLog), 0, 1);
  const logOf = (t: number) => homeLog + clamp(t, 0, 1) * (nearLog - homeLog);

  function applyCamera() {
    camera.zoom = Math.exp(cur.logZ);
    camera.position.set(cur.x + BACK, BACK, cur.y + BACK);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  // ---- markers in the sky: the selection's frame, a moving thing's route, the highlighted entities ----
  const sky = new THREE.Group(); sky.name = 'view-markers'; ctx.sky.add(sky);
  const markerMat = ctx.theme.line.live.clone() as LineMaterial;
  markerMat.depthTest = false; markerMat.depthWrite = false;
  const frameLine = new LineSegments2(new LineSegmentsGeometry().setPositions(CUBE_EDGES), markerMat);
  frameLine.visible = false; frameLine.renderOrder = 12; frameLine.frustumCulled = false; frameLine.raycast = noRaycast; sky.add(frameLine);
  const routeLine = new LineSegments2(new LineSegmentsGeometry(), markerMat);
  routeLine.visible = false; routeLine.renderOrder = 12; routeLine.frustumCulled = false; routeLine.raycast = noRaycast; sky.add(routeLine);
  const highlightLine = new LineSegments2(new LineSegmentsGeometry(), markerMat);
  highlightLine.visible = false; highlightLine.renderOrder = 12; highlightLine.frustumCulled = false; highlightLine.raycast = noRaycast; sky.add(highlightLine);

  // ---- selection ----
  let chosen: Entity | null = null, focus: Entity | null = null, routeAge = Infinity;
  const moving = (e: Entity) => typeof e.update === 'function' && e.groups.length > 0;
  /** An entity's anchor in three.js space: its pick point (local to a moving thing's group). */
  function anchorOf(e: Entity): THREE.Vector3 {
    const p = e.pick ?? [0, 0, 0];
    const v = W(p[0], p[1], p[2]);
    if (moving(e)) { e.groups[0].updateMatrixWorld(); v.applyMatrix4(e.groups[0].matrixWorld); }
    return v;
  }
  /** An entity's bounds in three.js space, for the selection frame. */
  function boundsOf(e: Entity): THREE.Box3 {
    if (e.bbox) return e.bbox.clone();
    const plot = (e as Entity & { box?: Box }).box;
    if (plot && typeof plot.x0 === 'number') return new THREE.Box3(W(plot.x0, plot.y0, 0), W(plot.x1, plot.y1, 4.6));
    if (moving(e)) { const b = new THREE.Box3().setFromObject(e.groups[0]); if (!b.isEmpty()) return b.expandByScalar(0.4); }
    const a = anchorOf(e);
    return new THREE.Box3(a.clone().add(new THREE.Vector3(-2, -1.5, -2)), a.clone().add(new THREE.Vector3(2, 1, 2)));
  }
  function placeFrame() {
    if (!chosen) { frameLine.visible = false; routeLine.visible = false; return; }
    const b = boundsOf(chosen);
    frameLine.position.copy(b.min);
    frameLine.scale.set(Math.max(1e-3, b.max.x - b.min.x), Math.max(1e-3, b.max.y - b.min.y), Math.max(1e-3, b.max.z - b.min.z));
    frameLine.visible = true;
  }
  function drawRoute() {
    const r = chosen?.route?.();
    if (!r?.path) { routeLine.visible = false; return; }
    const path = r.path, start = r.s ?? 0, pts: number[] = [];
    // dashes ahead of the vehicle, a hundred and twenty metres of its lane
    for (let d = 2; d < 120; d += 6) {
      const s0 = start + d, s1 = start + d + 3;
      if (!(r.closed ?? path.closed) && s1 > path.length) break;
      const a = path.at(s0), b = path.at(s1);
      pts.push(a.x, 0.4, a.y, b.x, 0.4, b.y);
    }
    const old = routeLine.geometry;
    routeLine.geometry = new LineSegmentsGeometry().setPositions(pts.length ? pts : [0, 0, 0, 0, 0, 0]);
    old.dispose();
    routeLine.visible = pts.length > 0;
  }

  function select(ent: Entity | null) {
    chosen = ent;
    if (ent && (ent.kind === 'building' || ent.kind === 'company')) focus = ent;
    routeAge = Infinity;
    placeFrame();
    if (!ent?.route) routeLine.visible = false;
    o.onSelect?.(ent ? { id: ent.id, kind: ent.kind, info: ent.info() } : null);
  }

  // ---- where the camera goes ----
  function centreOn(e: Entity): [number, number] { const a = anchorOf(e); return groundUnder(a.x, a.z, a.y); }
  function setDistance(t: number) {
    t = clamp(t, 0, 1);
    goal.logZ = logOf(t);
    const target = chosen ?? focus;
    if (t === 0) { goal.x = home.x; goal.y = home.y; named = 'hero'; return; }
    named = null;
    if (target) {
      // the frame slides from the home view toward the building over the first part of the slider
      const s = clamp(t / 0.35, 0, 1), k = s * s * (3 - 2 * s), [fx, fy] = centreOn(target);
      goal.x = home.x + (fx - home.x) * k; goal.y = home.y + (fy - home.y) * k;
    }
  }
  function lookAt(name: ViewName) {
    const f = frames[name] ?? frames.whole;
    if (name === 'hero') { goal.x = home.x; goal.y = home.y; goal.logZ = homeLog; }
    else if (name === 'whole') { goal.x = map.x; goal.y = map.y; goal.logZ = mapLog; }
    else { const g = fit(f, 1.08); goal.x = g.x; goal.y = g.y; goal.logZ = clamp(g.logZ, mapLog, nearLog); }
    named = name;
  }
  function zoomBy(k: number) {
    const [lo, hi] = zoomRange();
    goal.logZ = clamp(goal.logZ + Math.log(k), lo, hi);
    named = null;
  }
  /** Zoom by k at once, keeping the ground point under (px, py) where it is. */
  function zoomAt(px: number, py: number, k: number) {
    const [lo, hi] = zoomRange();
    const before = Math.exp(cur.logZ), after = Math.exp(clamp(cur.logZ + Math.log(k), lo, hi));
    const ox = px - w / 2, oy = h / 2 - py;
    const [gx, gy] = groundAt(ox / before, oy / before), [nx, ny] = groundAt(ox / after, oy / after);
    cur.x += gx - nx; cur.y += gy - ny; cur.logZ = Math.log(after);
    goal.x = cur.x; goal.y = cur.y; goal.logZ = cur.logZ;
    named = null;
  }
  /** Move the frame by a drag of (dx, dy) screen pixels, at once: the ground follows the pointer. */
  function panBy(dx: number, dy: number) {
    const z = Math.exp(cur.logZ), [gx, gy] = groundAt(-dx / z, dy / z);
    const { x0, x1, y0, y1 } = ctx.layout.world;
    cur.x = clamp(cur.x + gx, x0 - 200, x1 + 200); cur.y = clamp(cur.y + gy, y0 - 200, y1 + 200);
    goal.x = cur.x; goal.y = cur.y;
    named = null;
  }
  function cycle(d: 1 | -1, kind: 'company' | 'building' = 'company') {
    // companies are the lots with a ticker; both lists run in the registry's order (Entity.order), else as built
    const list = ctx.entities.filter((e) => e.kind === kind && (kind !== 'company' || !!(e as Entity & { ticker?: string | null }).ticker)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (!list.length) return;
    const i = chosen ? list.indexOf(chosen) : -1;
    const next = list[i < 0 ? (d > 0 ? 0 : list.length - 1) : (i + d + list.length) % list.length];
    select(next);
    setDistance(Math.max(distOf(goal.logZ), 0.5));
  }

  // ---- highlight by tag ----
  let highlighted: Entity[] = [];
  function setHighlight(ids: readonly string[]) {
    const want = new Set(ids);
    highlighted = want.size ? ctx.entities.filter((e) => want.has(e.id) || (e.tags ?? []).some((t) => want.has(t)) || want.has((e as Entity & { code?: string }).code ?? '\u0000')) : [];
    const pts: number[] = [];
    const union = new THREE.Box3();
    for (const e of highlighted) {
      if (moving(e)) continue;
      const b = boundsOf(e); union.union(b);
      for (let i = 0; i < CUBE_EDGES.length; i += 3) pts.push(b.min.x + CUBE_EDGES[i] * (b.max.x - b.min.x), b.min.y + CUBE_EDGES[i + 1] * (b.max.y - b.min.y), b.min.z + CUBE_EDGES[i + 2] * (b.max.z - b.min.z));
    }
    const old = highlightLine.geometry;
    highlightLine.geometry = new LineSegmentsGeometry().setPositions(pts.length ? pts : [0, 0, 0, 0, 0, 0]);
    old.dispose();
    highlightLine.visible = pts.length > 0;
    if (!union.isEmpty()) {
      const g = fit({ box: { x0: union.min.x, x1: union.max.x, y0: union.min.z, y1: union.max.z }, z: [union.min.y, union.max.y] }, 1.6);
      goal.x = g.x; goal.y = g.y; goal.logZ = clamp(g.logZ, homeLog, logOf(0.85)); named = null;
    }
  }

  // ---- hover (PRD v2 §3.4): one label in the sky over the thing under the pointer, a hairline round it, the pointer ----
  const hoverMat = ctx.theme.line.line.clone() as LineMaterial;
  hoverMat.depthTest = false; hoverMat.depthWrite = false;
  const hoverLine = new LineSegments2(new LineSegmentsGeometry().setPositions(CUBE_EDGES), hoverMat);
  hoverLine.visible = false; hoverLine.renderOrder = 11; hoverLine.frustumCulled = false; hoverLine.raycast = noRaycast; sky.add(hoverLine);
  let hoverEnt: Entity | null = null, hoverInfo: Hover | null = null, hoverLabel: THREE.Sprite | null = null;
  const labelOf = (e: Entity) => { try { return e.label?.() ?? e.info().title; } catch { return e.id; } };
  function labelSprite(text: string): THREE.Sprite | null {
    if (!ctx.text2d) return null;
    // the label is drawn at twice its size for crisp text, and kept at its size on screen whatever the zoom
    const k = 2, pad = 8 * k, fontPx = LABEL_PX * k, c = document.createElement('canvas'), g = c.getContext('2d');
    if (!g) return null;
    g.font = `600 ${fontPx}px ${ctx.font}`;
    const tw = Math.ceil(g.measureText(text).width), cw = tw + pad * 2, ch = Math.ceil(fontPx * 1.6);
    c.width = cw; c.height = ch;
    g.fillStyle = `#${ctx.theme.fill.lamp.color.getHexString()}`; g.fillRect(0, 0, cw, ch);
    g.strokeStyle = `#${ctx.theme.textColor('ink').getHexString()}`; g.lineWidth = k; g.strokeRect(k / 2, k / 2, cw - k, ch - k);
    g.fillStyle = `#${ctx.theme.textColor('ink').getHexString()}`; g.font = `600 ${fontPx}px ${ctx.font}`; g.textBaseline = 'middle'; g.fillText(text, pad, ch / 2 + k / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ctx.gfx.aniso;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    sp.renderOrder = 13; sp.center.set(0.5, 0); sp.userData.px = [cw / k, ch / k]; sp.raycast = noRaycast;
    return sp;
  }
  function dropLabel() { if (hoverLabel) { sky.remove(hoverLabel); hoverLabel.material.map?.dispose(); hoverLabel.material.dispose(); hoverLabel = null; } }
  function placeHover() {
    if (!hoverEnt) { hoverLine.visible = false; return; }
    const b = boundsOf(hoverEnt);
    hoverLine.position.copy(b.min);
    hoverLine.scale.set(Math.max(1e-3, b.max.x - b.min.x), Math.max(1e-3, b.max.y - b.min.y), Math.max(1e-3, b.max.z - b.min.z));
    hoverLine.visible = true;
    if (hoverLabel) {
      // above the thing's top, at its middle; a constant size on screen
      const z = Math.exp(cur.logZ), [pw, ph] = hoverLabel.userData.px as [number, number];
      hoverLabel.position.set((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
      hoverLabel.scale.set(pw / z, ph / z, 1);
    }
  }
  function hover(ent: Entity | null) {
    if (ent === hoverEnt) return;
    hoverEnt = ent;
    dropLabel();
    hoverInfo = ent ? { id: ent.id, kind: ent.kind, label: labelOf(ent) } : null;
    if (ent && hoverInfo) { hoverLabel = labelSprite(hoverInfo.label); if (hoverLabel) sky.add(hoverLabel); }
    placeHover();
    if (!pointers.size) canvas.style.cursor = ent ? 'pointer' : 'grab';
    o.onHover?.(hoverInfo);
  }

  // ---- picking ----
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const shown = (obj: THREE.Object3D | null) => { for (let x = obj; x; x = x.parent) if (!x.visible) return false; return true; };
  const owner = (obj: THREE.Object3D | null): Entity | null => { for (let x = obj; x; x = x.parent) if (x.userData.entity) return x.userData.entity as Entity; return null; };
  function pickAt(px: number, py: number): Entity | null {
    ndc.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (const root of [ctx.sky, ctx.scene]) {
      for (const hit of raycaster.intersectObject(root, true)) {
        if (!shown(hit.object)) continue;
        const ent = owner(hit.object);
        if (!ent) continue;
        const resolved = ent.resolve ? ent.resolve(hit.point) : ent;
        if (resolved.kind === 'zone') continue;
        return resolved;
      }
    }
    return null;
  }

  // ---- input: everything on the canvas ----
  const local = (e: { clientX: number; clientY: number }): [number, number] => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const pointers = new Map<number, [number, number]>();
  let press: { id: number; x: number; y: number; moved: boolean } | null = null, spread = 0, lastHover = 0;
  const onDown = (e: PointerEvent) => {
    if (typeof canvas.focus === 'function') canvas.focus({ preventScroll: true });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not every environment captures */ }
    const p = local(e); pointers.set(e.pointerId, p);
    if (pointers.size === 1) press = { id: e.pointerId, x: p[0], y: p[1], moved: false };
    // a touch that rests shows the hover label (a long press)
    if (e.pointerType === 'touch' && pointers.size === 1) { if (pressTimer) clearTimeout(pressTimer); pressTimer = setTimeout(() => { pressTimer = null; if (press && !press.moved) hover(pickAt(press.x, press.y)); }, LONG_PRESS); }
    else { press = null; const [a, b] = [...pointers.values()]; spread = Math.hypot(a[0] - b[0], a[1] - b[1]); }
    canvas.style.cursor = 'grabbing';
  };
  let hoverTimer: ReturnType<typeof setTimeout> | null = null, pressTimer: ReturnType<typeof setTimeout> | null = null, hoverAtPt: [number, number] | null = null;
  const clearTimers = () => { if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; } if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
  const onMove = (e: PointerEvent) => {
    const p = local(e), prev = pointers.get(e.pointerId);
    if (!prev) {
      // hover: what is under a mouse, checked at most every HOVER_EVERY ms, and once more where the pointer comes to rest
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      hoverAtPt = p;
      if (now - lastHover >= HOVER_EVERY) { lastHover = now; hover(pickAt(p[0], p[1])); }
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => { hoverTimer = null; if (hoverAtPt && !pointers.size) { lastHover = typeof performance !== 'undefined' ? performance.now() : 0; hover(pickAt(hoverAtPt[0], hoverAtPt[1])); } }, HOVER_EVERY);
      return;
    }
    if (pressTimer && press && Math.hypot(p[0] - press.x, p[1] - press.y) > 5) { clearTimeout(pressTimer); pressTimer = null; }
    pointers.set(e.pointerId, p);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (spread > 0 && d > 0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / spread);
      spread = d;
      return;
    }
    if (press && !press.moved && Math.hypot(p[0] - press.x, p[1] - press.y) > 5) press.moved = true;
    if (!press || press.moved) panBy(p[0] - prev[0], p[1] - prev[1]);
  };
  const onLeave = () => { hoverAtPt = null; clearTimers(); if (!pointers.size) hover(null); };
  const onUp = (e: PointerEvent) => {
    const p = local(e);
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    pointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (press && press.id === e.pointerId && !press.moved && e.type === 'pointerup') select(pickAt(p[0], p[1]));
    if (!pointers.size) { press = null; canvas.style.cursor = 'grab'; }
  };
  const onWheel = (e: WheelEvent) => {
    // the page scrolls past the world until the visitor has put a hand on it (focus), or pinches (ctrl + wheel)
    if (!e.ctrlKey && document.activeElement !== canvas) return;
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? h : 1);
    const [x, y] = local(e);
    zoomAt(x, y, Math.exp(-dy * 0.0015));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let used = true;
    // [ and ] step through the companies; with Shift ({ and } on most layouts) through the buildings
    if (e.key === ']' || e.key === '}') cycle(1, e.key === '}' || e.shiftKey ? 'building' : 'company');
    else if (e.key === '[' || e.key === '{') cycle(-1, e.key === '{' || e.shiftKey ? 'building' : 'company');
    else if (e.key === 'Escape') select(null);
    else if (KEY_VIEWS[e.key]) lookAt(KEY_VIEWS[e.key]);
    else if (e.key === '+' || e.key === '=') zoomBy(1.4);
    else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.4);
    else if (e.key === 'ArrowLeft') panBy(80, 0);
    else if (e.key === 'ArrowRight') panBy(-80, 0);
    else if (e.key === 'ArrowUp') panBy(0, 80);
    else if (e.key === 'ArrowDown') panBy(0, -80);
    else used = false;
    if (used) e.preventDefault();
  };
  const listeners: [string, EventListener, AddEventListenerOptions?][] = [
    ['pointerdown', onDown as EventListener], ['pointermove', onMove as EventListener], ['pointerup', onUp as EventListener],
    ['pointercancel', onUp as EventListener], ['pointerleave', onLeave as EventListener], ['wheel', onWheel as EventListener, { passive: false }], ['keydown', onKey as EventListener],
  ];
  for (const [type, fn, opts] of listeners) canvas.addEventListener(type, fn, opts);
  canvas.style.cursor = 'grab';
  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(() => resize()); observer.observe(container); }

  // ---- the hooks scene code calls ----
  ctx.hooks = {
    forget(e) { if (hoverEnt === e) hover(null); if (chosen === e) select(null); if (focus === e) focus = null; if (highlighted.includes(e)) highlighted = highlighted.filter((x) => x !== e); },
    select: (e) => select(e),
    isSelected: (e) => chosen === e,
    track(e) { select(e); const [x, y] = centreOn(e); goal.x = x; goal.y = y; named = null; },
    lookInside(e) { select(e); setDistance(1); },
    handOff(from, to) { if (chosen === from) select(to); },
  };

  // ---- the level of detail, the sections, the frame ----
  let band: Band | null = null, calls = 0;
  const open = new Set<THREE.Group>();
  /** The band the zoom z is in, switching only past the hysteresis so a zoom resting on a threshold never flickers. */
  function bandOf(z: number, was: Band | null): Band {
    const up = (t: number) => t * (1 + HYSTERESIS), down = (t: number) => t * (1 - HYSTERESIS);
    if (was === 'inside') return z < down(INSIDE) ? (z < down(STREET) ? 'district' : 'street') : 'inside';
    if (was === 'street') return z >= up(INSIDE) ? 'inside' : z < down(STREET) ? 'district' : 'street';
    if (was === 'district') return z >= up(INSIDE) ? 'inside' : z >= up(STREET) ? 'street' : 'district';
    return z >= INSIDE ? 'inside' : z >= STREET ? 'street' : 'district';
  }
  function detail() {
    const next = bandOf(Math.exp(cur.logZ), band);
    if (next === band) return;
    const far = next === 'district';
    if (band === null || (band === 'district') !== far) { setTextFar(ctx.texts, far); ctx.theme.setDistrict(far); }
    band = next;
    o.onDetail?.(far || o.reducedDetail, far, next);
  }
  const within = (g: THREE.Object3D, inner: THREE.Object3D | undefined) => { for (let x = inner ?? null; x; x = x.parent) if (x === g) return true; return false; };
  function sections() {
    for (const [g, ent] of ctx.peeks) {
      const peek = g.userData.peek as Peek | undefined;
      if (!peek) continue;
      // the point at the building's floor height under the middle of the frame (a raised floor sits up-screen of its ground)
      const z0 = peek.z?.[0] ?? 0, mx = cur.x + z0, my = cur.y + z0;
      const over = !!peek.near && band === 'inside' && mx >= peek.box[0] - 20 && mx <= peek.box[1] + 20 && my >= peek.box[2] - 20 && my <= peek.box[3] + 20;
      // a selected lot opens as its section at the inside band (PRD v2 §3.3); its whiteboard keeps it open while chosen
      const want = (chosen === ent && band === 'inside') || (!!chosen && chosen !== ent && within(g, chosen.groups[0])) || over;
      const isOpen = open.has(g);
      if (want && !isOpen) {
        if (!peek.cut && peek.section) { const s = peek.section(); g.add(s.cut, s.inside); peek.cut = s.cut; peek.inside = s.inside; }
        peek.shell.visible = false;
        if (peek.cut) peek.cut.visible = true;
        if (peek.inside) peek.inside.visible = true;
        open.add(g); ent.peeked?.(true);
      } else if (!want && isOpen) {
        peek.shell.visible = true;
        if (peek.cut) peek.cut.visible = false;
        if (peek.inside) peek.inside.visible = false;
        open.delete(g); ent.peeked?.(false);
      }
      if (want) ent.whileOpen?.();
    }
  }

  function tick(dt: number, paused: boolean) {
    const k = ctx.reduced ? 1 : approach(EASE, dt);
    cur.x += (goal.x - cur.x) * k; cur.y += (goal.y - cur.y) * k; cur.logZ += (goal.logZ - cur.logZ) * k;
    if (Math.abs(goal.x - cur.x) < 1e-3 && Math.abs(goal.y - cur.y) < 1e-3 && Math.abs(goal.logZ - cur.logZ) < 1e-4) { cur.x = goal.x; cur.y = goal.y; cur.logZ = goal.logZ; }
    applyCamera();
    detail();
    sections();
    if (chosen && moving(chosen)) placeFrame();
    if (hoverEnt) placeHover();
    routeAge += dt;
    if (chosen?.route && !paused && routeAge > 0.2) { routeAge = 0; drawRoute(); }
    ctx.theme.shade(o.clock.night());
    renderer.info.reset();
    renderer.autoClear = true;
    renderer.render(ctx.scene, camera);
    renderer.autoClear = false;
    renderer.render(ctx.sky, camera);
    calls = renderer.info.render.calls;
  }

  function resize() {
    const t = distOf(cur.logZ), atHome = named === 'hero' && cur.logZ === homeLog;
    measure();
    if (atHome) { cur.x = goal.x = home.x; cur.y = goal.y = home.y; cur.logZ = goal.logZ = homeLog; }
    else if (named) lookAt(named);
    else { cur.logZ = logOf(t); goal.logZ = clamp(goal.logZ, ...zoomRange()); }
    applyCamera();
  }

  function screenOf(e: Entity): [number, number] {
    applyCamera();
    const v = anchorOf(e).project(camera);
    return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
  }

  // ---- start at home ----
  renderer.info.autoReset = false;
  measure();
  cur.x = goal.x = home.x; cur.y = goal.y = home.y; cur.logZ = goal.logZ = homeLog;
  applyCamera();
  detail();

  return {
    camera,
    select,
    selected: () => chosen,
    lookAt,
    setDistance,
    distanceOf: () => distOf(cur.logZ),
    band: () => band ?? 'district',
    zoomBy,
    cycle,
    hovered: () => hoverInfo,
    hoverAt(px, py) { hover(pickAt(px, py)); return hoverInfo; },
    setHighlight,
    currentView: () => named,
    tick,
    drawCalls: () => calls,
    screenOf,
    look(x, y, zoom) { const [lo, hi] = zoomRange(); cur.x = goal.x = x; cur.y = goal.y = y; cur.logZ = goal.logZ = clamp(Math.log(Math.max(zoom, 1e-6)), lo, hi); named = null; applyCamera(); },
    resize,
    dispose() {
      for (const [type, fn, opts] of listeners) canvas.removeEventListener(type, fn, opts);
      observer?.disconnect(); observer = null;
      clearTimers(); dropLabel(); hoverEnt = null; hoverInfo = null;
      pointers.clear(); open.clear(); highlighted = []; chosen = null; focus = null;
      ctx.hooks = idleHooks();
      sky.removeFromParent();
      for (const l of [frameLine, routeLine, highlightLine, hoverLine]) l.geometry.dispose();
      markerMat.dispose(); hoverMat.dispose();
    },
  };
}
