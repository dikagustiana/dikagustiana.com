// Adapted from Factory Yard (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { W, type V3 } from './iso';
import type { FillKey, LineKey, TextKey, Theme } from '../theme';
import type { TextRegistry } from '../context';

// ---- parts: boxes and flat detail, collected into a few draw calls ----
export const v3 = (x = 0, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);
export const noop = (): void => {};

export type Tone = 'n' | 'k' | 'g' | 'gr' | 'gs' | 'l' | 'w' | 's' | 'nb' | 'kb';
const TONE: Record<Tone, [FillKey, FillKey, LineKey]> = {
  n: ['body', 'deck', 'line'], k: ['kob', 'kod', 'koline'], g: ['glass', 'glass', 'line'], gr: ['body', 'ground', 'line'], gs: ['body', 'grass', 'line'],
  l: ['lamp', 'lamp', 'line'], w: ['window', 'window', 'line'], s: ['body', 'sand', 'line'],
  // one fill for every face: small moving parts (a person's limbs) cost two draw calls instead of three
  nb: ['body', 'body', 'line'], kb: ['kob', 'kob', 'koline'],
};
export const TEX_PX = 64;

/** What a Part needs from the world it is drawn into. */
export interface PartContext {
  theme: Theme;
  gfx: { aniso: number };
  texts: TextRegistry;
  font: string;
  text2d: boolean;
  /** Development only: throws if a figure with a currency or a unit is about to be drawn (mega prompt §8.1). */
  guard?: (text: string) => void;
}

/** A figure a scene builder must never draw: a rupiah amount, a percentage, a thousands-grouped number, a number with a unit. */
export const FIGURE = /(^|[\s(])(Rp|USD|IDR)\s?\d|\d\s?%|\d{1,3}([.,]\d{3})+|\b\d+([.,]\d+)?\s?(bn|mn|jt|tn|rb|USD|IDR)\b/i;
export function assertNoFigure(text: string): void {
  if (FIGURE.test(text)) throw new Error(`world: a figure reached a scene builder: "${text}" (PRD §9.3.4; figures live on cards and the board)`);
}

interface TextSpec { M: THREE.Matrix4; str: string; x: number; y: number; size: number; k: TextKey; anchor: 'start' | 'middle' | 'end'; lift: number }
type Anchor = TextSpec['anchor'];

export class Part {
  fill: Partial<Record<FillKey, number[]>> = {};
  lines: Partial<Record<LineKey, number[]>> = {};
  texts: TextSpec[] = [];
  constructor(readonly ctx: PartContext) {}
  tri(k: FillKey, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void { (this.fill[k] ??= []).push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); }
  poly(k: FillKey, p: THREE.Vector3[]): void { for (let i = 1; i < p.length - 1; i++) this.tri(k, p[0], p[i], p[i + 1]); }
  seg(k: LineKey, a: THREE.Vector3, b: THREE.Vector3): this { (this.lines[k] ??= []).push(a.x, a.y, a.z, b.x, b.y, b.z); return this; }
  // A flat polygon swept along e. Faces are turned to point away from the solid's middle; up-facing ones take the
  // deck fill, and only those steeper than 35° downward are left out, since the camera never sees them at any heading.
  extrude(pts: readonly V3[], e: V3, tone: Tone = 'n', { seams = true, lines = true }: { seams?: boolean; lines?: boolean } = {}): this {
    const [bodyK, deckK, lineK] = TONE[tone];
    const A = pts.map((p) => W(...p)), E = W(...e), B = A.map((p) => p.clone().add(E));
    const mid = [...A, ...B].reduce((s, p) => s.add(p), v3()).multiplyScalar(1 / (A.length * 2));
    const face = (q: THREE.Vector3[]) => {
      const n = v3().crossVectors(q[1].clone().sub(q[0]), q[2].clone().sub(q[0])).normalize();
      if (n.dot(q.reduce((s, p) => s.add(p), v3()).multiplyScalar(1 / q.length).sub(mid)) < 0) n.negate();
      if (n.y < -0.82) return;
      this.poly(n.y > 0.6 ? deckK : bodyK, q);
    };
    face(A); face(B);
    for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; face([A[i], A[j], B[j], B[i]]); }
    if (lines) for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length;
      this.seg(lineK, A[i], A[j]); this.seg(lineK, B[i], B[j]); if (seams) this.seg(lineK, A[i], B[i]); }
    return this;
  }
  // box at (x,y,z), size w along x, d along y, h along z — same signature as the skill's box()
  box(x: number, y: number, z: number, w: number, d: number, h: number, tone?: Tone, o?: { seams?: boolean; lines?: boolean }): this {
    return this.extrude([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], [0, 0, h], tone, o);
  }
  cylZ(cx: number, cy: number, z: number, r: number, h: number, n = 12, tone?: Tone): this {
    const p: V3[] = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); }
    return this.extrude(p, [0, 0, h], tone, { seams: false });
  }
  cylY(cx: number, y: number, cz: number, r: number, len: number, n = 10, tone?: Tone): this {
    const p: V3[] = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]); }
    return this.extrude(p, [0, len, 0], tone, { seams: false });
  }
  // 2D linework in a face's local units, like drawing inside the skill's <g transform="${FRONT(…)}">.
  // lift nudges it off the face along the outward normal (negative for faces whose plane normal points out).
  draw(M: THREE.Matrix4, segs: readonly number[], k: LineKey = 'detail', lift = 0.04): this {
    const off = v3().setFromMatrixColumn(M, 2).normalize().multiplyScalar(-lift);
    const at = (u: number, v: number) => v3(u, v, 0).applyMatrix4(M).add(off);
    for (let i = 0; i < segs.length; i += 4) this.seg(k, at(segs[i], segs[i + 1]), at(segs[i + 2], segs[i + 3]));
    return this;
  }
  rect2(M: THREE.Matrix4, x: number, y: number, w: number, h: number, k?: LineKey, lift?: number): this {
    return this.draw(M, [x, y, x + w, y, x + w, y, x + w, y + h, x + w, y + h, x, y + h, x, y + h, x, y], k, lift);
  }
  fill2(M: THREE.Matrix4, x: number, y: number, w: number, h: number, k: FillKey = 'glass', lift = 0.03): this {
    const off = v3().setFromMatrixColumn(M, 2).normalize().multiplyScalar(-lift);
    const at = (u: number, v: number) => v3(u, v, 0).applyMatrix4(M).add(off);
    this.poly(k, [at(x, y), at(x + w, y), at(x + w, y + h), at(x, y + h)]);
    return this;
  }
  text(M: THREE.Matrix4, str: string, x: number, y: number, size: number, k: TextKey = 'ink', anchor: Anchor = 'start', lift = 0.035): this {
    this.ctx.guard?.(str);
    this.texts.push({ M, str, x, y, size, k, anchor, lift }); return this;
  }
  // any three.js geometry, flat-filled by facet direction, every facet edge a hairline
  geo(g: THREE.BufferGeometry, m: THREE.Matrix4, tone: Tone = 'n'): this {
    const [bodyK, deckK, lineK] = TONE[tone];
    const geom = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    const p = geom.attributes.position as THREE.BufferAttribute, a = v3(), b = v3(), c = v3(), n = v3();
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
      if (n.y > -0.82) this.tri(n.y > 0.45 ? deckK : bodyK, a, b, c);
    }
    const e = new THREE.EdgesGeometry(geom).attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < e.count; i += 2) this.seg(lineK, a.fromBufferAttribute(e, i).clone(), b.fromBufferAttribute(e, i + 1).clone());
    return this;
  }
  // another part's faces and lines, turned to heading h and set down at (x, y, z): a model drawn into a shared part
  // at any angle (texts are left out)
  put(q: Part, x: number, y: number, h = 0, z = 0): this {
    const m = new THREE.Matrix4().makeRotationY(-h).setPosition(x, z, y), v = v3();
    const copy = <K extends string>(src: Partial<Record<K, number[]>>, dst: Partial<Record<K, number[]>>) => {
      for (const k of Object.keys(src) as K[]) { const a = src[k]!, o = (dst[k] ??= []);
        for (let i = 0; i < a.length; i += 3) { v.set(a[i], a[i + 1], a[i + 2]).applyMatrix4(m); o.push(v.x, v.y, v.z); } }
    };
    copy(q.fill, this.fill); copy(q.lines, this.lines);
    return this;
  }
  build(name?: string): THREE.Group {
    const g = new THREE.Group(); if (name) g.name = name;
    for (const k of Object.keys(this.fill) as FillKey[]) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(this.fill[k]!, 3));
      const m = new THREE.Mesh(geo, this.ctx.theme.fill[k]); m.userData.fill = k; g.add(m);
    }
    for (const k of Object.keys(this.lines) as LineKey[]) {
      const l = new LineSegments2(new LineSegmentsGeometry().setPositions(this.lines[k]!), this.ctx.theme.line[k]);
      l.userData.line = k; l.raycast = noop; g.add(l);
    }
    for (const t of this.texts) { const m = textMesh(this.ctx, t); if (m) g.add(m); }
    return g;
  }
}

// From far away (a few pixels a metre) lettering is a smudge: small text is left out there, a draw call each saved
export const setTextFar = (texts: TextRegistry, far: boolean): void => { texts.far = far; for (const m of texts.meshes) m.visible = !far || m.userData.textSize >= 3; };

// Text drawn flat on a plane: a canvas glyph texture (white) tinted by its token colour. Where no 2D canvas exists
// (a headless test), the text is left out rather than drawn wrong.
function textMesh(ctx: PartContext, { M, str, x, y, size, k, anchor, lift }: TextSpec): THREE.Mesh | null {
  if (!ctx.text2d || typeof document === 'undefined') return null;
  const font = `500 ${TEX_PX}px ${ctx.font}`;
  const c = document.createElement('canvas'), g = c.getContext('2d');
  if (!g) return null;
  g.font = font;
  c.width = Math.ceil(g.measureText(str).width) + 8; c.height = Math.round(TEX_PX * 1.25);
  // the glyphs are a white mask; the token colour tints them through the material, so no colour is chosen here
  g.font = font; g.fillStyle = 'white'; g.fillText(str, 4, TEX_PX * 0.95);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = ctx.gfx.aniso;
  const s = size / TEX_PX, w = c.width * s, h = c.height * s;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x - 4 * s, top = y - TEX_PX * 0.95 * s;
  const geo = new THREE.PlaneGeometry(w, h).scale(1, -1, 1).translate(x0 + w / 2, top + h / 2, 0).applyMatrix4(M);
  const off = v3().setFromMatrixColumn(M, 2).normalize().multiplyScalar(-lift);
  geo.translate(off.x, off.y, off.z);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: ctx.theme.textColor(k) });
  ctx.theme.text[k].push(mat);
  const mesh = new THREE.Mesh(geo, mat); mesh.raycast = noop; mesh.userData.textSize = size; mesh.visible = !ctx.texts.far || size >= 3; ctx.texts.meshes.push(mesh); return mesh;
}
export const pose = (o: THREE.Object3D, x: number, y: number, h = 0, z = 0): void => { o.position.set(x, z, y); o.rotation.y = -h; };
// light a part up: its faces take the live colour (LineSegments2 is also a Mesh, so go by the fill key)
export const glow = (theme: Theme, g: THREE.Object3D, on: boolean): void => {
  for (const m of g.children) { const k = m.userData.fill as FillKey | undefined; if (k && m instanceof THREE.Mesh) m.material = on ? theme.fill.livef : theme.fill[k]; }
};
