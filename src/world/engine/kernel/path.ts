// Original to this repository (Kawasan Industri world engine, fallback kernel).
/**
 * A path through a list of points in the ground plane, with its corners
 * rounded: straight runs joined by circular fillets of a given radius
 * (smaller where two corners are close). Vehicles move along it by arc
 * length; at(s) gives the position and the heading there, the heading being
 * the angle of travel measured from +x toward +y.
 *
 * A closed path wraps around (s modulo the length); an open one clamps.
 */

export type Pt = readonly [x: number, y: number];

/** A position on the path and the direction of travel there. */
export interface Pose { x: number; y: number; h: number }

/** A straight run from (x, y) along heading h. */
interface Run { kind: 'run'; start: number; len: number; x: number; y: number; h: number }
/** A circular fillet: centre, radius, the angle it starts at and the signed angle it turns through. */
interface Bend { kind: 'bend'; start: number; len: number; cx: number; cy: number; r: number; from: number; turn: number }
type Piece = Run | Bend;

const TAU = Math.PI * 2;

export class Path {
  /** Total arc length. */
  readonly length: number;
  readonly closed: boolean;
  /** Optional height along the path (a road on a slope); vehicles read it when present. */
  zs?: (s: number) => number;
  private readonly pieces: Piece[];

  constructor(points: readonly Pt[], radius = 0, closed = false) {
    // drop repeated points, and the closing duplicate of a closed loop
    const pts: Pt[] = [];
    for (const p of points) { const q = pts[pts.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-9) pts.push(p); }
    if (closed && pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-9) pts.pop();
    this.closed = closed && pts.length > 2;
    this.pieces = [];
    if (pts.length < 2) {
      const p = pts[0] ?? [0, 0];
      this.pieces.push({ kind: 'run', start: 0, len: 0, x: p[0], y: p[1], h: 0 });
      this.length = 0;
      return;
    }
    const n = pts.length;
    const legs = this.closed ? n : n - 1;
    const leg = (i: number) => { const a = pts[i % n], b = pts[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); return { a, b, len, ux: dx / len, uy: dy / len }; };

    // the fillet at each corner: where it leaves the incoming leg and joins the outgoing one
    interface Corner { inX: number; inY: number; outX: number; outY: number; bend: Omit<Bend, 'start'> | null }
    const corners = new Map<number, Corner>();
    const firstCorner = this.closed ? 0 : 1, lastCorner = this.closed ? n - 1 : n - 2;
    for (let i = firstCorner; i <= lastCorner; i++) {
      const p = pts[i], inLeg = leg((i - 1 + n) % n), outLeg = leg(i);
      const cos = Math.max(-1, Math.min(1, inLeg.ux * outLeg.ux + inLeg.uy * outLeg.uy));
      const turnAngle = Math.acos(cos);
      const side = inLeg.ux * outLeg.uy - inLeg.uy * outLeg.ux;
      if (radius <= 0 || turnAngle < 1e-4 || Math.PI - turnAngle < 1e-4) { corners.set(i, { inX: p[0], inY: p[1], outX: p[0], outY: p[1], bend: null }); continue; }
      // the tangent length the radius asks for, kept within half of each leg so neighbouring fillets never overlap
      const t = Math.min(radius * Math.tan(turnAngle / 2), inLeg.len / 2, outLeg.len / 2);
      const r = t / Math.tan(turnAngle / 2);
      const inX = p[0] - inLeg.ux * t, inY = p[1] - inLeg.uy * t, outX = p[0] + outLeg.ux * t, outY = p[1] + outLeg.uy * t;
      // the centre lies to the side the path turns toward
      const s = side > 0 ? 1 : -1;
      const cx = inX - inLeg.uy * r * s, cy = inY + inLeg.ux * r * s;
      corners.set(i, { inX, inY, outX, outY, bend: { kind: 'bend', len: r * turnAngle, cx, cy, r, from: Math.atan2(inY - cy, inX - cx), turn: s * turnAngle } });
    }

    let s = 0;
    const push = (p: Omit<Run, 'start'> | Omit<Bend, 'start'>) => { if (p.len > 1e-9) { this.pieces.push({ ...p, start: s } as Piece); s += p.len; } };
    for (let i = 0; i < legs; i++) {
      const from = corners.get(i), to = corners.get((i + 1) % n);
      const ax = from ? from.outX : pts[i][0], ay = from ? from.outY : pts[i][1];
      const bx = to ? to.inX : pts[(i + 1) % n][0], by = to ? to.inY : pts[(i + 1) % n][1];
      const len = Math.hypot(bx - ax, by - ay);
      push({ kind: 'run', len, x: ax, y: ay, h: Math.atan2(by - ay, bx - ax) });
      if (to?.bend && (this.closed || i + 1 < n - 1)) push(to.bend);
    }
    if (!this.pieces.length) this.pieces.push({ kind: 'run', start: 0, len: 0, x: pts[0][0], y: pts[0][1], h: 0 });
    this.length = s;
  }

  /** The pose at arc length s. */
  at(s: number): Pose {
    const L = this.length;
    if (L <= 0) { const p = this.pieces[0] as Run; return { x: p.x, y: p.y, h: p.kind === 'run' ? p.h : 0 }; }
    s = this.closed ? ((s % L) + L) % L : Math.max(0, Math.min(L, s));
    // binary search for the piece holding s
    let lo = 0, hi = this.pieces.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.pieces[mid].start <= s) lo = mid; else hi = mid - 1; }
    return poseOn(this.pieces[lo], s - this.pieces[lo].start);
  }

  /** The arc length of the point on the path nearest to (x, y), sampled every metre or so. */
  nearest(x: number, y: number): number {
    let best = 0, bestD = Infinity;
    const steps = Math.max(1, Math.ceil(this.length));
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * this.length, p = this.at(s), d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }
}

function poseOn(p: Piece, u: number): Pose {
  if (p.kind === 'run') return { x: p.x + Math.cos(p.h) * u, y: p.y + Math.sin(p.h) * u, h: p.h };
  const a = p.from + (p.turn > 0 ? 1 : -1) * (u / p.r);
  const h = a + (p.turn > 0 ? Math.PI / 2 : -Math.PI / 2);
  return { x: p.cx + p.r * Math.cos(a), y: p.cy + p.r * Math.sin(a), h: ((h % TAU) + TAU) % TAU };
}
