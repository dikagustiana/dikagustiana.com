// Original to this repository (Kawasan Industri world engine, fallback kernel), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
/**
 * Part: the drawing primitive the world is built with. A builder adds faces,
 * solids, lines and text to a Part in world coordinates, then build() merges
 * everything into a handful of meshes, so a whole zone of buildings costs a
 * few draw calls, not thousands:
 *
 *   - one mesh per flat fill key (a yard, a road, a decal on a wall);
 *   - one mesh for every solid (boxes, prisms, cylinders, any geometry),
 *     coloured per vertex by tone and by which way the face looks: a roof
 *     at full tone, the south wall a little darker, the east wall darker
 *     still (ai-iso-skill's three faces, done as shading);
 *   - one fat-line object per line key (the hairline outlines);
 *   - one textured mesh per page of text.
 *
 * The camera never turns, so a face looking away from it can never be
 * seen: solids keep only the faces that look toward the viewer, and only
 * the edges at least one visible face touches.
 *
 * Text written with text() is checked by the context's guard (in
 * development it throws if a figure reaches a scene builder); note() is the
 * unguarded variant, for the whiteboard's pre-formatted figures only.
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { VIEWER, W, type V3 } from './iso';
import type { FillKey, LineKey, TextKey, Theme, Tone } from '../theme';
import type { TextRegistry } from '../context';

export type { Tone } from '../theme';

/** A raw three.js vector (three.js axes, y up): for scales and offsets handed straight to three.js. */
export const v3 = (x = 0, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** What a Part needs from the engine's context. */
export interface PartContext {
  theme: Theme;
  gfx: { aniso: number };
  texts: TextRegistry;
  font: string;
  /** False where no 2D canvas exists (a test environment): text is then checked but not drawn. */
  text2d: boolean;
  guard?: (text: string) => void;
}

/**
 * A figure: an amount with a currency, a percentage, a number with a
 * decimal or thousands separator, a number with a magnitude word, or a bare
 * number of four digits or more. Codes (C111), tickers, counts in prose
 * ("Gate 3", "2 of 2") and quarters ("Q4 25") are not figures.
 */
export const FIGURE = /\b(?:Rp|IDR|USD|US\$|EUR|SGD|JPY|CNY)\s?-?\d|\d\s?%|\d[.,]\d|\d\s?(?:bn|mn|tn|rb|jt|k|m|b|t|juta|ribu|miliar|triliun|thousand|million|billion|trillion)\b|(?<![\w.,])\d{4,}(?!\w)/i;

/** Throws when a string carries a figure: scene builders draw names and words, never numbers from a model. */
export function assertNoFigure(text: string): void {
  if (FIGURE.test(text)) throw new Error(`World engine: a figure reached a scene builder ("${text}"); figures go on the board, or on the whiteboard through Part.note.`);
}

type Anchor = 'start' | 'middle' | 'end';
interface TextSpec { M: THREE.Matrix4; str: string; x: number; y: number; size: number; k: TextKey; anchor: Anchor; lift: number }
interface SolidOptions { seams?: boolean; lines?: boolean }

/** Text at or above this size (world units) is a region label and stays visible at the far view. */
const LARGE_TEXT = 4;
const ATLAS_MAX = 2048;
/** How far each line moves toward the camera, per three.js axis (the viewer looks along -(1, 1, 1)). */
const LINE_BIAS = 0.03;
const noRaycast = () => {};

/** The face's brightness by the way it looks (world normal): roof 1, south wall 0.93, east wall 0.86. */
function shadeOf(nx: number, ny: number, nz: number): number {
  const s = 0.895 + 0.105 * nz - 0.035 * nx + 0.035 * ny;
  return Math.max(0.6, Math.min(1, s));
}
const facing = (nx: number, ny: number, nz: number) => nx * VIEWER[0] + ny * VIEWER[1] + nz * VIEWER[2] > 1e-6;

/** Newell's normal of a planar polygon given in world terms, normalised. */
function newell(pts: readonly V3[]): V3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** Triangles of a simple polygon (any winding, convex or not), as index triples. */
function triangulate(pts: readonly V3[], n: V3): number[][] {
  if (pts.length === 3) return [[0, 1, 2]];
  // flatten onto the axis plane the polygon faces most
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
  const [i, j] = az >= ax && az >= ay ? [0, 1] : ay >= ax ? [0, 2] : [1, 2];
  const flat = pts.map((p) => new THREE.Vector2(p[i], p[j]));
  return THREE.ShapeUtils.triangulateShape(flat, []);
}

const toWorld = (v: THREE.Vector3): V3 => [v.x, v.z, v.y];

export class Part {
  readonly ctx: PartContext;
  private readonly fills = new Map<FillKey, number[]>();
  private readonly solidPos: number[] = [];
  private readonly solidCol: number[] = [];
  private readonly lineSets = new Map<LineKey, number[]>();
  private readonly texts: TextSpec[] = [];
  /** A brightness step for the solids drawn next (PRD v2 §3.2: neighbouring buildings differ by a few per cent). */
  tint = 1;
  /** False keeps the faces that look away from the camera: a model that turns (a vehicle) shows them as it does. */
  cull = true;

  constructor(ctx: PartContext) { this.ctx = ctx; }

  // ---- flat fills ----

  /** One flat triangle (three.js points). */
  tri(k: FillKey, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): this {
    let arr = this.fills.get(k);
    if (!arr) { arr = []; this.fills.set(k, arr); }
    arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    return this;
  }

  /** A flat polygon (three.js points, from W), convex or not. */
  poly(k: FillKey, pts: THREE.Vector3[]): this {
    if (pts.length < 3) return this;
    const w = pts.map(toWorld);
    for (const [a, b, c] of triangulate(w, newell(w))) this.tri(k, pts[a], pts[b], pts[c]);
    return this;
  }

  /** A rectangle in a face's own units: (x, y) its top-left, w right, h down, lifted off the face. */
  fill2(M: THREE.Matrix4, x: number, y: number, w: number, h: number, k: FillKey = 'body', lift = 0): this {
    const p = (u: number, v: number) => new THREE.Vector3(u, v, lift).applyMatrix4(M);
    const a = p(x, y), b = p(x + w, y), c = p(x + w, y + h), d = p(x, y + h);
    return this.tri(k, a, b, c).tri(k, a, c, d);
  }

  // ---- lines ----

  /**
   * One line between two three.js points. Every line but the grid is moved a few centimetres toward the camera,
   * straight along the line of sight, so it wins the depth test against the faces it outlines; the camera is
   * orthographic, so the move does not shift it on screen.
   */
  seg(k: LineKey, a: THREE.Vector3, b: THREE.Vector3): this {
    let arr = this.lineSets.get(k);
    if (!arr) { arr = []; this.lineSets.set(k, arr); }
    const d = k === 'grid' ? 0 : LINE_BIAS;
    arr.push(a.x + d, a.y + d, a.z + d, b.x + d, b.y + d, b.z + d);
    return this;
  }

  /** Segments in a face's own units, four numbers each: x1, y1, x2, y2. */
  draw(M: THREE.Matrix4, segs: readonly number[], k: LineKey = 'line', lift = 0): this {
    for (let i = 0; i + 3 < segs.length; i += 4) {
      this.seg(k, new THREE.Vector3(segs[i], segs[i + 1], lift).applyMatrix4(M), new THREE.Vector3(segs[i + 2], segs[i + 3], lift).applyMatrix4(M));
    }
    return this;
  }

  /** A rectangle's outline in a face's own units. */
  rect2(M: THREE.Matrix4, x: number, y: number, w: number, h: number, k: LineKey = 'line', lift = 0): this {
    return this.draw(M, [x, y, x + w, y, x + w, y, x + w, y + h, x + w, y + h, x, y + h, x, y + h, x, y], k, lift);
  }

  // ---- solids ----

  /** A face of a solid, in world terms, with its outward normal; dropped when it looks away from the camera. */
  private face(pts: readonly V3[], n: V3, tone: Tone): boolean {
    if (this.cull && !facing(n[0], n[1], n[2])) return false;
    const c = this.ctx.theme.tone(tone, shadeOf(n[0], n[1], n[2]) * this.tint);
    for (const [a, b, d] of triangulate(pts, n)) {
      for (const i of [a, b, d]) { const p = pts[i]; this.solidPos.push(p[0], p[2], p[1]); this.solidCol.push(c.r, c.g, c.b); }
    }
    return true;
  }

  private edge(a: V3, b: V3, k: LineKey = 'line'): void { this.seg(k, W(a[0], a[1], a[2]), W(b[0], b[1], b[2])); }

  /**
   * A prism: the polygon pts (world points, in any plane) swept along e.
   * Outlines go round both caps, and down every corner unless seams is
   * false (round things); lines: false leaves the outline off entirely.
   */
  extrude(pts: readonly V3[], e: V3, tone: Tone = 'n', { seams = true, lines = true }: SolidOptions = {}): this {
    if (pts.length < 3) return this;
    const n = newell(pts);
    const along = n[0] * e[0] + n[1] * e[1] + n[2] * e[2];
    if (Math.abs(along) < 1e-9) return this;
    const sgn = along > 0 ? 1 : -1;
    const top = pts.map((p): V3 => [p[0] + e[0], p[1] + e[1], p[2] + e[2]]);
    const baseSeen = this.face(pts, [-n[0] * sgn, -n[1] * sgn, -n[2] * sgn], tone);
    const topSeen = this.face(top, [n[0] * sgn, n[1] * sgn, n[2] * sgn], tone);
    const sideSeen: boolean[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
      let nx = (ey * e[2] - ez * e[1]) * sgn, ny = (ez * e[0] - ex * e[2]) * sgn, nz = (ex * e[1] - ey * e[0]) * sgn;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-12) { sideSeen.push(false); continue; }
      nx /= l; ny /= l; nz /= l;
      sideSeen.push(this.face([a, b, top[(i + 1) % pts.length], top[i]], [nx, ny, nz], tone));
    }
    if (!lines) return this;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length, prev = (i - 1 + pts.length) % pts.length;
      if (baseSeen || sideSeen[i]) this.edge(pts[i], pts[j]);
      if (topSeen || sideSeen[i]) this.edge(top[i], top[j]);
      if (seams && (sideSeen[prev] || sideSeen[i])) this.edge(pts[i], top[i]);
    }
    return this;
  }

  /** A box standing at (x, y, z): w along x, d along y, h up. */
  box(x: number, y: number, z: number, w: number, d: number, h: number, tone: Tone = 'n', o: SolidOptions = {}): this {
    return this.extrude([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], [0, 0, h], tone, o);
  }

  /** An upright cylinder: centre (cx, cy), from z up by h, n sides. */
  cylZ(cx: number, cy: number, z: number, r: number, h: number, n = 12, tone: Tone = 'n'): this {
    const ring: V3[] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); }
    this.extrude(ring, [0, 0, h], tone, { seams: false });
    // the two silhouette lines, where the side turns away from the viewer
    for (const a of [-Math.PI / 4, (3 * Math.PI) / 4]) this.edge([cx + r * Math.cos(a), cy + r * Math.sin(a), z], [cx + r * Math.cos(a), cy + r * Math.sin(a), z + h]);
    return this;
  }

  /** A lying cylinder along +y: its axis at (cx, cz), from y for len, n sides. */
  cylY(cx: number, y: number, cz: number, r: number, len: number, n = 12, tone: Tone = 'n'): this {
    const ring: V3[] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ring.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]); }
    this.extrude(ring, [0, len, 0], tone, { seams: false });
    for (const a of [-Math.PI / 4, (3 * Math.PI) / 4]) this.edge([cx + r * Math.cos(a), y, cz + r * Math.sin(a)], [cx + r * Math.cos(a), y + len, cz + r * Math.sin(a)]);
    return this;
  }

  /** Any three.js geometry, placed by a three.js matrix, shaded face by face; no outline. */
  geo(g: THREE.BufferGeometry, m: THREE.Matrix4, tone: Tone = 'n'): this {
    const pos = g.getAttribute('position');
    if (!pos) return this;
    const index = g.getIndex();
    const count = index ? index.count : pos.count;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    const vertex = (i: number, out: THREE.Vector3) => out.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(m);
    for (let i = 0; i + 2 < count; i += 3) {
      vertex(i, a); vertex(i + 1, b); vertex(i + 2, c);
      const nrm = ab.subVectors(b, a).cross(ac.subVectors(c, a));
      const l = nrm.length(); if (l < 1e-12) continue;
      nrm.divideScalar(l);
      // three.js geometries wind outward faces counter-clockwise, so this is the outward normal; read it in world terms
      const wx = nrm.x, wy = nrm.z, wz = nrm.y;
      if (this.cull && !facing(wx, wy, wz)) continue;
      const col = this.ctx.theme.tone(tone, shadeOf(wx, wy, wz) * this.tint);
      for (const v of [a, b, c]) { this.solidPos.push(v.x, v.y, v.z); this.solidCol.push(col.r, col.g, col.b); }
    }
    return this;
  }

  // ---- text ----

  /** Words on a face: (x, y) the anchor on the baseline, size the font size in world units. Checked by the guard. */
  text(M: THREE.Matrix4, str: string, x: number, y: number, size: number, k: TextKey = 'ink', anchor: Anchor = 'start', lift = 0.02): this {
    this.ctx.guard?.(str);
    return this.note(M, str, x, y, size, k, anchor, lift);
  }

  /** Text that skips the guard: the whiteboard's figures, formatted by the house formatter on the shell's side. */
  note(M: THREE.Matrix4, str: string, x: number, y: number, size: number, k: TextKey = 'ink', anchor: Anchor = 'start', lift = 0.02): this {
    if (this.ctx.text2d && str) this.texts.push({ M, str, x, y, size, k, anchor, lift });
    return this;
  }

  // ---- build ----

  /** The solids drawn so far as one geometry (position and per-vertex colour), for a model drawn many times at once. */
  solidGeometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.solidPos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.solidCol, 3));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    return geo;
  }

  /** Everything drawn so far, merged into one group of meshes. */
  build(name = 'part'): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    const { theme } = this.ctx;
    for (const [k, arr] of this.fills) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      group.add(new THREE.Mesh(geo, theme.fill[k]));
    }
    if (this.solidPos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(this.solidPos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(this.solidCol, 3));
      group.add(new THREE.Mesh(geo, theme.solid));
    }
    for (const [k, arr] of this.lineSets) {
      const line = new LineSegments2(new LineSegmentsGeometry().setPositions(arr), theme.line[k]);
      line.raycast = noRaycast;
      group.add(line);
    }
    if (this.texts.length) this.buildText(group);
    return group;
  }

  /** Text pages: one canvas atlas per colour and size class, one quad per string. */
  private buildText(group: THREE.Group): void {
    const classes = new Map<string, TextSpec[]>();
    for (const t of this.texts) {
      const key = `${t.k}|${t.size >= LARGE_TEXT ? 'large' : 'small'}`;
      const list = classes.get(key); if (list) list.push(t); else classes.set(key, [t]);
    }
    for (const [key, specs] of classes) {
      const large = key.endsWith('large'), k = key.split('|')[0] as TextKey;
      const px = large ? 96 : 48, pad = Math.ceil(px * 0.12), ascent = Math.ceil(px * 0.95), descent = Math.ceil(px * 0.3);
      const cellH = ascent + descent + pad * 2;
      const probe = document.createElement('canvas').getContext('2d');
      if (!probe) return;
      const font = `500 ${px}px ${this.ctx.font}`;
      probe.font = font;
      // shelf-pack the strings into pages no larger than the atlas limit
      interface Cell { spec: TextSpec; w: number; x: number; y: number }
      const pages: { cells: Cell[]; w: number; h: number }[] = [];
      let page = { cells: [] as Cell[], w: 0, h: cellH }, x = 0;
      for (const spec of specs) {
        const w = Math.min(ATLAS_MAX, Math.ceil(probe.measureText(spec.str).width) + pad * 2);
        if (x + w > ATLAS_MAX) { x = 0; page.h += cellH; }
        if (page.h > ATLAS_MAX) { pages.push(page); page = { cells: [], w: 0, h: cellH }; x = 0; }
        page.cells.push({ spec, w, x, y: page.h - cellH });
        x += w; page.w = Math.max(page.w, x);
      }
      if (page.cells.length) pages.push(page);
      for (const pg of pages) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, pg.w); canvas.height = Math.max(1, pg.h);
        const g = canvas.getContext('2d');
        if (!g) return;
        g.font = font; g.fillStyle = 'white'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        for (const c of pg.cells) g.fillText(c.spec.str, c.x + pad, c.y + pad + ascent);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = this.ctx.gfx.aniso;
        const pos: number[] = [], uv: number[] = [];
        const W2 = canvas.width, H2 = canvas.height;
        for (const c of pg.cells) {
          const s = c.spec, unit = s.size / px;
          const width = c.w * unit;
          const left = s.anchor === 'middle' ? s.x - width / 2 : s.anchor === 'end' ? s.x - width + pad * unit : s.x - pad * unit;
          const top = s.y - (ascent + pad) * unit, bottom = s.y + (descent + pad) * unit;
          const corner = (u: number, v: number) => new THREE.Vector3(u, v, s.lift).applyMatrix4(s.M);
          const p00 = corner(left, top), p10 = corner(left + width, top), p11 = corner(left + width, bottom), p01 = corner(left, bottom);
          const u0 = c.x / W2, u1 = (c.x + c.w) / W2, v0 = 1 - c.y / H2, v1 = 1 - (c.y + cellH) / H2;
          for (const [p, tu, tv] of [[p00, u0, v0], [p10, u1, v0], [p11, u1, v1], [p00, u0, v0], [p11, u1, v1], [p01, u0, v1]] as const) { pos.push(p.x, p.y, p.z); uv.push(tu, tv); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        const mesh = new THREE.Mesh(geo, this.ctx.theme.textMaterial(k, tex));
        mesh.userData.small = !large;
        mesh.raycast = noRaycast;
        if (this.ctx.texts.far && !large) mesh.visible = false;
        this.ctx.texts.meshes.push(mesh);
        group.add(mesh);
      }
    }
  }
}

/** Small text hides at the far view, where it would be a smudge; region labels stay. */
export function setTextFar(texts: TextRegistry, far: boolean): void {
  texts.far = far;
  for (const m of texts.meshes) if (m.userData.small) m.visible = !far;
}

/** Stand an object at world (x, y, z), turned to heading h (radians from +x toward +y). */
export function pose(o: THREE.Object3D, x: number, y: number, h = 0, z = 0): void {
  o.position.set(x, z, y);
  o.rotation.set(0, -h, 0);
}
