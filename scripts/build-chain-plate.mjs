/**
 * Generates the industry chain plate.
 *
 *   node --experimental-strip-types scripts/build-chain-plate.mjs
 *   (npm run build:chain)
 *
 * Content comes from src/data/industryChain.ts — this script imports it, so
 * a label edited there is the label drawn here after one regenerate. This
 * script owns only WHERE things sit. It writes two files, both marked
 * generated:
 *
 *   src/components/industry-chain/ChainPlateSvg.tsx   the two plates, as JSX
 *   src/components/industry-chain/chain-plate.css     scoped, token-only CSS
 *
 * Geometry is computed rather than hand-placed because two hundred
 * coordinates across two layouts do not stay on one grid by hand. The
 * hourglass is carried by WIDTH in both layouts — lane count on the wide
 * plate, box width on the tall one — because a shape that needs a caption is
 * not a shape.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STAGES, NODES, RETAIL, BANDS, JOINT_ATTRIBUTES, RETURNS, BYPRODUCT, MONEY, ENERGY,
  ECONOMY_LENS, UNIT_LENS, UNIT_LOGISTICS,
} from '../src/data/industryChain.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'src', 'components', 'industry-chain');

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const S = byId(STAGES), N = byId(NODES);
const label = (id) => (S[id] ?? N[id] ?? RETAIL.find((r) => r.id === id))?.label ?? id;

/* ── JSX helpers ─────────────────────────────────────────────────────────── */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[{}]/g, (c) => `{'${c}'}`);
const T = (x, y, s, cls, anchor = 'start', extra = '') =>
  `<text x="${x}" y="${y}" className="${cls}" textAnchor="${anchor}"${extra}>${esc(s)}</text>`;
const Trot = (x, y, s, cls, anchor = 'start') =>
  T(x, y, s, cls, anchor, ` transform="rotate(-90 ${x} ${y})"`);
/** Greedy word wrap for the narrow plate, where a note has ~24 characters. */
const wrap = (str, max) => str.split(' ').reduce((lines, word) => {
  const last = lines[lines.length - 1];
  if (last !== undefined && (last + ' ' + word).length <= max) lines[lines.length - 1] = last + ' ' + word;
  else lines.push(word);
  return lines;
}, []);
const Tlines = (x, y, lines, cls, lh, anchor = 'start') =>
  lines.map((l, i) => T(x, y + i * lh, l, cls, anchor)).join('');

/** Transformation stage: the only filled or heavy-outlined form on the plate. */
const stage = (x, y, w, h, id, lines, { primary = false, titleTop = false } = {}) => {
  const L = [].concat(lines);
  const cls = primary ? 'cp-stage-t cp-stage-t--rev' : 'cp-stage-t';
  const y0 = titleTop ? y + 20 : y + h / 2 + 5 - (L.length - 1) * 7;
  return `<g className="${primary ? 'cp-stage cp-stage--entry' : 'cp-stage'}" data-id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" />
    ${L.map((t, i) => T(x + 10, y0 + i * 14, t, cls)).join('')}</g>`;
};

/** Intermediary node: never filled, always dashed, always smaller. */
const node = (x, y, w, h, id) => `<g className="cp-node" data-id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" />
    ${T(x + 12, y + h / 2 + 4, label(id), 'cp-node-t')}</g>`;

const defs = () => `<defs>
      <marker id="cp-tip" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk" /></marker>
      <marker id="cp-tip-soft" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk" /></marker>
      <marker id="cp-tip-far" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk-far" /></marker>
    </defs>`;

/** An economy-lens reading: a name, a note, and a leader to the thing it reads. */
const econ = (item, x, y, ax, ay, anchor = 'start') => `<g className="cp-econ" data-id="${item.id}">
      <path className="cp-econ-lead" d="M ${x + (anchor === 'end' ? 2 : -2)} ${y - 4} L ${ax} ${ay}" />
      ${T(x, y, item.label, 'cp-econ-t', anchor)}
      ${T(x, y + 13, item.note, 'cp-econ-n', anchor)}</g>`;

/* ═══ WIDE PLATE ══════════════════════════════════════════════════════════ */

function wide() {
  const W = 1680, H = 600, AX = 275;
  const base = [], econLens = [], unitLens = [], attrs = [], joints = [];

  const C = {
    fanT: 150, fanL: 156, org: [206, 374], agg: [396, 496], proc: [504, 664],
    trad: [690, 800], mfg: [828, 988], dist: [1014, 1124], ret: [1150, 1300], cons: [1326, 1520],
  };
  const bioY = 168, geoY = 382;
  const bioB = [132, 72], geoB = [350, 60], procB = [238, 74], mfgB = [238, 74];
  const tradB = [259, 32], packB = [110, 42], princB = [394, 32];
  const distY = 240, wholY = 316;
  const retCY = [146, 212, 278, 344, 410], retH = 30;
  const consB = [136, 268], recB = [410, 40];

  /* The hull: the hourglass as a field. Its lower edge is reused by the
     unit-economics lens, so the two lenses cannot disagree on the shape. */
  const hullBottom = (x) => {
    // piecewise: matches the path below closely enough for a mirrored strip
    if (x <= 504) return 400 + (x - 156) * (318 - 400) / (504 - 156);
    if (x <= 988) return 318;
    return 318 + (x - 988) * (444 - 318) / (1520 - 988);
  };
  base.push(`<path className="cp-hull" d="M 156,104 C 300,96 402,106 504,232 L 988,232 C 1090,118 1240,104 1520,100 L 1520,444 C 1240,440 1090,426 988,318 L 504,318 C 402,444 300,452 156,400 Z" />`);

  /* The two spanning layers: the only things below the chain at rest. Drawn
     first so no band ever paints over a stage. */
  BANDS.forEach((b, i) => {
    const y = 460 + i * 36;
    base.push(`<g className="cp-band" data-id="${b.id}">
      <rect x="156" y="${y}" width="1364" height="30" />
      <path className="cp-band-line" d="M 156 ${y} L 1520 ${y}" />
      ${T(166, y + 19, b.label, 'cp-band-t')}${b.note ? T(560, y + 19, b.note, 'cp-band-n') : ''}</g>`);
  });

  /* Fan lanes: how the wide end gets wide. */
  S['stage-biological'].lanes.forEach((l, i) => {
    const y = 108 + i * 30;
    base.push(T(C.fanT, y + 4, l, 'cp-lane-t', 'end'),
      `<path className="cp-flow-thin" d="M ${C.fanL} ${y} C 182 ${y}, 188 ${bioY}, ${C.org[0]} ${bioY}" />`);
  });
  S['stage-extraction'].lanes.forEach((l, i) => {
    const y = 356 + i * 30;
    base.push(T(C.fanT, y + 4, l, 'cp-lane-t', 'end'),
      `<path className="cp-flow-thin" d="M ${C.fanL} ${y} C 182 ${y}, 188 ${geoY}, ${C.org[0]} ${geoY}" />`);
  });

  /* Forward flows. The taper IS the hourglass. */
  const flow = (x1, y1, x2, y2, cls = 'cp-flow') =>
    `<path className="${cls}" d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" />`;
  base.push(
    flow(C.org[1], bioY, C.agg[0], bioY),
    flow(C.agg[1], bioY, C.proc[0], AX),
    flow(C.org[1], geoY, C.proc[0], AX),
    flow(C.proc[1], AX, C.trad[0], AX),
    flow(C.trad[1], AX, C.mfg[0], AX),
    flow(C.mfg[1], AX, C.dist[0], distY), flow(C.mfg[1], AX, C.dist[0], wholY),
    flow(C.dist[1], distY, C.ret[0], retCY[0]), flow(C.dist[1], distY, C.ret[0], retCY[1]),
    flow(C.dist[1], wholY, C.ret[0], retCY[2]), flow(C.dist[1], wholY, C.ret[0], retCY[3]),
    flow(C.dist[1], wholY, C.ret[0], retCY[4]),
    ...retCY.map((y) => flow(C.ret[1], y, C.cons[0], AX)),
    // packaging joins, drawn joining
    `<path className="cp-flow" d="M 880 ${packB[0] + packB[1]} C 880 200, 886 214, 892 ${mfgB[0] - 3}" markerEnd="url(#cp-tip)" />`,
    // the principal takes title alongside manufacturing
    `<path className="cp-flow-thin" d="M 892 ${mfgB[0] + mfgB[1]} L 892 ${princB[0]}" />`,
    // consumption → recovery
    `<path className="cp-flow" d="M 1420 ${consB[0] + consB[1]} L 1420 ${recB[0] - 3}" markerEnd="url(#cp-tip)" />`,
  );

  /* Energy: perpendicular into every stage, never along the chain. */
  const en = (cx, top) => `<path className="cp-energy" d="M ${cx} ${top - 22} L ${cx} ${top - 3}" markerEnd="url(#cp-tip-soft)" />`;
  base.push(T(158, 84, ENERGY.label, 'cp-band-t'),
    en(266, bioB[0]), en(266, geoB[0]), en(560, procB[0]), en(940, packB[0]),
    en(950, mfgB[0]), en(1470, consB[0]), en(1470, recB[0]));

  /* Money, against the goods: a short leftward arrow at every transfer of title. */
  const money = (x, y) => `<path className="cp-money" d="M ${x + 8} ${y} L ${x - 8} ${y}" markerEnd="url(#cp-tip-soft)" />`;
  base.push(
    money(385, bioY + 12), money(500, AX + 12), money(677, AX + 12), money(814, AX + 12),
    money(1001, AX + 12), money(1137, AX + 12), money(1313, AX + 12),
    T(160, 298, MONEY.label, 'cp-money-t'),
  );

  /* The four forms. */
  base.push(
    stage(C.org[0], bioB[0], 168, bioB[1], 'stage-biological', ['Biological primary', 'production'], { primary: true }),
    stage(C.org[0], geoB[0], 168, geoB[1], 'stage-extraction', ['Geological', 'extraction'], { primary: true }),
    `<path className="cp-entry-bar" d="M ${C.org[0] - 7} ${bioB[0]} L ${C.org[0] - 7} ${geoB[0] + geoB[1]}" />`,
    node(C.agg[0], bioY - 17, 100, 34, 'node-aggregation'),
    stage(C.proc[0], procB[0], 160, procB[1], 'stage-processing', [label('stage-processing')]),
    node(C.trad[0], tradB[0], 110, tradB[1], 'node-trader'),
    stage(C.mfg[0], packB[0], 160, packB[1], 'stage-packaging', [label('stage-packaging')]),
    stage(C.mfg[0], mfgB[0], 160, mfgB[1], 'stage-manufacturing', ['Finished-goods', 'manufacturing']),
    node(C.mfg[0], princB[0], 160, princB[1], 'node-principal'),
    node(C.dist[0], distY - 15, 110, 30, 'node-distributor'),
    T(C.dist[0] + 14, distY + 28, `↳ ${N['node-distributor'].recursion}`, 'cp-recur'),
    node(C.dist[0], wholY - 15, 110, 30, 'node-wholesaler'),
    ...RETAIL.map((r, i) => node(C.ret[0], retCY[i] - retH / 2, 150, retH, r.id)),
    stage(C.cons[0], consB[0], 194, consB[1], 'stage-consumption', [label('stage-consumption')], { titleTop: true }),
    ...S['stage-consumption'].demand.map((d, i) => `<g className="cp-demand">
      <path d="M ${C.cons[0] + 12} ${212 + i * 72 - 10} L ${C.cons[0] + 12} ${212 + i * 72 + 6}" />
      ${T(C.cons[0] + 21, 212 + i * 72 + 4, d, 'cp-demand-t')}</g>`),
    stage(1330, recB[0], 190, recB[1], 'stage-recovery', [label('stage-recovery')]),
  );

  /* Physical returns: neutral, above the chain, each spanning exactly its joints. */
  const ret = byId(RETURNS);
  const arc = (r, x1, x2, peak) => `<g className="cp-ret" data-id="${r.id}">
      <path d="M ${x1} 232 C ${x1} ${peak}, ${x2} ${peak}, ${x2} 232" markerEnd="url(#cp-tip-soft)" />
      ${T((x1 + x2) / 2, peak + 6, r.label, 'cp-ret-t', 'middle')}</g>`;
  base.push(
    arc(ret['return-scrap'], 908, 584, 178),
    arc(ret['return-commercial'], 1225, 1069, 178),
    arc(ret['return-packaging'], 1225, 908, 140),
    `<g className="cp-ret" data-id="return-postconsumer">
      <path d="M 1520 430 L 1600 430 L 1600 38 L 278 38 L 278 ${bioB[0] - 4}" markerEnd="url(#cp-tip-soft)" />
      <path d="M 560 38 L 560 ${procB[0] - 4}" markerEnd="url(#cp-tip-soft)" />
      ${T(1000, 30, ret['return-postconsumer'].label, 'cp-ret-t', 'middle')}</g>`,
    `<g className="cp-ret" data-id="return-secondary">
      <path d="M 1520 206 C 1562 220, 1562 252, 1520 266" markerEnd="url(#cp-tip-soft)" />
      ${T(1568, 232, 'Secondary market', 'cp-ret-t')}${T(1568, 245, 'and refurbishment', 'cp-ret-t')}</g>`,
    `<g className="cp-byp" data-id="${BYPRODUCT.id}"><path d="M 520 ${procB[0] + procB[1]} L 470 358" markerEnd="url(#cp-tip-soft)" />
      ${T(392, 372, BYPRODUCT.label, 'cp-ret-t')}</g>`,
  );

  /* ── ECONOMY lens: every reading anchored to the thing it reads. ── */
  const E = byId(ECONOMY_LENS);
  const cut = (x, lbl) => `<g className="cp-cut"><path d="M ${x} 100 L ${x} 452" />
      <rect x="${x - 40}" y="80" width="80" height="16" className="cp-chip" />${T(x, 92, lbl, 'cp-cut-t', 'middle')}</g>`;
  econLens.push(
    cut(384, 'Export'), cut(490, 'Import'), cut(814, 'Capital goods'),
    econ(E['econ-labour'], 206, 228, 260, bioB[0] + bioB[1] + 2),
    econ(E['econ-fiscal-subsidy'], 206, 262, 300, bioB[0] + bioB[1] + 2),
    econ(E['econ-fx-windfall'], 206, 432, 260, geoB[0] + geoB[1] + 2),
    econ(E['econ-fiscal-royalty'], 380, 432, 340, geoB[0] + geoB[1] + 2),
    econ(E['econ-inflation'], 512, 150, 500, 222),
    econ(E['econ-fx-cost'], 700, 212, 745, tradB[0] - 2),
    econ(E['econ-capital-goods'], 900, 164, 814, 232),
    econ(E['econ-external-export'], 512, 404, 445, 330),
    econ(E['econ-external-import'], 700, 352, 677, tradB[0] + tradB[1] + 2),
    econ(E['econ-import-share'], 700, 392, 677, tradB[0] + tradB[1] + 2),
    econ(E['econ-fiscal-excise'], 828, 340, 908, mfgB[0] + mfgB[1] + 2),
    econ(E['econ-monetary'], 1014, 360, 1001, AX + 14),
    econ(E['econ-cycle'], 1140, 200, 1137, AX - 4, 'end'),
    econ(E['econ-growth'], 1326, 78, 1400, consB[0] - 2),
    econ(E['econ-energy'], 215, 84, 266, 104),
  );

  /* ── UNIT ECONOMICS lens: the price built up, sliced, under the chain. ── */
  const cols = {
    'stage-biological': [156, 374], 'node-aggregation': [374, 504], 'stage-processing': [504, 690],
    'node-trader': [690, 828], 'stage-manufacturing': [828, 1014], 'node-distributor': [1014, 1150],
    'node-retail': [1150, 1326], 'stage-consumption': [1326, 1520],
  };
  // The strip hangs from the band zone's top edge; its thickness is the hull's
  // half-height at that x, mirrored — so it pinches where the chain pinches.
  const STRIP_TOP = 456;
  let thinRow = 0;
  UNIT_LENS.forEach((sl) => {
    const [x0, x1] = cols[sl.column];
    const mid = (x0 + x1) / 2;
    const thick = Math.max(28, (hullBottom(mid) - AX) * 0.78);
    const thin = thick < 60;
    // Thin slices cannot hold their own label; those labels sit under the
    // bands on two alternating baselines so neighbours never overlap.
    const rowY = 544 + (thinRow % 2) * 28;
    if (thin) thinRow += 1;
    unitLens.push(`<g className="cp-slice" data-id="${sl.id}">
      <rect x="${x0 + 2}" y="${STRIP_TOP}" width="${x1 - x0 - 4}" height="${thick}" />
      ${thin
        ? `<path className="cp-slice-lead" d="M ${mid} ${STRIP_TOP + thick + 2} L ${mid} ${rowY - 10}" />
      ${T(mid, rowY, sl.label, 'cp-slice-t', 'middle')}${sl.note ? T(mid, rowY + 13, sl.note, 'cp-slice-n', 'middle') : ''}`
        : `${T(x0 + 12, STRIP_TOP + 20, sl.label, 'cp-slice-t')}${sl.note ? T(x0 + 12, STRIP_TOP + 34, sl.note, 'cp-slice-n') : ''}`}</g>`);
  });
  unitLens.push(T(156, 448, UNIT_LOGISTICS.label, 'cp-slice-n'));

  /* Joint attributes: one place, not a layer. Visible under either lens. */
  JOINT_ATTRIBUTES.forEach((a) => {
    attrs.push(`<g className="cp-attr" data-joint="${a.joint}">
      <path className="cp-attr-lead" d="M 1012 432 L 1001 ${AX + 20}" />
      ${T(1014, 436, a.label, 'cp-attr-t')}${T(1014, 449, a.note, 'cp-attr-n')}</g>`);
  });

  /* Joints the curriculum can pin to. Rendered only when a module is pinned. */
  const J = {
    'j-production-aggregation': [385, bioY], 'j-extraction-processing': [445, 330],
    'j-aggregation-processing': [500, 222], 'j-processing-trader': [677, AX],
    'j-trader-manufacturing': [814, AX], 'j-packaging-manufacturing': [892, 224],
    'j-manufacturing-distribution': [1001, AX], 'j-distributor-wholesaler': [1069, 278],
    'j-wholesale-retail': [1137, AX], 'j-retail-consumption': [1313, AX], 'j-consumption-recovery': [1420, 432],
  };
  Object.entries(J).forEach(([id, [cx, cy]]) => joints.push(`<JointHit id="${id}" cx={${cx}} cy={${cy}} />`));

  return { W, H, base, econLens, unitLens, attrs, joints,
    aria: 'An industry chain drawn as an hourglass: production lanes narrow to primary processing, then widen through distribution to retail and final demand. Two spanning layers, logistics and regulation, run beneath it.' };
}

/* ═══ TALL PLATE ══════════════════════════════════════════════════════════ */

function tall() {
  const W = 420, H = 1340, CX = 160;
  const base = [], econLens = [], unitLens = [], attrs = [], joints = [];
  const b = (w) => [CX - w / 2, w];

  /* The hourglass, standing upright; the unit strip mirrors its right edge. */
  const hullRight = (y) => {
    if (y <= 430) return 264 - (y - 150) * (264 - (CX + 56)) / (430 - 150);
    if (y <= 790) return CX + 56;
    return CX + 56 + (y - 790) * (266 - (CX + 56)) / (1120 - 790);
  };
  base.push(`<path className="cp-hull" d="M 56,150 C 52,300 108,360 ${CX - 56},430 L ${CX - 56},790 C 108,880 48,940 54,1120 L 266,1120 C 272,940 216,880 ${CX + 56},790 L ${CX + 56},430 C 216,360 268,300 264,150 Z" />`);

  const st = (y, h, w, id, lines, opts) => stage(b(w)[0], y, w, h, id, lines, opts);
  const nd = (y, h, w, id) => node(b(w)[0], y, w, h, id);
  const down = (y1, y2) => `<path className="cp-flow" d="M ${CX} ${y1} L ${CX} ${y2}" markerEnd="url(#cp-tip)" />`;
  const en = (y, w) => `<path className="cp-energy" d="M ${b(w)[0] + w + 22} ${y} L ${b(w)[0] + w + 4} ${y}" markerEnd="url(#cp-tip-soft)" />`;
  const money = (y) => `<path className="cp-money" d="M ${CX + 14} ${y + 8} L ${CX + 14} ${y - 8}" markerEnd="url(#cp-tip-soft)" />`;

  S['stage-biological'].lanes.concat(S['stage-extraction'].lanes).forEach((l, i) => {
    const x = 66 + i * 34;
    base.push(`<path className="cp-flow-thin" d="M ${x} 158 C ${x} 196, ${CX} 186, ${CX} 222" />`, Trot(x + 4, 152, l, 'cp-lane-t'));
  });

  base.push(
    st(220, 44, 200, 'stage-biological', ['Biological primary', 'production'], { primary: true }), en(242, 200),
    st(268, 32, 200, 'stage-extraction', ['Geological extraction'], { primary: true }), en(284, 200),
    down(300, 322), money(311), nd(322, 26, 150, 'node-aggregation'),
    down(348, 380), money(364), st(380, 46, 112, 'stage-processing', ['Primary', 'processing']), en(402, 112),
    down(426, 452), money(439), nd(452, 26, 132, 'node-trader'),
    down(478, 500), money(489), st(500, 44, 124, 'stage-packaging', ['Packaging', 'manufacture']), en(522, 124),
    down(544, 572), st(572, 46, 124, 'stage-manufacturing', ['Finished-goods', 'manufacturing']), en(594, 124),
    down(618, 648), money(633), nd(648, 26, 160, 'node-principal'),
    down(674, 704), nd(704, 26, 150, 'node-distributor'),
    T(b(150)[0] + 12, 742, `↳ ${N['node-distributor'].recursion}`, 'cp-recur'),
    down(730, 750), nd(750, 26, 150, 'node-wholesaler'),
    down(776, 796), money(786),
    ...RETAIL.map((r, i) => nd(796 + i * 34, 26, 200, r.id)),
    down(966, 990), money(978),
    st(990, 120, 224, 'stage-consumption', [label('stage-consumption')], { titleTop: true }), en(1010, 224),
    ...S['stage-consumption'].demand.map((d, i) => `<g className="cp-demand">
      <path d="M ${b(224)[0] + 12} ${1042 + i * 24 - 9} L ${b(224)[0] + 12} ${1042 + i * 24 + 5}" />
      ${T(b(224)[0] + 21, 1042 + i * 24 + 3, d, 'cp-demand-t')}</g>`),
    down(1110, 1134), st(1134, 34, 170, 'stage-recovery', [label('stage-recovery')]), en(1151, 170),
    `<g className="cp-byp" data-id="${BYPRODUCT.id}"><path d="M ${b(112)[0] + 112} 414 L ${b(112)[0] + 146} 440" markerEnd="url(#cp-tip-soft)" />
      ${T(b(112)[0] + 116, 456, 'By-product →', 'cp-ret-t')}${T(b(112)[0] + 116, 468, 'another chain', 'cp-ret-t')}</g>`,
    T(CX + 22, 214, ENERGY.label, 'cp-band-t'),
    Trot(CX + 24, 1108, MONEY.label, 'cp-money-t'),
  );

  /* Returns up the left gutter, each spanning exactly its joints. */
  const ret = byId(RETURNS);
  const rarc = (r, y1, y2, x, w1, w2, lbl) => `<g className="cp-ret" data-id="${r.id}">
      <path d="M ${b(w1)[0]} ${y1} C ${x} ${y1}, ${x} ${y2}, ${b(w2)[0]} ${y2}" markerEnd="url(#cp-tip-soft)" />
      ${Trot(x - 4, (y1 + y2) / 2, lbl, 'cp-ret-t', 'middle')}</g>`;
  base.push(
    rarc(ret['return-scrap'], 594, 402, 46, 124, 112, ret['return-scrap'].label),
    rarc(ret['return-commercial'], 830, 717, 38, 200, 150, ret['return-commercial'].label),
    rarc(ret['return-packaging'], 880, 594, 30, 200, 124, ret['return-packaging'].label),
    `<g className="cp-ret" data-id="return-postconsumer"><path d="M ${b(170)[0]} 1151 L 28 1151 L 28 241 L ${b(200)[0]} 241" markerEnd="url(#cp-tip-soft)" />
      <path d="M 28 402 L ${b(112)[0]} 402" markerEnd="url(#cp-tip-soft)" />
      ${Trot(26, 700, ret['return-postconsumer'].label, 'cp-ret-t', 'middle')}</g>`,
    `<g className="cp-ret" data-id="return-secondary"><path d="M ${b(224)[0] + 224} 1030 C ${b(224)[0] + 254} 1042, ${b(224)[0] + 254} 1066, ${b(224)[0] + 224} 1078" markerEnd="url(#cp-tip-soft)" />
      ${Trot(b(224)[0] + 262, 1054, 'Secondary market', 'cp-ret-t', 'middle')}</g>`,
  );

  /* The two spanning layers as rails, running the whole chain. */
  BANDS.forEach((bd, i) => {
    const x = 2 + i * 11;
    base.push(`<g className="cp-band" data-id="${bd.id}"><rect x="${x}" y="150" width="8" height="1030" />
      <path className="cp-band-line" d="M ${x} 150 L ${x} 1180" />${Trot(x + 7, 1174, bd.label, 'cp-band-t')}</g>`);
  });

  /* ECONOMY lens, in the column beside the chain. */
  const E = byId(ECONOMY_LENS);
  const LX = 278, LH = 12;
  const ec = (item, y, ay, ax) => `<g className="cp-econ" data-id="${item.id}">
      <path className="cp-econ-lead" d="M ${LX - 3} ${y - 4} L ${ax} ${ay}" />
      ${T(LX, y, item.label, 'cp-econ-t')}${Tlines(LX, y + LH, wrap(item.note, 24), 'cp-econ-n', LH)}</g>`;
  const rightOf = (w) => b(w)[0] + w + 2;
  econLens.push(
    ec(E['econ-energy'], 196, 214, CX + 60),
    ec(E['econ-labour'], 236, 242, rightOf(200) + 24),
    ec(E['econ-fiscal-subsidy'], 276, 242, rightOf(200) + 24),
    ec(E['econ-fx-windfall'], 316, 284, rightOf(200) + 24),
    ec(E['econ-fiscal-royalty'], 344, 284, rightOf(200) + 24),
    ec(E['econ-inflation'], 372, 364, CX + 16),
    ec(E['econ-external-export'], 424, 364, CX + 16),
    ec(E['econ-import-share'], 464, 439, CX + 16),
    ec(E['econ-external-import'], 492, 439, CX + 16),
    ec(E['econ-fx-cost'], 532, 465, rightOf(132)),
    ec(E['econ-capital-goods'], 560, 489, CX + 16),
    ec(E['econ-fiscal-excise'], 600, 595, rightOf(124) + 24),
    ec(E['econ-monetary'], 736, 689, CX + 16),
    ec(E['econ-cycle'], 800, 786, CX + 16),
    ec(E['econ-growth'], 1000, 1010, rightOf(224) + 24),
  );
  const mcut = (y, lbl) => `<g className="cp-cut"><path d="M 8 ${y} L 396 ${y}" />
      <rect x="${CX - 44}" y="${y - 8}" width="88" height="16" className="cp-chip" />${T(CX, y + 4, lbl, 'cp-cut-t', 'middle')}</g>`;
  econLens.push(mcut(310, 'Export'), mcut(366, 'Import'), mcut(556, 'Capital goods'));

  /* UNIT ECONOMICS lens: the strip beside the chain, mirroring its right edge. */
  const rows = {
    'stage-biological': [220, 300], 'node-aggregation': [300, 380], 'stage-processing': [380, 452],
    'node-trader': [452, 572], 'stage-manufacturing': [572, 704], 'node-distributor': [704, 796],
    'node-retail': [796, 990], 'stage-consumption': [990, 1110],
  };
  const SX = 272, TX = 352, SLH = 11;
  UNIT_LENS.forEach((sl) => {
    const [y0, y1] = rows[sl.column];
    const mid = (y0 + y1) / 2;
    // Bar width carries the pinch: the hull's half-width, scaled to leave a
    // label column. Labels wrap beside it and centre on the row.
    const width = Math.round(10 + (hullRight(mid) - CX - 56) * 1.3);
    const lines = [...wrap(sl.label, 12).map((l) => ['cp-slice-t', l]), ...(sl.note ? wrap(sl.note, 13).map((l) => ['cp-slice-n', l]) : [])];
    const y = mid - ((lines.length - 1) * SLH) / 2 + 3;
    unitLens.push(`<g className="cp-slice" data-id="${sl.id}">
      <rect x="${SX}" y="${y0 + 2}" width="${width}" height="${y1 - y0 - 4}" />
      ${lines.map(([cls, l], i) => T(TX, y + i * SLH, l, cls)).join('')}</g>`);
  });
  unitLens.push(Trot(SX - 6, 700, UNIT_LOGISTICS.label, 'cp-slice-n', 'middle'));

  JOINT_ATTRIBUTES.forEach((a) => {
    attrs.push(`<g className="cp-attr" data-joint="${a.joint}">
      <path className="cp-attr-lead" d="M ${LX - 3} 660 L ${CX + 16} 689" />
      ${Tlines(LX, 664, wrap(a.label, 24), 'cp-attr-t', 12)}${Tlines(LX, 664 + wrap(a.label, 24).length * 12 + 2, wrap(a.note, 30), 'cp-attr-n', 11)}</g>`);
  });

  const J = {
    'j-production-aggregation': [CX, 311], 'j-extraction-processing': [CX, 364],
    'j-aggregation-processing': [CX, 364], 'j-processing-trader': [CX, 439],
    'j-trader-manufacturing': [CX, 489], 'j-packaging-manufacturing': [CX, 558],
    'j-manufacturing-distribution': [CX, 689], 'j-distributor-wholesaler': [CX, 740],
    'j-wholesale-retail': [CX, 786], 'j-retail-consumption': [CX, 978], 'j-consumption-recovery': [CX, 1122],
  };
  Object.entries(J).forEach(([id, [cx, cy]]) => joints.push(`<JointHit id="${id}" cx={${cx}} cy={${cy}} />`));

  return { W, H, base, econLens, unitLens, attrs, joints,
    aria: 'The same industry chain standing upright for a narrow screen: production lanes at the top narrow to primary processing, then widen through distribution to retail and final demand.' };
}

/* ═══ EMIT ════════════════════════════════════════════════════════════════ */

const svg = (p, cls) => `<svg className="cp-svg ${cls}" viewBox="0 0 ${p.W} ${p.H}" role="img" aria-label="${p.aria}">
    ${defs()}
    <g className="cp-base">
      ${p.base.join('\n      ')}
    </g>
    <g className="cp-lens cp-lens--economy" aria-hidden="true">
      ${p.econLens.join('\n      ')}
    </g>
    <g className="cp-lens cp-lens--unit" aria-hidden="true">
      ${p.unitLens.join('\n      ')}
    </g>
    <g className="cp-attrs" aria-hidden="true">
      ${p.attrs.join('\n      ')}
    </g>
    <g className="cp-joints">
      ${p.joints.join('\n      ')}
    </g>
  </svg>`;

const w = wide(), t = tall();

fs.writeFileSync(path.join(OUT, 'ChainPlateSvg.tsx'), `/**
 * GENERATED by scripts/build-chain-plate.mjs — do not edit by hand.
 * Content: src/data/industryChain.ts. Layout: the generator.
 * Regenerate with \`npm run build:chain\`.
 *
 * Two plates, one content. The wide one lies on its side; the tall one stands
 * the hourglass upright for a narrow screen. CSS picks which is shown, and
 * which lens overlay is visible, from the wrapper's data-lens attribute.
 */
import { JointHit } from './JointHit';

export function ChainPlateWide() {
  return (
  ${svg(w, 'cp-svg--wide')}
  );
}

export function ChainPlateTall() {
  return (
  ${svg(t, 'cp-svg--tall')}
  );
}
`);

fs.writeFileSync(path.join(OUT, 'chain-plate.css'), `/**
 * GENERATED by scripts/build-chain-plate.mjs — do not edit by hand.
 *
 * Every colour is a token from src/index.css; nothing here adds a hue. The
 * two lenses take the two accents the system already has: navy for the far
 * reading (cool recedes), the editorial orange for the near one (warm
 * advances). Orange is used only as a field and an edge — never as text,
 * which would fail contrast on the card ground.
 *
 * Contrast budget: at rest the base map sits on foreground / muted /
 * border. A lens dims the base to .42 and takes the accent at full, so the
 * overlay reads without the base ever disappearing.
 */
.chain-plate{
  --cp-far: hsl(var(--accent));
  --cp-near: hsl(var(--accent-editorial));
  --cp-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.chain-plate .cp-svg{display:block;width:100%;height:auto}
.chain-plate .cp-svg--tall{display:none}
@media (max-width:1023px){
  .chain-plate .cp-svg--wide{display:none}
  .chain-plate .cp-svg--tall{display:block}
}

/* Base — the far reading, deliberately quiet so the lenses can speak. */
.cp-base{transition:opacity .22s ease}
.chain-plate[data-lens] .cp-base{opacity:.42}
.cp-hull{fill:hsl(var(--muted))}
.cp-stage rect{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1.4}
.cp-stage--entry rect{fill:hsl(var(--primary));stroke:none}
.cp-stage-t{font-size:14.5px;font-weight:600;fill:hsl(var(--foreground));letter-spacing:-.005em}
.cp-svg--tall .cp-stage-t{font-size:13px}
.cp-stage-t--rev{fill:hsl(var(--primary-foreground))}
.cp-entry-bar{stroke:hsl(var(--primary));stroke-width:5;stroke-linecap:square}
.cp-node rect{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1;stroke-dasharray:3 2.5}
.cp-node-t{font-size:12px;fill:hsl(var(--foreground))}
.cp-recur{font-size:10.5px;fill:hsl(var(--muted-foreground))}
.cp-lane-t{font-size:11.5px;fill:hsl(var(--muted-foreground))}
.cp-demand path{stroke:hsl(var(--foreground));stroke-width:2}
.cp-demand-t{font-size:11.5px;fill:hsl(var(--foreground))}
.cp-flow{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.2}
.cp-flow-thin{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:.7}
.cp-mk{fill:hsl(var(--muted-foreground))}
.cp-mk-far{fill:var(--cp-far)}
.cp-energy{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.2}
.cp-money{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.1}
.cp-money-t{font-size:10px;fill:hsl(var(--muted-foreground));font-family:var(--cp-mono)}
.cp-ret path{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1;stroke-dasharray:5 3;stroke-linejoin:round}
.cp-ret-t{font-size:10px;fill:hsl(var(--muted-foreground));font-family:var(--cp-mono)}
.cp-byp path{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1}
.cp-band rect{fill:hsl(var(--secondary))}
.cp-band-line{stroke:hsl(var(--border));stroke-width:1}
.cp-band-t{font-size:11px;fill:hsl(var(--muted-foreground));letter-spacing:.09em;text-transform:uppercase}
.cp-band-n{font-size:10.5px;fill:hsl(var(--muted-foreground));font-family:var(--cp-mono)}

/* Lenses — overlays, mutually exclusive, never a reveal of hidden structure. */
.cp-lens{display:none}
.chain-plate[data-lens="economy"] .cp-lens--economy{display:block}
.chain-plate[data-lens="unit"] .cp-lens--unit{display:block}
.cp-attrs{display:none}
.chain-plate[data-lens] .cp-attrs{display:block}

.cp-econ-t{font-size:11px;fill:var(--cp-far);letter-spacing:.1em;text-transform:uppercase;font-weight:700}
.cp-econ-n{font-size:10.5px;fill:var(--cp-far)}
.cp-econ-lead{fill:none;stroke:var(--cp-far);stroke-width:.9}
.cp-cut path{fill:none;stroke:var(--cp-far);stroke-width:1;stroke-dasharray:2 4}
.cp-chip{fill:hsl(var(--background))}
.cp-cut-t{font-size:10px;fill:var(--cp-far);letter-spacing:.08em;text-transform:uppercase}

.cp-slice rect{fill:var(--cp-near);fill-opacity:.2;stroke:var(--cp-near);stroke-width:1.2}
.cp-slice-lead{fill:none;stroke:var(--cp-near);stroke-width:.9}
.cp-slice-t{font-size:11px;fill:hsl(var(--foreground));font-family:var(--cp-mono);font-weight:600}
.cp-slice-n{font-size:10px;fill:hsl(var(--muted-foreground));font-family:var(--cp-mono)}
.cp-svg--tall .cp-slice-t{font-size:9.5px}
.cp-svg--tall .cp-slice-n{font-size:9px}
.cp-svg--tall .cp-econ-n{font-size:10px}

.cp-attr-t{font-size:10.5px;fill:hsl(var(--foreground));font-weight:600}
.cp-attr-n{font-size:10px;fill:hsl(var(--muted-foreground));font-family:var(--cp-mono)}
.cp-attr-lead{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:.8}

/* Joints the curriculum has pinned a module to. Nothing else is a target. */
.cp-joint{cursor:pointer}
.cp-joint circle{fill:hsl(var(--background));stroke:var(--cp-near);stroke-width:2}
.cp-joint:hover circle,.cp-joint:focus-visible circle{fill:var(--cp-near)}
.cp-joint[aria-pressed="true"] circle{fill:var(--cp-near)}
.cp-joint:focus{outline:none}
.cp-joint:focus-visible circle{stroke:hsl(var(--ring));stroke-width:3}
@media (prefers-reduced-motion:reduce){.cp-base{transition:none}}
`);

console.log('generated ChainPlateSvg.tsx and chain-plate.css');
