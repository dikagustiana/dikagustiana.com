/**
 * The poster (PRD §7.1, §8.7; PRD v2 §3.1): the hero, the world's home view,
 * rendered headlessly to SVG from the same generated layout the engine
 * builds from, so the picture a visitor sees before the engine loads can
 * never drift from the registry and is the frame the engine opens on.
 * Written to public/world/poster-far.svg (the name the page preloads) and
 * committed; the build regenerates it and a test fails on drift.
 *
 *   node scripts/world/render-poster.mjs      (also the first step of npm run build)
 *
 * It draws what the hero shows at the district band: the slab, the regions,
 * the water, the hill, the roads (the raw-export road dashed), every company's
 * lot as an isometric prism (a large family's shared form and its office
 * units), the fixtures and the region labels, leaving out what falls outside
 * the frame. No status, no ticker, no figure: the poster is the world at rest,
 * the same for every visitor.
 *
 * It is the landing page's largest paint with the world on (gate 4, O8), so
 * it is written small: integer coordinates (one unit is under half a pixel
 * at the widest the stage gets), relative path commands, a prism as two
 * paths (its outline, then its top with the front edge) instead of three
 * outlined faces, the roads of one width as one path, and the shared
 * paint in a style sheet and on groups instead of on every shape. The frame
 * (the viewBox) and the drawing order are the ones the poster always had.
 *
 * Colours: the site's light-theme tokens (src/index.css) resolved once here,
 * because a static image cannot read CSS variables. The table below is the
 * only place they are written.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Light-theme tokens from src/index.css, as sRGB hex. */
export const POSTER_COLOURS = {
  background: '#fafafa',      // --background 0 0% 98%
  card: '#f0f5f7',            // --card 200 40% 96%
  muted: '#e7ecee',           // --muted 200 20% 92%
  border: '#dae0e6',          // --border 215 20% 88%
  secondary: '#ebf1f4',       // --secondary 200 30% 94%
  mutedForeground: '#62728a', // --muted-foreground 215 15% 45%
  foreground: '#212936',      // --foreground 215 25% 17%
  accent: '#214983',          // --accent 215 60% 32%
};

const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
/** The isometric projection the engine's camera makes, after ai-iso-skill: +x down-right, +y down-left, +z up. */
export const P = (x, y, z = 0) => [(x - y) * C30, (x + y) * S30 - z];

const fmt = (n) => (Math.round(n * 10) / 10).toString();
// Math.round(-0.5) is -0; written as "0", not "-0"
const int = (n) => Math.round(n) + 0;

/**
 * A path's d from projected points: an absolute move to the first, then
 * relative steps in whole units (h and v where one coordinate holds),
 * closed with z when asked. A step that rounds to nothing is dropped.
 */
export function pathData(pts, close = false) {
  const q = pts.map(([x, y]) => [int(x), int(y)]);
  let d = `M${q[0][0]} ${q[0][1]}`;
  for (let i = 1; i < q.length; i++) {
    const dx = q[i][0] - q[i - 1][0], dy = q[i][1] - q[i - 1][1];
    if (!dx && !dy) continue;
    d += dx === 0 ? `v${dy}` : dy === 0 ? `h${dx}` : `l${dx}${dy < 0 ? '' : ' '}${dy}`;
  }
  return close ? `${d}z` : d;
}

/**
 * An isometric prism for a box standing on z0 with height h, as two paths:
 * the outline (the south and east faces' silhouette, in the group's side
 * fill), then the top (class t) with the vertical front edge as an open
 * subpath, so every edge the three outlined faces drew is drawn once.
 */
function prism(b, h, z0 = 0, attrs = '') {
  const { x0, x1, y0, y1 } = b;
  const z1 = z0 + h;
  const outline = pathData([P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), P(x0, y1, z1)], true);
  const top = pathData([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], true) + pathData([P(x1, y1, z1), P(x1, y1, z0)]);
  return `<path${attrs} d="${outline}"/><path class="t" d="${top}"/>`;
}

/** Heights by family, the far view's reading of them. */
const HEIGHT = { pit: 1, 'well-pad': 6, quarry: 3, stockpile: 6, 'plantation-block': 3, field: 2, pond: 2, 'forest-block': 5, 'process-plant': 14, factory: 9, 'packaging-plant': 8, 'power-plant': 16, 'water-plant': 4, warehouse: 9, 'cold-store': 10, 'operator-office': 6, quay: 12, apron: 7, interchange: 7, 'rail-yard': 4, '3pl-shed': 9, depot: 7, 'market-hall': 8, supermarket: 6, minimarket: 4, 'department-store': 14, shop: 5, dealership: 6, hotel: 26, restaurant: 4, cinema: 11, school: 7, hospital: 18, clinic: 5, lab: 7, 'office-tower': 29, 'bank-tower': 38, exchange: 12, 'recycling-plant': 10, 'scrap-yard': 3, 'compost-site': 2, 'telecom-tower': 46, 'construction-site': 12, 'think-tank': 7 };

/** Families drawn as one shared form behind an office unit per company (PRD v2 §3.5); the office strip's depth. */
const LARGE = new Set(['pit', 'quarry', 'plantation-block', 'field', 'pond', 'forest-block', 'quay', 'apron', 'interchange', 'rail-yard', 'power-plant']);
const OFFICE_STRIP = 12, OFFICE_HEIGHT = 4.4;
/** The stage was laid out for a 1600 by 952 image (gate 4, O8): the frame keeps that aspect. */
const ASPECT = 1600 / 952;

/**
 * The frame: the hero (PRD v2 §3.1) as the engine opens on it on the reference stage of 1,246 × 700 px, the hero's
 * ground fitted with the engine's margin but never below its floor of 1.25 px/m, centred where the engine centres it;
 * at the stage's aspect. One metre of the engine's screen is cos 30° × √2 poster units (both are the same isometric
 * projection), so the frame is the engine's to the pixel at that stage.
 */
const STAGE = { w: 1246, h: 700 }, HERO_ZOOM = 1.25, MARGIN = 1.04, UNIT = C30 * Math.SQRT2;
export function heroFrame(layout) {
  const b = layout.hero ?? layout.world, pts = [];
  for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [0, 20]) pts.push(P(x, y, z));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rSpan = (Math.max(...xs) - Math.min(...xs)) / UNIT, uSpan = (Math.max(...ys) - Math.min(...ys)) / UNIT;
  const zoom = Math.max(HERO_ZOOM, Math.min(STAGE.w / (rSpan * MARGIN), STAGE.h / (uSpan * MARGIN)));
  const fh = (STAGE.h / zoom) * UNIT, fw = fh * ASPECT;
  return { x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh };
}

/**
 * Every company as a building: a lot's prism at its family's height, a large family's shared form behind its office
 * units; then the fixtures. The poster draws those near its frame, back to front (nearer = larger x + y).
 */
export function posterSolids(layout) {
  const solids = [];
  for (const b of layout.blocks) {
    const h = HEIGHT[b.family] ?? 6;
    if (LARGE.has(b.family)) {
      const side = b.entry ?? b.front, shared = side === 's' ? { ...b.box, y1: b.box.y1 - OFFICE_STRIP } : side === 'n' ? { ...b.box, y0: b.box.y0 + OFFICE_STRIP } : { ...b.box, x1: b.box.x1 - OFFICE_STRIP };
      solids.push({ id: b.id, box: shared, h });
      for (const l of b.lots ?? []) solids.push({ id: l.id, box: l.box, h: OFFICE_HEIGHT });
    } else for (const l of b.lots ?? []) solids.push({ id: l.id, box: l.box, h });
  }
  for (const f of layout.fixtures) solids.push({ id: f.id, box: f.box, h: HEIGHT[f.kind] ?? 6, z0: f.kind === 'think-tank' && layout.hill ? layout.hill.height : 0 });
  return solids;
}

export function renderPoster(layout, c = POSTER_COLOURS) {
  const w = layout.world, frame = heroFrame(layout);
  // what lies wholly outside the frame (with a margin for strokes) is left out
  const near = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return Math.max(...xs) >= frame.x - 40 && Math.min(...xs) <= frame.x + frame.w + 40 && Math.max(...ys) >= frame.y - 40 && Math.min(...ys) <= frame.y + frame.h + 40; };
  const boxPts = (b, h = 0) => [P(b.x0, b.y0, 0), P(b.x1, b.y0, 0), P(b.x1, b.y1, 0), P(b.x0, b.y1, 0), P(b.x0, b.y0, h), P(b.x1, b.y1, h)];
  // the ground: the slab (its outline in muted, its top in the background), the regions, the water, the hill
  const ground = [prism(w, 4, 0, ` fill="${c.muted}"`)];
  for (const r of layout.regions) {
    const fill = r.id === 'estate' ? c.border : r.id === 'gateway' ? c.card : r.id === 'town' || r.id === 'recovery' ? c.card : r.id === 'hill' ? 'none' : c.muted;
    const pts = r.polygon.map(([x, y]) => P(x, y, 0.1));
    if (fill !== 'none' && near(pts)) ground.push(`<path fill="${fill}" d="${pathData(pts, true)}"/>`);
  }
  if (layout.port) { const wb = layout.port.water, pts = [P(wb.x0, wb.y0, 0), P(wb.x1, wb.y0, 0), P(wb.x1, wb.y1, 0), P(wb.x0, wb.y1, 0)]; if (near(pts)) ground.push(`<path fill="${c.secondary}" d="${pathData(pts, true)}"/>`); }
  if (layout.hill) { const { centre: [cx, cy], radius, height } = layout.hill; for (let k = 0; k < 3; k++) { const r = radius * (1 - k * 0.28), z = (height / 3) * (k + 1), ring = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; ring.push(P(cx + r * Math.cos(a), cy + r * 0.8 * Math.sin(a), z)); } if (near(ring)) ground.push(`<path fill="${c.muted}" d="${pathData(ring, true)}"/>`); } }
  // roads: one path per stroke width, in the order the widths first appear; the raw-export road dashed
  const byWidth = new Map();
  for (const r of layout.roads) {
    const pts = r.points.map(([x, y]) => P(x, y, 0.2));
    if (r.closed) pts.push(pts[0]);
    if (!near(pts)) continue;
    const key = r.dashed ? 'dashed' : fmt(Math.max(1, r.width / 5));
    byWidth.set(key, (byWidth.get(key) ?? '') + pathData(pts));
  }
  const roads = [...byWidth].map(([k, d]) => (k === 'dashed' ? `<path stroke-dasharray="6 4" d="${d}"/>` : `<path stroke-width="${k}" d="${d}"/>`));
  const blocks = posterSolids(layout).filter((s) => near(boxPts(s.box, s.h + (s.z0 ?? 0)))).sort((a, b) => (a.box.x0 + a.box.y0) - (b.box.x0 + b.box.y0)).map((s) => prism(s.box, s.h, s.z0 ?? 0));
  // region labels
  const labels = layout.labels.filter((x) => x.level === 'far').map((l) => { const [x, y] = P(l.at[0], l.at[1], 0); return `<text x="${int(x)}" y="${int(y)}">${l.text.toUpperCase()}</text>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(frame.x)} ${fmt(frame.y)} ${fmt(frame.w)} ${fmt(frame.h)}" role="img" aria-label="The industrial estate as the world opens: the estate at the centre with its companies' buildings, the ring of primary resources above it, the gateway and port to the east. A still of the world before it starts.">
<style>path{vector-effect:non-scaling-stroke;stroke-linejoin:round}.t{fill:${c.background}}</style>
<rect x="${fmt(frame.x)}" y="${fmt(frame.y)}" width="${fmt(frame.w)}" height="${fmt(frame.h)}" fill="${c.background}"/>
<g stroke="${c.border}">${ground.join('')}</g>
<g fill="none" stroke="${c.mutedForeground}">${roads.join('')}</g>
<g fill="${c.card}" stroke="${c.mutedForeground}">${blocks.join('')}</g>
<g font-family="'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" font-size="22" letter-spacing="2" text-anchor="middle" fill="${c.mutedForeground}">${labels.join('')}</g>
</svg>
`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { LAYOUT } = await import(path.join(ROOT, 'src/world/placement/layout.generated.ts'));
  const svg = renderPoster(LAYOUT);
  const target = path.join(ROOT, 'public/world/poster-far.svg');
  const same = fs.existsSync(target) && fs.readFileSync(target, 'utf8') === svg;
  if (!same) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, svg); }
  console.log(`render-poster: ${(svg.length / 1024).toFixed(1)} KB · ${same ? 'unchanged' : 'written'}`);
}
