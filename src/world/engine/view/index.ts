// Adapted from Factory Yard (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { W } from '../kernel/iso';
import { setTextFar, v3 } from '../kernel/part';
import { clamp } from '../kernel/math';
import { Path } from '../kernel/path';
import { ring } from '../world/ground';
import type { EngineContext } from '../context';
import type { Clock } from '../sim/clock';
import type { Entity, EntityRoute, Peek, RendererLike, Selection, ViewName } from '../types';
import { VIEW_NAMES } from '../types';
import type { Box, GeneratedLayout } from '@/world/placement/types';

// ---- the view: camera and controls, hit-testing, selection, the reticle and the route, looking inside, levels of
// detail, the keys, and one frame ----
//
// Factory Yard's initView found the plate's elements by id and wrote into them. Here the view owns nothing in the
// DOM but its canvas: the shell passes the container, reads per-frame state through the handle, and gets a callback
// on every selection change (mega prompt §4.2).

export interface ViewOptions {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  renderer: RendererLike;
  clock: Clock;
  reducedDetail: boolean;
  onSelect?: (sel: Selection | null) => void;
  /** Called when the level of detail changes, so the simulation can swap its models. */
  onDetail?: (tiny: boolean, far: boolean) => void;
}

export interface View {
  camera: THREE.OrthographicCamera;
  controls: OrbitControls;
  select(ent: Entity | null): void;
  selected(): Entity | null;
  hovered(): Entity | null;
  lookAt(view: ViewName): void;
  /** Frame a box of the world, with an optional height range. */
  frameBox(box: Box, z?: readonly [number, number]): void;
  setDistance(t: number): void;
  zoomBy(k: number): void;
  reset(): void;
  cycle(d: 1 | -1): void;
  setFollow(on: boolean): void;
  /** Which place the view is centred on, when it is in close. */
  currentView(): ViewName | null;
  /** One frame: ease the camera, update the peeks and the detail, draw. */
  tick(dt: number, paused: boolean): void;
  drawCalls(): number;
  screenOf(ent: Entity): [number, number];
  look(x: number, y: number, zoomK: number): void;
  resize(): void;
  dispose(): void;
}

type Goal = { zoom: number; target?: THREE.Vector3 } | null;

/** The place boxes come from the generated layout's regions (the whole world for 'whole'). */
export function viewBoxes(layout: GeneratedLayout): Record<ViewName, Box> {
  const of = (ids: string[]): Box | null => {
    const rs = layout.regions.filter((r) => ids.includes(r.id));
    if (!rs.length) return null;
    const xs = rs.flatMap((r) => r.polygon.map((p) => p[0])), ys = rs.flatMap((r) => r.polygon.map((p) => p[1]));
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  const whole = layout.world;
  return {
    whole,
    ring: of(['ring-geological', 'ring-biological', 'estate']) ?? whole,
    estate: of(['estate']) ?? whole,
    gateway: of(['gateway']) ?? whole,
    town: of(['town', 'recovery']) ?? whole,
    thinktank: of(['hill']) ?? whole,
  };
}

export function createView(ctx: EngineContext, o: ViewOptions): View {
  const { container, canvas, renderer, clock } = o;
  const { scene, sky, theme, layout } = ctx;
  const WORLD = layout.world, BOXES = viewBoxes(layout);
  let selected: Entity | null = null, hovered: Entity | null = null;
  const disposers: (() => void)[] = [];
  const listen = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
    el.addEventListener(type, fn as EventListener, opts); disposers.push(() => el.removeEventListener(type, fn as EventListener, opts));
  };

  // ---- camera & controls ----
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const ISO = v3(1, 1, 1).normalize(), CENTER = W((WORLD.x0 + WORLD.x1) / 2, (WORLD.y0 + WORLD.y1) / 2, 0);
  camera.position.copy(CENTER).addScaledVector(ISO, 5000); camera.lookAt(CENTER);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableRotate: false, screenSpacePanning: true, zoomToCursor: true, enableDamping: !ctx.reduced, dampingFactor: 0.12 });
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.target.copy(CENTER);
  // arrow keys pan; listened for on the canvas, which the shell gives a tabindex, never on the window
  controls.listenToKeyEvents(canvas);
  let fitZoom = 1, HOME = CENTER.clone(), goal: Goal = null, follow = false, sized = false, lastBuilding: Entity | null = null;
  // the zoom and ground target that frame a box of the world (z0..z1 high) in a w × h view
  function frame(w: number, h: number, b: Box, [z0, z1]: readonly [number, number] = [0, 12]) {
    camera.updateMatrixWorld();
    const inv = camera.matrixWorldInverse, bb = new THREE.Box3();
    for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [z0, z1]) bb.expandByPoint(W(x, y, z).applyMatrix4(inv));
    const c = bb.getCenter(v3()).applyMatrix4(camera.matrixWorld);
    return { zoom: Math.min(w / (bb.max.x - bb.min.x), h / (bb.max.y - bb.min.y)) * 0.94, target: c.addScaledVector(ISO, -c.y / ISO.y) };
  }
  function moveTarget(to: THREE.Vector3) { const d = to.clone().sub(controls.target); controls.target.add(d); camera.position.add(d); }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
    const f = frame(w, h, WORLD, [-4, 50]); fitZoom = f.zoom; HOME = f.target;
    controls.minZoom = fitZoom * 0.6; controls.maxZoom = fitZoom * 60;
    if (!sized) { sized = true; const v = w < 600 ? frame(w, h, BOXES.estate) : f; camera.zoom = v.zoom; moveTarget(v.target); }
    camera.zoom = clamp(camera.zoom, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix();
    theme.setResolution(w, h);
  }
  const overlay = () => { const l = new LineSegments2(new LineSegmentsGeometry(), theme.line.live); l.raycast = () => {}; l.frustumCulled = false; l.visible = false; scene.add(l); return l; };
  const retLine = overlay(), routeLine = overlay();
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); ro.observe(container); }
  resize();
  listen(canvas, 'wheel', () => { goal = null; }, { passive: true });
  function zoomBy(k: number) { goal = { zoom: clamp((goal?.zoom ?? camera.zoom) * k, controls.minZoom, controls.maxZoom), target: goal?.target }; }
  function reset() { setFollow(false); goal = { zoom: fitZoom, target: HOME.clone() }; }
  function frameBox(b: Box, z?: readonly [number, number]) { setFollow(false); goal = frame(container.clientWidth, container.clientHeight, b, z); }
  function lookAt(name: ViewName) { if (name === 'whole') reset(); else frameBox(BOXES[name]); }
  function currentView(): ViewName | null {
    const t = controls.target; if (camera.zoom <= fitZoom * 1.3) return null;
    let best: ViewName | null = null, bd = Infinity;
    for (const name of VIEW_NAMES) { if (name === 'whole') continue; const b = BOXES[name];
      if (t.x >= b.x0 && t.x <= b.x1 && t.z >= b.y0 && t.z <= b.y1) { const d = Math.hypot((b.x0 + b.x1) / 2 - t.x, (b.y0 + b.y1) / 2 - t.z); if (d < bd) { bd = d; best = name; } } }
    return best;
  }
  // the distance control: 0 is the far home view, 1 the near view on the selected or last building
  function setDistance(t: number) {
    const k = clamp(t, 0, 1), near = selected ?? lastBuilding;
    const nearZoom = fitZoom * 14, zoom = fitZoom + (nearZoom - fitZoom) * k * k;
    let target = HOME.clone();
    if (near) { const b = bounds(near), c = b.getCenter(v3()); target = HOME.clone().lerp(c.addScaledVector(ISO, -c.y / ISO.y), k); }
    setFollow(false); goal = { zoom: clamp(zoom, controls.minZoom, controls.maxZoom), target };
  }

  // ---- selection, tags, card ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3(), box = new THREE.Box3();
  const shown = (o: THREE.Object3D | null) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const inSky = (o: THREE.Object3D | null) => { for (; o; o = o.parent) if (o === sky) return true; return false; };
  function hit(cx: number, cy: number): Entity | null {
    const r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects([...scene.children, ...sky.children], true).sort((a, b) => a.distance - b.distance)) {
      if (!(h.object instanceof THREE.Mesh) || !shown(h.object) || (h.point.x < WORLD.x0 || h.point.x > WORLD.x1 || h.point.z < WORLD.y0 || h.point.z > WORLD.y1) && !inSky(h.object)) continue;
      let o: THREE.Object3D | null = h.object; while (o && !o.userData.entity) o = o.parent;
      // the nearest visible surface decides; a part drawn for many things says which one was hit
      const ent = o?.userData.entity as Entity | undefined;
      return ent ? ent.resolve?.(h.point) ?? ent : null;
    }
    return null;
  }
  // walk an entity's groups, stopping at anything that belongs to another entity (a pallet on a truck)
  function eachOwn(ent: Entity, fn: (o: THREE.Object3D) => void) {
    const walk = (o: THREE.Object3D) => { if (o.userData.entity && o.userData.entity !== ent) return; fn(o); o.children.forEach(walk); };
    for (const g of ent.groups) { fn(g); g.children.forEach(walk); }
  }
  let liveG: THREE.Object3D | null = null;
  function setLive(ent: Entity | null, on: boolean) { if (ent) eachOwn(ent, (o) => { if (o instanceof LineSegments2 && o.userData.line === 'line') o.material = on ? theme.line.live : theme.line.line; }); }
  function bounds(ent: Entity) { box.makeEmpty(); if (ent.bbox) return box.copy(ent.bbox); for (const g of ent.groups) box.expandByObject(g); return box; }
  const isBuilding = (e: Entity) => !e.isPerson && !VEHICLE_KINDS.has(e.kind);
  function select(ent: Entity | null) {
    if (ent === selected) return;
    setLive(selected, false); selected = ent; setLive(selected, true); liveG = ent?.groups?.[0] ?? null;
    if (ent && isBuilding(ent)) lastBuilding = ent;
    setFollow(false); drawRoute();
    o.onSelect?.(ent ? { id: ent.id, kind: ent.kind, info: ent.info() } : null);
  }
  ctx.hooks.forget = (ent) => { if (selected === ent) select(null); if (hovered === ent) hovered = null; };
  ctx.hooks.select = (ent) => select(ent);
  ctx.hooks.isSelected = (ent) => !!ent && selected === ent;
  // Track: select a vehicle, follow it and come in close
  ctx.hooks.track = (ent) => { select(ent); setFollow(true); goal = { zoom: Math.max(camera.zoom, fitZoom * 8) }; };
  // Look inside: frame the building close enough to see its rooms (it is open while it is selected)
  ctx.hooks.lookInside = (ent) => { const pk = ent.groups[0].userData.peek as Peek | undefined; if (!pk) return; const [x0, x1, y0, y1] = pk.box; frameBox({ x0: x0 - 4, x1: x1 + 4, y0: y0 - 4, y1: y1 + 4 }, pk.z ?? [0, 5]); };
  ctx.hooks.handOff = (from, to) => { if (selected === from) { const f = follow; select(to); setFollow(f); } };
  const VEHICLE_KINDS = new Set(['truck', 'reefer', 'forklift', 'train', 'crane', 'tractor', 'car', 'van', 'coin']);
  const followable = (ent: Entity | null): ent is Entity => !!ent && (ent.isPerson === true || VEHICLE_KINDS.has(ent.kind));
  function setFollow(on: boolean) { follow = on && followable(selected); }
  const screenAt = (v: THREE.Vector3): [number, number] => { tmp.copy(v).project(camera); return [(tmp.x + 1) / 2 * container.clientWidth, (1 - tmp.y) / 2 * container.clientHeight]; };
  // the corners are rebuilt only when the selection's footprint changes size; moving it is a translation
  let retKey = '';
  function updateReticle() {
    if (!selected) { retLine.visible = false; return; }
    const b = bounds(selected), x0 = b.min.x - 0.8, z0 = b.min.z - 0.8, y = Math.max(0, b.min.y) + 0.06;
    const w = b.max.x + 0.8 - x0, d = b.max.z + 0.8 - z0, key = `${w.toFixed(1)}|${d.toFixed(1)}`;
    if (key !== retKey) {
      retKey = key; const L = Math.min(3, w / 3, d / 3), s: number[] = [];
      for (const [x, dx] of [[0, 1], [w, -1]]) for (const [z, dz] of [[0, 1], [d, -1]]) s.push(x, 0, z, x + dx * L, 0, z, x, 0, z, x, 0, z + dz * L);
      retLine.geometry.dispose(); retLine.geometry = new LineSegmentsGeometry().setPositions(s);
    }
    retLine.position.set(x0, y, z0); retLine.visible = true;
  }
  // the selection's route: dashes ahead of it (a whole loop for loop vehicles) and a ring at its next stop
  let routeNext: { p: THREE.Vector3; stop?: string } | null = null;
  function drawRoute() {
    const r: EntityRoute | null | undefined = selected?.route?.();
    const path = r && (r.path ?? (r.pts ? new Path(r.pts, 0.01) : null));
    if (!r || !path || !path.length) { routeLine.visible = false; routeNext = null; return; }
    const z = 0.24, s: number[] = [], s0 = r.s ?? 0, s1 = r.closed ? s0 + path.length : path.length;
    for (let d = s0; d < s1; d += 1.6) { const a = path.at(d), b = path.at(Math.min(d + 0.8, s1)); s.push(a.x, z, a.y, b.x, z, b.y); }
    routeNext = r.next ? { p: W(r.next[0], r.next[1], z), stop: r.stop } : null;
    if (r.next) { const rr = selected?.isPerson ? 1.1 : 3.2; for (const v of ring(r.next[0], r.next[1], rr, z, 32)) s.push(v.x, v.y, v.z); }
    routeLine.geometry.dispose(); routeLine.geometry = new LineSegmentsGeometry().setPositions(s); routeLine.visible = true;
  }
  // A closed building opens up while it, or something inside it, is selected. Sections are drawn the first time they open.
  ctx.hooks.inBuilding = (x, y) => ctx.peeks.some(([g]) => { const b = (g.userData.peek as Peek).box; return x > b[0] && x < b[1] && y > b[2] && y < b[3]; });
  ctx.hooks.closedAt = (x, y) => { for (const [g] of ctx.peeks) { const pk = g.userData.peek as Peek, b = pk.box; if (x > b[0] && x < b[1] && y > b[2] && y < b[3]) return !pk.cut?.visible; } return false; };
  function updatePeek() {
    let c: [number, number] | null = null; if (selected) { const b = bounds(selected); c = [(b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2]; }
    for (const [g, ent] of ctx.peeks) { const pk = g.userData.peek as Peek, [x0, x1, y0, y1] = pk.box;
      const inside = (p: [number, number] | null) => !!p && p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1;
      const near = pk.near && camera.zoom > fitZoom * 9 && controls.target.x > x0 - 6 && controls.target.x < x1 + 6 && controls.target.z > y0 - 6 && controls.target.z < y1 + 6;
      const on = selected === ent || inside(c) || (!!routeNext && inside([routeNext.p.x, routeNext.p.z])) || !!near || !!ent.opened?.();
      if (on && !pk.cut && pk.section) { const s = pk.section(); s.cut.visible = s.inside.visible = false; g.add(s.cut, s.inside); pk.cut = s.cut; pk.inside = s.inside; }
      if (pk.cut && pk.cut.visible !== on) { pk.cut.visible = on; pk.shell.visible = !on; if (pk.inside) pk.inside.visible = on; ent.peeked?.(on); }
      if (on) ent.whileOpen?.(); }
  }

  let down: { x: number; y: number; t: number } | null = null, pointer: [number, number] | null = null, hoverDirty = false;
  listen(canvas, 'pointerdown', (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  listen(canvas, 'pointerup', (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 700) select(hit(e.clientX, e.clientY));
    down = null;
  });
  listen(canvas, 'pointermove', (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 6) { goal = null; setFollow(false); }   // a real drag takes the camera back
    if (e.pointerType === 'mouse' && !e.buttons) { pointer = [e.clientX, e.clientY]; hoverDirty = true; }
  });
  listen(canvas, 'pointerleave', () => { pointer = null; hovered = null; canvas.classList.remove('over'); });
  const buildings = () => ctx.entities.filter(isBuilding);
  function cycle(d: 1 | -1) { const v = buildings(), i = selected ? v.indexOf(selected) : -1; if (v.length) select(v[i < 0 ? (d > 0 ? 0 : v.length - 1) : (i + d + v.length) % v.length]); }
  // keys per PRD §7.3: 1–5 and 0 are the places, [ ] cycle buildings, Enter opens the hovered thing, Esc closes, +/− zoom, F follows
  const PLACE_KEYS: Record<string, ViewName> = { '1': 'ring', '2': 'estate', '3': 'gateway', '4': 'town', '5': 'thinktank', '0': 'whole' };
  listen(canvas, 'keydown', (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.startsWith('Arrow')) { goal = null; setFollow(false); return; }
    const place = PLACE_KEYS[e.key];
    const act: (() => void) | undefined = place ? () => lookAt(place) : ({
      Escape: () => select(null), f: () => setFollow(!follow), F: () => setFollow(!follow), ']': () => cycle(1), '[': () => cycle(-1),
      '+': () => zoomBy(1.4), '=': () => zoomBy(1.4), '-': () => zoomBy(1 / 1.4), '_': () => zoomBy(1 / 1.4), Home: reset,
      Enter: () => { if (hovered) select(hovered); else if (selected) o.onSelect?.({ id: selected.id, kind: selected.kind, info: selected.info() }); },
    } as Record<string, () => void>)[e.key];
    if (act) { act(); e.preventDefault(); }
  });
  // The GPU can drop the context (driver reset, memory pressure, a GPU switch). three.js restores it by itself;
  // meanwhile nothing is drawn, then everything is re-tinted once it is back.
  let lost = false;
  listen(canvas, 'webglcontextlost', (e: Event) => { e.preventDefault(); lost = true; });
  listen(canvas, 'webglcontextrestored', () => { lost = false; theme.apply(); resize(); });
  if (typeof matchMedia === 'function') { const mq = matchMedia('(prefers-color-scheme: light)'); const onTheme = () => theme.apply(); mq.addEventListener('change', onTheme); disposers.push(() => mq.removeEventListener('change', onTheme)); }

  // ---- one frame ----
  let TINY = false, FAR = false;
  function tick(dt: number, paused: boolean) {
    const k = ctx.reduced ? 1 : 1 - Math.exp(-dt * 6);
    theme.shade(clock.night());
    // (followed where it is seen: its middle, slid down the view ray to the ground)
    if (follow && selected) { const b = bounds(selected), c = b.getCenter(v3()); moveTarget(controls.target.clone().lerp(c.addScaledVector(ISO, -c.y / ISO.y), k)); }
    if (goal) {
      if (goal.target) moveTarget(controls.target.clone().lerp(goal.target, k));
      camera.zoom += (goal.zoom - camera.zoom) * k; camera.updateProjectionMatrix();
      if (Math.abs(goal.zoom - camera.zoom) < 1e-3 * goal.zoom && (!goal.target || controls.target.distanceTo(goal.target) < 0.05)) goal = null;
    }
    controls.update(dt);
    // slide the target along the view ray onto the ground (an invisible move), then keep it over the world
    const t = controls.target; moveTarget(t.clone().addScaledVector(ISO, -t.y / ISO.y));
    const home = v3(clamp(t.x, WORLD.x0, WORLD.x1), 0, clamp(t.z, WORLD.y0, WORLD.y1));
    if (!(follow && selected?.aloft?.())) moveTarget(home.distanceTo(t) > 1 ? t.clone().lerp(home, k) : home);
    camera.updateMatrixWorld();
    // detail by how big things are on screen (zoom is screen px per metre): lite figures under about 4 px a metre, none under about 1.5
    const tinyAt = o.reducedDetail ? 6 : 4.2, farAt = o.reducedDetail ? 2.2 : 1.5;
    const tiny = camera.zoom < tinyAt, far = camera.zoom < farAt;
    if (tiny !== TINY || far !== FAR) { TINY = tiny; FAR = far; setTextFar(ctx.texts, far); o.onDetail?.(tiny, far); }
    updatePeek();
    // a selection that has changed its model gets its highlight again
    if (selected && selected.groups?.[0] !== liveG) { liveG = selected.groups?.[0] ?? null; setLive(selected, true); }
    if (hoverDirty && pointer) { hoverDirty = false; hovered = hit(...pointer); canvas.classList.toggle('over', !!hovered); }
    updateReticle();
    if (!paused) drawRoute();
    if (!lost) { renderer.info.autoReset = false; renderer.info.reset(); renderer.render(scene, camera);
      if (sky.children.length) { const cp = renderer.clippingPlanes; renderer.clippingPlanes = []; renderer.autoClear = false; renderer.render(sky, camera); renderer.autoClear = true; renderer.clippingPlanes = cp; } }
  }

  return {
    camera, controls, select, selected: () => selected, hovered: () => hovered, lookAt, frameBox, setDistance, zoomBy, reset, cycle, setFollow, currentView, tick,
    drawCalls: () => { tick(0, true); return renderer.info.render.calls; },
    screenOf: (e) => { scene.updateMatrixWorld(); camera.updateMatrixWorld(); const pk = e.pick ?? [0, 0, 1];
      const p = (e.groups[0] ? e.groups[0].localToWorld(W(...pk)) : W(...pk)).project(camera), r = canvas.getBoundingClientRect();
      return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; },
    look: (x, y, k) => { goal = null; setFollow(false); moveTarget(W(x, y, 0)); camera.zoom = fitZoom * k; camera.updateProjectionMatrix(); },
    resize,
    dispose: () => {
      for (const d of disposers.splice(0)) d();
      ro?.disconnect(); ro = null;
      controls.dispose();
      for (const l of [retLine, routeLine]) { scene.remove(l); l.geometry.dispose(); }
      selected = null; hovered = null; liveG = null; lastBuilding = null; goal = null;
    },
  };
}
