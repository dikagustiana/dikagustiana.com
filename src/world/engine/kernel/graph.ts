// Adapted from Factory Yard (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
import { clamp } from './math';
import type { Pt } from './path';

// ---- sites: a little graph of corridors each; locations hang off it at an entry point E ----
export interface SiteHit { x: number; y: number; si: number; d?: number }
export interface SiteOptions {
  name: string;
  /** The corridor's lane, where vehicles enter the site. */
  lane?: number;
  nodes: Record<string, Pt>;
  segs: readonly (readonly [string, string])[];
}
export class Site {
  name: string;
  lane: number | undefined;
  nodes: Record<string, Pt>;
  segs: readonly (readonly [string, string])[];
  /** Whoever works the site; the forklift simulation fills it. */
  workers: unknown[] = [];
  constructor(o: SiteOptions) { this.name = o.name; this.lane = o.lane; this.nodes = o.nodes; this.segs = o.segs; }
  onSeg(x: number, y: number, si: number): SiteHit {
    const [p, q] = this.segs[si].map((k) => this.nodes[k]), dx = q[0] - p[0], dy = q[1] - p[1];
    const t = clamp(((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy), 0, 1);
    return { x: p[0] + dx * t, y: p[1] + dy * t, si };
  }
  at(x: number, y: number): SiteHit {
    let best: SiteHit | null = null;
    for (let si = 0; si < this.segs.length; si++) {
      const q = this.onSeg(x, y, si), d = Math.hypot(q.x - x, q.y - y);
      if (!best || d < (best.d ?? Infinity) - 1e-6) best = { ...q, d };
    }
    return best as SiteHit;
  }
  route(p: SiteHit, q: SiteHit): Pt[] {
    if (p.si === q.si) return [[p.x, p.y], [q.x, q.y]];
    const N = this.nodes, S = this.segs, d = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const dist: Record<string, number> = {}, prev: Record<string, string | null> = {}, open = new Set(Object.keys(N));
    for (const k of open) dist[k] = Infinity;
    for (const k of S[p.si]) { dist[k] = d([p.x, p.y], N[k]); prev[k] = null; }
    while (open.size) {
      let u: string | null = null; for (const k of open) if (u === null || dist[k] < dist[u]) u = k;
      if (u === null) break;
      open.delete(u);
      for (const [a, b] of S) { const w = a === u ? b : b === u ? a : null;
        if (w && open.has(w) && dist[u] + d(N[u], N[w]) < dist[w]) { dist[w] = dist[u] + d(N[u], N[w]); prev[w] = u; } }
    }
    const [e1, e2] = S[q.si], end = dist[e1] + d(N[e1], [q.x, q.y]) < dist[e2] + d(N[e2], [q.x, q.y]) ? e1 : e2;
    const chain: Pt[] = []; for (let k: string | null | undefined = end; k !== null && k !== undefined; k = prev[k]) chain.unshift(N[k]);
    return [[p.x, p.y], ...chain, [q.x, q.y]];
  }
}
// keep to one side of the corridor so vehicles pass instead of meeting head on
export function keepSide(pts: readonly Pt[], off = 1.2): Pt[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    let k = off;
    if (i > 0 && i < pts.length - 1) { const ix = p[0] - a[0], iy = p[1] - a[1], il = Math.hypot(ix, iy) || 1; k = off / Math.max(0.5, (ix * dx + iy * dy) / il); }
    return [p[0] - dy * k, p[1] + dx * k];
  });
}
export const dedupe = (pts: readonly Pt[]): Pt[] => pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.3);
