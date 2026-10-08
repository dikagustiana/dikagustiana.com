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
const poly = (pts, fill, stroke, extra = '') => `<polygon points="${pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1" vector-effect="non-scaling-stroke"${extra}/>`;
const line = (pts, stroke, width = 1, extra = '') => `<polyline points="${pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${fmt(width)}" vector-effect="non-scaling-stroke" stroke-linejoin="round"${extra}/>`;

/** An isometric prism for a box of height h: the top, the south face and the east face, each outlined. */
function prism(b, h, fill, top, stroke) {
  const { x0, x1, y0, y1 } = b;
  return [
    poly([P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(x0, y1, h)], fill, stroke),
    poly([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, h), P(x1, y0, h)], fill, stroke),
    poly([P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], top, stroke),
  ].join('');
}

/** Heights by family, the far view's reading of them. */
const HEIGHT = { pit: 1, 'well-pad': 6, quarry: 3, stockpile: 6, 'plantation-block': 3, field: 2, pond: 2, 'forest-block': 5, 'process-plant': 14, factory: 9, 'packaging-plant': 8, 'power-plant': 16, 'water-plant': 4, warehouse: 9, 'cold-store': 10, 'operator-office': 6, quay: 12, apron: 7, interchange: 7, 'rail-yard': 4, '3pl-shed': 9, depot: 7, 'market-hall': 8, supermarket: 6, minimarket: 4, 'department-store': 14, shop: 5, dealership: 6, hotel: 26, restaurant: 4, cinema: 11, school: 7, hospital: 18, clinic: 5, lab: 7, 'office-tower': 29, 'bank-tower': 38, exchange: 12, 'recycling-plant': 10, 'scrap-yard': 3, 'compost-site': 2, 'telecom-tower': 46, 'construction-site': 12, 'think-tank': 7 };

export function renderPoster(layout, c = POSTER_COLOURS) {
  const out = [];
  const w = layout.world;
  // the slab: its top, its south and east faces
  out.push(prism(w, 4, c.muted, c.background, c.border).replace(/translate/g, ''));
  // regions
  for (const r of layout.regions) {
    const fill = r.id === 'estate' ? c.border : r.id === 'gateway' ? c.card : r.id === 'town' || r.id === 'recovery' ? c.card : r.id === 'hill' ? 'none' : c.muted;
    if (fill !== 'none') out.push(poly(r.polygon.map(([x, y]) => P(x, y, 0.1)), fill, c.border));
  }
  if (layout.port) { const wb = layout.port.water; out.push(poly([P(wb.x0, wb.y0, -0.6), P(wb.x1, wb.y0, -0.6), P(wb.x1, wb.y1, -0.6), P(wb.x0, wb.y1, -0.6)], c.secondary, c.border)); }
  if (layout.hill) { const { centre: [cx, cy], radius, height } = layout.hill; for (let k = 0; k < 3; k++) { const r = radius * (1 - k * 0.28), z = (height / 3) * (k + 1), ring = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; ring.push(P(cx + r * Math.cos(a), cy + r * 0.8 * Math.sin(a), z)); } out.push(poly(ring, c.muted, c.border)); } }
  // roads
  for (const r of layout.roads) { const pts = r.points.map(([x, y]) => P(x, y, 0.2)); if (r.closed) pts.push(pts[0]); out.push(line(pts, c.mutedForeground, r.dashed ? 1 : Math.max(1, r.width / 5), r.dashed ? ' stroke-dasharray="6 4"' : '')); }
  // blocks, back to front so nearer prisms cover farther ones (nearer = larger x + y)
  const blocks = [...layout.blocks].sort((a, b) => (a.box.x0 + a.box.y0) - (b.box.x0 + b.box.y0));
  for (const b of blocks) out.push(prism(b.box, HEIGHT[b.family] ?? 6, c.card, c.background, c.mutedForeground));
  for (const f of layout.fixtures) { const h = f.kind === 'think-tank' && layout.hill ? HEIGHT['think-tank'] : (HEIGHT[f.kind] ?? 6); const z0 = f.kind === 'think-tank' && layout.hill ? layout.hill.height : 0; const bb = f.box; out.push(prism(bb, h, c.card, c.background, c.mutedForeground).replace(/,(-?[\d.]+)"/g, (m, y) => `,${fmt(Number(y) - z0)}"`)); }
  // region labels
  for (const l of layout.labels.filter((x) => x.level === 'far')) { const [x, y] = P(l.at[0], l.at[1], 0); out.push(`<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" font-family="'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" font-size="22" letter-spacing="2" fill="${c.mutedForeground}">${l.text.toUpperCase()}</text>`); }
  // the frame
  const corners = [P(w.x0, w.y0, 0), P(w.x1, w.y0, 0), P(w.x1, w.y1, 0), P(w.x0, w.y1, 0), P(w.x0, w.y0, -4), P(w.x1, w.y1, -4), P(w.x1, w.y0, 60)];
  const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
  const minX = Math.min(...xs) - 20, maxX = Math.max(...xs) + 20, minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(maxX - minX)} ${fmt(maxY - minY)}" role="img" aria-label="The industrial estate at the far view: the ring of primary resources, the estate at the centre, the gateway and port to the east, the town beyond, the think tank on its hill. A still of the world before it starts.">
<rect x="${fmt(minX)}" y="${fmt(minY)}" width="${fmt(maxX - minX)}" height="${fmt(maxY - minY)}" fill="${c.background}"/>
${out.join('\n')}
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
  console.log(`render-poster: ${Math.round(svg.length / 1024)} KB · ${same ? 'unchanged' : 'written'}`);
}
