/**
 * The poster (PRD §7.1, §8.7; mega prompt §6.3): the far view of the world,
 * rendered headlessly to SVG from the same generated layout the engine
 * builds from, so the picture a visitor sees before the engine loads can
 * never drift from the registry. Written to public/world/poster-far.svg and
 * committed; the build regenerates it and a test fails on drift.
 *
 *   node scripts/world/render-poster.mjs      (also the first step of npm run build)
 *
 * It draws what the far view draws: the slab, the regions, the water, the
 * hill, the roads (the raw-export road dashed), every block as an isometric
 * prism and the region labels. No status, no company, no figure: the
 * poster is the world at rest, the same for every visitor.
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

export function renderPoster(layout, c = POSTER_COLOURS) {
  const w = layout.world;
  // the ground: the slab (its outline in muted, its top in the background), the regions, the water, the hill
  const ground = [prism(w, 4, 0, ` fill="${c.muted}"`)];
  for (const r of layout.regions) {
    const fill = r.id === 'estate' ? c.border : r.id === 'gateway' ? c.card : r.id === 'town' || r.id === 'recovery' ? c.card : r.id === 'hill' ? 'none' : c.muted;
    if (fill !== 'none') ground.push(`<path fill="${fill}" d="${pathData(r.polygon.map(([x, y]) => P(x, y, 0.1)), true)}"/>`);
  }
  if (layout.port) { const wb = layout.port.water; ground.push(`<path fill="${c.secondary}" d="${pathData([P(wb.x0, wb.y0, -0.6), P(wb.x1, wb.y0, -0.6), P(wb.x1, wb.y1, -0.6), P(wb.x0, wb.y1, -0.6)], true)}"/>`); }
  if (layout.hill) { const { centre: [cx, cy], radius, height } = layout.hill; for (let k = 0; k < 3; k++) { const r = radius * (1 - k * 0.28), z = (height / 3) * (k + 1), ring = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; ring.push(P(cx + r * Math.cos(a), cy + r * 0.8 * Math.sin(a), z)); } ground.push(`<path fill="${c.muted}" d="${pathData(ring, true)}"/>`); } }
  // roads: one path per stroke width, in the order the widths first appear; the raw-export road dashed
  const byWidth = new Map();
  for (const r of layout.roads) {
    const pts = r.points.map(([x, y]) => P(x, y, 0.2));
    if (r.closed) pts.push(pts[0]);
    const key = r.dashed ? 'dashed' : fmt(Math.max(1, r.width / 5));
    byWidth.set(key, (byWidth.get(key) ?? '') + pathData(pts));
  }
  const roads = [...byWidth].map(([k, d]) => (k === 'dashed' ? `<path stroke-dasharray="6 4" d="${d}"/>` : `<path stroke-width="${k}" d="${d}"/>`));
  // blocks, back to front so nearer prisms cover farther ones (nearer = larger x + y), then the fixtures
  const blocks = [...layout.blocks].sort((a, b) => (a.box.x0 + a.box.y0) - (b.box.x0 + b.box.y0)).map((b) => prism(b.box, HEIGHT[b.family] ?? 6));
  for (const f of layout.fixtures) blocks.push(prism(f.box, HEIGHT[f.kind] ?? 6, f.kind === 'think-tank' && layout.hill ? layout.hill.height : 0));
  // region labels
  const labels = layout.labels.filter((x) => x.level === 'far').map((l) => { const [x, y] = P(l.at[0], l.at[1], 0); return `<text x="${int(x)}" y="${int(y)}">${l.text.toUpperCase()}</text>`; });
  // the frame: unchanged, so the image keeps its aspect and the stage nothing to re-lay
  const corners = [P(w.x0, w.y0, 0), P(w.x1, w.y0, 0), P(w.x1, w.y1, 0), P(w.x0, w.y1, 0), P(w.x0, w.y0, -4), P(w.x1, w.y1, -4), P(w.x1, w.y0, 60)];
  const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
  const minX = Math.min(...xs) - 20, maxX = Math.max(...xs) + 20, minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(maxX - minX)} ${fmt(maxY - minY)}" role="img" aria-label="The industrial estate at the far view: the ring of primary resources, the estate at the centre, the gateway and port to the east, the town beyond, the think tank on its hill. A still of the world before it starts.">
<style>path{vector-effect:non-scaling-stroke;stroke-linejoin:round}.t{fill:${c.background}}</style>
<rect x="${fmt(minX)}" y="${fmt(minY)}" width="${fmt(maxX - minX)}" height="${fmt(maxY - minY)}" fill="${c.background}"/>
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
