/**
 * Generates the industry chain plates for a wide screen.
 *
 *   node --experimental-strip-types scripts/build-chain-plate.mjs
 *   (npm run build:chain)
 *
 * Content comes from src/data/industryChain.ts — this script imports it, so
 * a label edited there is the label drawn here after one regenerate. This
 * script owns only WHERE things sit. It writes two files, both marked
 * generated:
 *
 *   src/components/industry-chain/ChainPlateSvg.tsx   two plates, as JSX:
 *       ChainPlateWide     the full chain, for the About page and the
 *                          landing page once the reader asks for it
 *       ChainPlateCompact  the short version for the landing page
 *   src/components/industry-chain/chain-plate.css     scoped, token-only CSS
 *
 * The narrow-screen layout is NOT generated: it is a React component
 * (ChainColumn.tsx) that reads the same data file, because on a phone the
 * layers become a list and the flows become toggles — HTML, not geometry.
 *
 * Geometry is computed rather than hand-placed because two hundred
 * coordinates do not stay on one grid by hand. Nothing here claims a shape:
 * the old hourglass hull is gone, every stage takes the same style, and the
 * unit-economics slices are all one thickness — a thicker block would be a
 * figure, and the map carries none.
 *
 * Interactive marks (the joint markers and the layer bands) are emitted as
 * React components — <JointHit>, <BandHit> — with their geometry as props,
 * so the label, the margin chip and the aria text come from the data file at
 * run time and never go stale in this file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STAGES, NODES, RETAIL, RETAIL_GROUP, BANDS, BORDERS, JOINTS, RETURNS, BYPRODUCT, ENERGY, NON_PHYSICAL,
  FLOW_KIND_LABELS, ECONOMY_LENS, UNIT_LENS, UNIT_LOGISTICS, COMPACT, CHAIN_COPY,
} from '../src/data/industryChain.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'src', 'components', 'industry-chain');

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const S = byId(STAGES), N = byId(NODES), J = byId(JOINTS), R = byId(RETURNS), B = byId(BANDS);
const label = (id) => (S[id] ?? N[id] ?? RETAIL.find((r) => r.id === id) ?? (id === RETAIL_GROUP.id ? RETAIL_GROUP : null))?.label ?? id;

/* ── JSX helpers ─────────────────────────────────────────────────────────── */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[{}]/g, (c) => `{'${c}'}`);
const T = (x, y, s, cls, anchor = 'start', extra = '') =>
  `<text x="${x}" y="${y}" className="${cls}" textAnchor="${anchor}"${extra}>${esc(s)}</text>`;
/** Greedy word wrap. */
const wrap = (str, max) => str.split(' ').reduce((lines, word) => {
  const last = lines[lines.length - 1];
  if (last !== undefined && (last + ' ' + word).length <= max) lines[lines.length - 1] = last + ' ' + word;
  else lines.push(word);
  return lines;
}, []);
/** Rough text width in viewBox units, for "does this note fit" decisions only. */
const est = (s, size, perEm = 0.55) => s.length * size * perEm;

/** A label sitting on a line: an opaque chip under the text so the line breaks for it. */
const chip = (x, y, s, cls, anchor = 'middle', size = 14, perEm = 0.62, h = 18) => {
  const w = est(s, size, perEm) + 12;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return `<rect x="${x0}" y="${y - h + 4}" width="${w}" height="${h}" rx="2" className="cp-chip" />${T(x, y, s, cls, anchor)}`;
};

/** Transformation stage: one style for every stage. An origin gets a small bar, never a fill. */
const stage = (x, y, w, h, id, lines, { titleTop = false, size = 18 } = {}) => {
  const L = [].concat(lines);
  const lh = size + 1;
  const y0 = titleTop ? y + size + 4 : y + h / 2 + size * 0.36 - ((L.length - 1) * lh) / 2;
  const origin = S[id]?.origin ? `<rect x="${x}" y="${y}" width="4" height="${h}" className="cp-origin" />` : '';
  return `<g className="cp-stage" data-id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" />${origin}
    ${L.map((t, i) => T(x + 12, y0 + i * lh, t, 'cp-stage-t')).join('')}</g>`;
};

/** Intermediary node: never filled, always dashed, always a pill. */
const node = (x, y, w, h, id, text = label(id), lines = [text]) => {
  const lh = 16;
  const y0 = y + h / 2 + 5 - ((lines.length - 1) * lh) / 2;
  return `<g className="cp-node" data-id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" />
    ${lines.map((t, i) => T(x + 12, y0 + i * lh, t, 'cp-node-t')).join('')}</g>`;
};

/** Marker ids carry the plate's suffix so two plates on one page never share a def. */
let SUF = '';
const M = (name) => `url(#${name}${SUF})`;
const defs = () => `<defs>
      <marker id="cp-tip${SUF}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk" /></marker>
      <marker id="cp-tip-soft${SUF}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk" /></marker>
      <marker id="cp-tip-money${SUF}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk" /></marker>
      <marker id="cp-tip-info${SUF}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 1 1.5 L 8 5 L 1 8.5 z" className="cp-mk-open" /></marker>
    </defs>`;

/** An economy-lens reading: a name, a note (wrapped where the column is narrow), and a leader to the thing it reads. */
const econ = (item, x, y, ax, ay, anchor = 'start', wrapAt = 0) => `<g className="cp-econ" data-id="${item.id}">
      <path className="cp-econ-lead" d="M ${x + (anchor === 'end' ? 2 : -2)} ${y - 4} L ${ax} ${ay}" />
      ${T(x, y, item.label, 'cp-econ-t', anchor)}
      ${(wrapAt ? wrap(item.note, wrapAt) : [item.note]).map((l, i) => T(x, y + 15 + i * 15, l, 'cp-econ-n', anchor)).join('')}</g>`;

const flow = (x1, y1, x2, y2, cls = 'cp-flow', marker = '') =>
  `<path className="${cls}" d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}"${marker ? ` markerEnd="${M(marker)}"` : ''} />`;

/* ═══ WIDE PLATE — the full chain ═════════════════════════════════════════ */

function wide() {
  const W = 1600, H = 810, H_UNIT = 916, AX = 275;
  const base = [], econLens = [], unitLens = [], jointHits = [], bandHits = [];

  /* Columns, left to right. Widths are set by the longest label at the
     plate's type size, so no name overruns its box. */
  const C = {
    fanT: 150, fanL: 156,
    org: [206, 386], agg: [412, 500], proc: [512, 672], trad: [686, 816], mfg: [838, 998],
    princ: [838, 1004], dist: [1024, 1134], ret: [1160, 1330], cons: [1344, 1538], rec: [1348, 1538],
  };
  const bioY = 168, geoY = 382;
  const bioB = [138, 60], geoB = [352, 60], procB = [253, 48], mfgB = [253, 48], packB = [96, 48];
  const tradB = [259, 32], princB = [424, 32];
  const distY = 240, wholY = 360, retCY = [146, 212, 278, 344, 410], retH = 30;
  const consB = [136, 248], recB = [418, 34];
  const CHAIN_BOTTOM = 456;

  /* Fan lanes into the two origins: examples of a function, not a shape. */
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

  /* Forward flows. */
  base.push(
    flow(C.org[1], bioY, C.agg[0], bioY),
    flow(C.agg[1], bioY, C.proc[0], AX),
    flow(C.org[1], geoY, C.proc[0], AX),
    flow(C.proc[1], AX, C.trad[0], AX),
    flow(C.trad[1], AX, C.mfg[0], AX),
    flow(C.mfg[1], AX, C.dist[0], distY), flow(C.mfg[1], AX, C.dist[0], wholY),
    // the distributor sells on to the wholesaler
    `<path className="cp-flow" d="M ${C.dist[0] + 6} ${distY + 15} L ${C.dist[0] + 6} ${wholY - 18}" markerEnd="${M('cp-tip')}" />`,
    flow(C.dist[1], distY, C.ret[0], retCY[0]), flow(C.dist[1], distY, C.ret[0], retCY[1]),
    flow(C.dist[1], wholY, C.ret[0], retCY[2]), flow(C.dist[1], wholY, C.ret[0], retCY[3]),
    flow(C.dist[1], wholY, C.ret[0], retCY[4]),
    ...retCY.map((y) => `<path className="cp-flow" d="M ${C.ret[1]} ${y} L ${C.cons[0]} ${y}" />`),
    // packaging joins manufacturing from above
    `<path className="cp-flow" d="M 886 ${packB[0] + packB[1]} L 886 ${mfgB[0] - 3}" markerEnd="${M('cp-tip')}" />`,
    // the principal takes title alongside manufacturing
    `<path className="cp-flow-thin" d="M 846 ${mfgB[0] + mfgB[1]} L 846 ${princB[0]}" />`,
    // consumption → recovery
    `<path className="cp-flow" d="M 1430 ${consB[0] + consB[1]} L 1430 ${recB[0] - 3}" markerEnd="${M('cp-tip')}" />`,
  );

  /* Energy: perpendicular into every stage, never along the chain. */
  const en = (cx, top) => `<path className="cp-energy" d="M ${cx} ${top - 22} L ${cx} ${top - 3}" markerEnd="${M('cp-tip-soft')}" />`;
  base.push(T(158, 84, ENERGY.label, 'cp-kind-t'),
    en(266, bioB[0]), en(266, geoB[0]), en(560, procB[0]), en(940, packB[0]),
    en(950, mfgB[0]), en(1490, consB[0]), en(1490, recB[0]));

  /* The forms. */
  base.push(
    stage(C.org[0], bioB[0], 180, bioB[1], 'stage-biological', ['Biological primary', 'production']),
    stage(C.org[0], geoB[0], 180, geoB[1], 'stage-extraction', ['Geological', 'extraction']),
    node(C.agg[0], bioY - 17, 88, 34, 'node-aggregation'),
    stage(C.proc[0], procB[0], 160, procB[1], 'stage-processing', ['Primary', 'processing']),
    node(C.trad[0], tradB[0], 130, tradB[1], 'node-trader'),
    stage(C.mfg[0], packB[0], 160, packB[1], 'stage-packaging', ['Packaging', 'manufacture']),
    stage(C.mfg[0], mfgB[0], 160, mfgB[1], 'stage-manufacturing', ['Finished-goods', 'manufacturing']),
    node(C.princ[0], princB[0], 166, princB[1], 'node-principal'),
    node(C.dist[0], distY - 15, 110, 30, 'node-distributor'),
    T(C.dist[0] + 22, distY + 31, '↳ sub-distributor', 'cp-recur'),
    T(C.dist[0] + 22, distY + 46, `· ${N['node-distributor'].recursion.split(' · ')[1]}`, 'cp-recur'),
    node(C.dist[0], wholY - 15, 110, 30, 'node-wholesaler'),
    ...RETAIL.map((r, i) => node(C.ret[0], retCY[i] - retH / 2, 170, retH, r.id)),
    stage(C.cons[0], consB[0], 194, consB[1], 'stage-consumption', [label('stage-consumption')], { titleTop: true }),
    ...S['stage-consumption'].demand.map((d, i) => `<g className="cp-demand">
      <path d="M ${C.cons[0] + 12} ${212 + i * 72 - 10} L ${C.cons[0] + 12} ${212 + i * 72 + 6}" />
      ${T(C.cons[0] + 21, 212 + i * 72 + 4, d, 'cp-demand-t')}</g>`),
    stage(C.rec[0], recB[0], 190, recB[1], 'stage-recovery', [label('stage-recovery')]),
  );

  /* Physical returns: dashed, above the chain, each spanning exactly its joints. */
  const arc = (r, x1, y1, x2, y2, peak, lx, ly, anchor = 'middle') => `<g className="cp-ret" data-id="${r.id}">
      <path d="M ${x1} ${y1} C ${x1} ${peak}, ${x2} ${peak}, ${x2} ${y2}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(lx, ly, r.label, 'cp-ret-t', anchor)}</g>`;
  base.push(
    arc(R['return-scrap'], 918, mfgB[0] - 4, 600, procB[0] - 4, 178, 759, 184),
    arc(R['return-commercial'], 1235, 246, 1079, distY - 19, 178, 1130, 216, 'end'),
    arc(R['return-packaging'], 1235, 246, 918, mfgB[0] - 4, 150, 1060, 176),
    `<g className="cp-ret" data-id="return-postconsumer-organic">
      <path d="M ${C.rec[1]} 428 L 1576 428 L 1576 34 L 298 34 L 298 ${bioB[0] - 4}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(1100, 38, R['return-postconsumer-organic'].label, 'cp-ret-t')}</g>`,
    `<g className="cp-ret" data-id="return-postconsumer-material">
      <path d="M ${C.rec[1]} 440 L 1560 440 L 1560 52 L 520 52 L 520 ${procB[0] - 4}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(860, 56, R['return-postconsumer-material'].label, 'cp-ret-t')}</g>`,
    `<g className="cp-ret" data-id="return-secondary">
      <path d="M 1400 ${consB[0]} C 1400 108, 1470 108, 1470 ${consB[0]}" markerEnd="${M('cp-tip-soft')}" />
      ${T(1392, 104, R['return-secondary'].label, 'cp-ret-t', 'end')}</g>`,
    `<g className="cp-byp" data-id="${BYPRODUCT.id}"><path d="M 530 ${procB[0] + procB[1]} L 480 350" markerEnd="${M('cp-tip-soft')}" />
      ${T(494, 384, BYPRODUCT.label, 'cp-ret-t')}</g>`,
  );

  /* Borders: the external sector as two dashed cuts through the chain, at
     the two joints where goods actually leave and enter. Base layer. */
  const borderX = { 'border-export': 459, 'border-import': 823 };
  const borderSpan = { 'border-export': [296, CHAIN_BOTTOM], 'border-import': [82, CHAIN_BOTTOM] };
  BORDERS.forEach((b) => {
    const x = borderX[b.id], [y0, y1] = borderSpan[b.id];
    base.push(`<g className="cp-border" data-id="${b.id}"><path d="M ${x} ${y0} L ${x} ${y1}" />
      ${chip(x, y0 - 2, b.label, 'cp-border-t')}</g>`);
  });

  /* Non-physical flows: four rails under the chain. Money is dotted with a
     filled head; information is dash-dot with an open head. Upstream runs
     right to left; downstream left to right. Labels sit on the tail end. */
  const RAIL0 = 526, RAIL_DY = 20, RX0 = C.org[0], RX1 = C.cons[1];
  const kinds = ['money', 'information'];
  NON_PHYSICAL.forEach((f, i) => {
    const y = RAIL0 + i * RAIL_DY;
    const up = f.direction === 'upstream';
    const cls = f.kind === 'money' ? 'cp-money' : 'cp-info';
    const tip = f.kind === 'money' ? 'cp-tip-money' : 'cp-tip-info';
    base.push(`<g className="cp-nonphys" data-id="${f.id}">
      <path className="${cls}" d="${up ? `M ${RX1} ${y} L ${RX0 + 6} ${y}` : `M ${RX0} ${y} L ${RX1 - 6} ${y}`}" markerEnd="${M(tip)}" />
      ${up ? chip(RX1 + 1, y + 4, f.label, 'cp-rail-t', 'end') : chip(RX0 - 1, y + 4, f.label, 'cp-rail-t', 'start')}</g>`);
  });
  kinds.forEach((k, i) => base.push(T(C.fanT, RAIL0 + i * 2 * RAIL_DY + 14, FLOW_KIND_LABELS[k], 'cp-kind-t', 'end')));

  /* Enabling layers: five bands, each exactly over its span. Interactive, so
     emitted as <BandHit>; the label and chip come from the data at run time. */
  const colX = {
    'stage-biological': C.org, 'stage-extraction': C.org, 'node-aggregation': C.agg, 'stage-processing': C.proc,
    'node-trader': C.trad, 'stage-packaging': C.mfg, 'stage-manufacturing': C.mfg, 'node-distributor': C.dist,
    'node-wholesaler': C.dist, 'node-retail': C.ret, 'stage-consumption': C.cons, 'stage-recovery': C.cons,
  };
  const BAND0 = 612, BAND_H = 30, BAND_DY = 34;
  BANDS.forEach((b, i) => {
    const x0 = colX[b.span[0]][0], x1 = colX[b.span[1]][1];
    const noteFits = b.note ? est(b.label, 14, 0.62) + 44 + est(b.note, 14, 0.6) + 24 < x1 - x0 : false;
    bandHits.push(`<BandHit id="${b.id}" x={${x0}} y={${BAND0 + i * BAND_DY}} width={${x1 - x0}} height={${BAND_H}} noteX={${noteFits ? Math.round(x0 + est(b.label, 14, 0.62) + 44) : 'null'}} />`);
  });

  /* Joint markers: one per joint, always present, quiet at rest. The chip
     with the margin kind appears on hover, on focus, or under the unit lens.
     Row chips line up under the chain; a side chip sits where a leader down
     would have to cross a box. */
  const ROW_A = 462, ROW_B = 486;
  const jointGeom = {
    'j-production-aggregation': [399, bioY, 'rowA'],
    'j-extraction-processing': [449, 328, 'rowB'],
    'j-aggregation-processing': [506, 222, 'rowA'],
    'j-processing-trader': [679, AX, 'rowA'],
    'j-trader-manufacturing': [831, AX, 'rowA'],
    'j-packaging-manufacturing': [886, 200, 'left'],
    'j-manufacturing-distribution': [1011, AX, 'rowA'],
    'j-distributor-wholesaler': [C.dist[0] + 6, 300, 'right'],
    'j-wholesale-retail': [1147, wholY, 'rowA'],
    'j-retail-consumption': [1337, retCY[2], 'rowA'],
    'j-consumption-recovery': [1430, 401, 'left'],
  };
  JOINTS.forEach((j) => {
    const [cx, cy, at] = jointGeom[j.id];
    const chipX = at === 'left' ? cx - 12 : at === 'right' ? cx + 12 : cx;
    const chipY = at === 'rowA' ? ROW_A : at === 'rowB' ? ROW_B : cy - 8;
    jointHits.push(`<JointHit id="${j.id}" cx={${cx}} cy={${cy}} chipX={${chipX}} chipY={${chipY}} chipAt="${at}" />`);
  });

  /* ── ECONOMY lens: every reading anchored to the thing it reads. ── */
  const E = byId(ECONOMY_LENS);
  econLens.push(
    econ(E['econ-labour'], 206, 224, 260, bioB[0] + bioB[1] + 2, 'start', 26),
    econ(E['econ-fiscal-subsidy'], 206, 272, 300, bioB[0] + bioB[1] + 2),
    econ(E['econ-fx-windfall'], 206, 434, 260, geoB[0] + geoB[1] + 2),
    econ(E['econ-fiscal-royalty'], 380, 434, 340, geoB[0] + geoB[1] + 2),
    econ(E['econ-inflation'], 524, 118, 508, 218, 'start', 24),
    econ(E['econ-fx-cost'], 816, 236, 750, tradB[0] - 2, 'end'),
    econ(E['econ-capital-goods'], 830, 140, 833, 268, 'end', 14),
    econ(E['econ-external-export'], 520, 434, 455, 336),
    econ(E['econ-external-import'], 826, 340, 831, AX + 8, 'end', 20),
    econ(E['econ-import-share'], 826, 404, 831, AX + 8, 'end'),
    econ(E['econ-fiscal-excise'], 852, 340, 918, mfgB[0] + mfgB[1] + 2, 'start', 24),
    econ(E['econ-monetary'], 1017, 390, 1011, AX + 8, 'end', 24),
    econ(E['econ-cycle'], 1030, 440, 1145, wholY + 7),
    econ(E['econ-growth'], 1344, 72, 1420, consB[0] - 2),
    econ(E['econ-energy'], 215, 84, 266, 104),
  );

  /* ── UNIT ECONOMICS lens: the price built up, sliced, under the chain. One
     block per column, all one thickness; labels below on two alternating
     baselines so neighbours never touch. ── */
  const cols = {
    'stage-biological': [206, 386], 'node-aggregation': [386, 512], 'stage-processing': [512, 686],
    'node-trader': [686, 838], 'stage-manufacturing': [838, 1024], 'node-distributor': [1024, 1160],
    'node-retail': [1160, 1344], 'stage-consumption': [1344, 1538],
  };
  // The strip has a zone of its own under the layers, and the plate grows to
  // hold it only while the lens is on — so at rest nothing sits empty, and
  // under the lens no slice label lands on a band's text.
  const STRIP_TOP = 800, STRIP_H = 36;
  UNIT_LENS.forEach((sl, i) => {
    const [x0, x1] = cols[sl.column];
    const mid = (x0 + x1) / 2;
    const rowY = STRIP_TOP + STRIP_H + 22 + (i % 2) * 30;
    unitLens.push(`<g className="cp-slice" data-id="${sl.id}">
      <rect x="${x0 + 2}" y="${STRIP_TOP}" width="${x1 - x0 - 4}" height="${STRIP_H}" />
      <path className="cp-slice-lead" d="M ${mid} ${STRIP_TOP + STRIP_H + 2} L ${mid} ${rowY - 11}" />
      ${T(mid, rowY, sl.label, 'cp-slice-t', 'middle')}${sl.note ? T(mid, rowY + 14, sl.note, 'cp-slice-n', 'middle') : ''}</g>`);
  });
  unitLens.push(T(206, STRIP_TOP - 6, UNIT_LOGISTICS.label, 'cp-slice-n'));

  return { W, H, H_UNIT, base, econLens, unitLens, hits: [...jointHits, ...bandHits], aria: CHAIN_COPY.aria.wide };
}

/* ═══ COMPACT PLATE — the short version ═══════════════════════════════════ */

function compact() {
  const W = 1590, H = 320, AX = 150;
  const base = [];
  const SW = 180, GW = 150, GAP = 28;
  const stageLines = {
    'stage-biological': ['Biological primary', 'production'],
    'stage-extraction': ['Geological', 'extraction'],
    'stage-processing': ['Primary', 'processing'],
    'stage-manufacturing': ['Finished-goods', 'manufacturing'],
    'stage-consumption': ['Consumption', 'and use'],
    'stage-recovery': ['Recovery'],
  };

  /* Lay the sequence out left to right; remember each item's exits. */
  let x = 20;
  const placed = []; // { step, x0, x1, ports: {id: y} }
  COMPACT.sequence.forEach((step) => {
    if (step.kind === 'stages') {
      const ports = {};
      if (step.ids.length === 1) {
        base.push(stage(x, AX - 26, SW, 52, step.ids[0], stageLines[step.ids[0]]));
        ports[step.ids[0]] = AX;
      } else {
        // two origins, stacked; the axis runs between them
        step.ids.forEach((id, i) => {
          const y = AX - 54 + i * 66;
          base.push(stage(x, y - 26, SW, 52, id, stageLines[id]));
          ports[id] = y;
        });
      }
      placed.push({ step, x0: x, x1: x + SW, ports });
      x += SW + GAP;
    } else {
      const lines = wrap(step.label, 15);
      const h = lines.length > 1 ? 46 : 32;
      base.push(node(x, AX - h / 2, GW, h, step.id, step.label, lines));
      placed.push({ step, x0: x, x1: x + GW, ports: { [step.id]: AX } });
      x += GW + GAP;
    }
  });

  /* Flows: each item feeds the next; a group with `from` takes only those
     origins, and the other origins skip over it to the item after. */
  placed.forEach((p, i) => {
    const next = placed[i + 1];
    if (!next) return;
    const targetY = Object.values(next.ports)[0];
    Object.entries(p.ports).forEach(([id, y]) => {
      if (next.step.kind === 'group' && next.step.from && !next.step.from.includes(id)) {
        const after = placed[i + 2];
        if (after) base.push(flow(p.x1, y, after.x0, Object.values(after.ports)[0]));
        return;
      }
      base.push(flow(p.x1, y, next.x0, targetY));
    });
  });

  /* One return arrow, no detail. */
  const from = placed.find((p) => p.ports[COMPACT.returnArrow.from]);
  const to = placed.find((p) => p.ports[COMPACT.returnArrow.to]);
  const fx = (from.x0 + from.x1) / 2, tx = (to.x0 + to.x1) / 2;
  base.push(`<g className="cp-ret" data-id="${COMPACT.returnArrow.id}">
      <path d="M ${fx} ${AX - 26} L ${fx} 70 L ${tx} 70 L ${tx} ${AX - 30}" markerEnd="${M('cp-tip-soft')}" />
      ${chip((fx + tx) / 2, 74, COMPACT.returnArrow.label, 'cp-ret-t')}</g>`);

  /* Two layers, the whole chain. Static here: the short version has no doors. */
  COMPACT.bands.forEach((id, i) => {
    const y = 236 + i * 36;
    base.push(`<g className="cp-band" data-id="${id}">
      <rect x="20" y="${y}" width="${W - 40}" height="30" />
      <path className="cp-band-line" d="M 20 ${y} L ${W - 20} ${y}" />
      ${T(32, y + 20, B[id].label, 'cp-band-t')}</g>`);
  });

  return { W, H, base, aria: CHAIN_COPY.aria.compact };
}

/* ═══ EMIT ════════════════════════════════════════════════════════════════ */

/* role="img" would make the browser prune every button inside the drawing
   from the accessibility tree, so the plates are groups with a title and a
   description, and the joints and layers inside them stay reachable. */
const svgWide = (p) => `<svg className="cp-svg cp-svg--wide" viewBox={extended ? "0 0 ${p.W} ${p.H_UNIT}" : "0 0 ${p.W} ${p.H}"} role="group" aria-labelledby="cp-wide-title" aria-describedby="cp-wide-desc" focusable="false">
    <title id="cp-wide-title">${esc(p.aria.title)}</title>
    <desc id="cp-wide-desc">${esc(p.aria.desc)}</desc>
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
    <g className="cp-hits">
      ${p.hits.join('\n      ')}
    </g>
  </svg>`;

const svgCompact = (p) => `<svg className="cp-svg cp-svg--compact" viewBox="0 0 ${p.W} ${p.H}" role="img" aria-labelledby="cp-compact-title" aria-describedby="cp-compact-desc" focusable="false">
    <title id="cp-compact-title">${esc(p.aria.title)}</title>
    <desc id="cp-compact-desc">${esc(p.aria.desc)}</desc>
    ${defs()}
    <g className="cp-base">
      ${p.base.join('\n      ')}
    </g>
  </svg>`;

SUF = '--wide';
const w = wide();
const wideJsx = svgWide(w);
SUF = '--compact';
const c = compact();
const compactJsx = svgCompact(c);

fs.writeFileSync(path.join(OUT, 'ChainPlateSvg.tsx'), `/**
 * GENERATED by scripts/build-chain-plate.mjs — do not edit by hand.
 * Content: src/data/industryChain.ts. Layout: the generator.
 * Regenerate with \`npm run build:chain\`.
 *
 * Two plates for a wide screen, one content: the full chain and the short
 * version. The joint markers and the layer bands are React components so
 * their text comes from the data at run time. The narrow-screen layout is
 * ChainColumn.tsx, not generated. CSS picks which plate is shown, and which
 * lens overlay is visible, from the wrapper's data attributes.
 */
import { BandHit } from './BandHit';
import { JointHit } from './JointHit';

/** \`extended\` makes room at the foot for the unit-economics strip; the plate passes it while that lens is on. */
export function ChainPlateWide({ extended = false }: { extended?: boolean }) {
  return (
  ${wideJsx}
  );
}

export function ChainPlateCompact() {
  return (
  ${compactJsx}
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
 * Every category is told by form before colour: stages are solid boxes with
 * a heavy outline, nodes are dashed pills, layers are filled bands, returns
 * are dashed arcs, money is dotted with a filled head, information is
 * dash-dot with an open head, borders are vertical dashes with a chip.
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

/* Base — the far reading, deliberately quiet so the lenses can speak. */
.cp-base{transition:opacity .22s ease}
.chain-plate[data-lens] .cp-base{opacity:.42}
.cp-stage rect{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1.5}
.cp-stage .cp-origin{fill:hsl(var(--primary));stroke:none}
.cp-stage-t{font-size:18px;font-weight:600;fill:hsl(var(--foreground));letter-spacing:-.005em}
.cp-node rect{fill:hsl(var(--background));stroke:hsl(var(--muted-foreground));stroke-width:1.1;stroke-dasharray:3 2.5}
.cp-node-t{font-size:15px;fill:hsl(var(--foreground))}
.cp-recur{font-size:14px;fill:hsl(var(--muted-foreground))}
.cp-lane-t{font-size:14px;fill:hsl(var(--muted-foreground))}
.cp-demand path{stroke:hsl(var(--foreground));stroke-width:2}
.cp-demand-t{font-size:14px;fill:hsl(var(--foreground))}
.cp-flow{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.3}
.cp-flow-thin{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:.8}
.cp-mk{fill:hsl(var(--muted-foreground))}
.cp-mk-open{fill:hsl(var(--background));stroke:hsl(var(--muted-foreground));stroke-width:1}
.cp-energy{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.2}
.cp-kind-t{font-size:14px;fill:hsl(var(--muted-foreground));letter-spacing:.09em;text-transform:uppercase}
.cp-chip{fill:hsl(var(--background))}
.cp-money{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.4;stroke-dasharray:2 3.5;stroke-linecap:round}
.cp-info{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.1;stroke-dasharray:9 3 1.5 3}
.cp-rail-t{font-size:14px;fill:hsl(var(--foreground));font-family:var(--cp-mono)}
.cp-ret path{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.1;stroke-dasharray:5 3;stroke-linejoin:round}
.cp-ret-t{font-size:14px;fill:hsl(var(--muted-foreground));font-family:var(--cp-mono)}
.cp-byp path{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1}
.cp-border path{fill:none;stroke:hsl(var(--foreground));stroke-width:1.2;stroke-dasharray:6 4}
.cp-border-t{font-size:14px;fill:hsl(var(--foreground));letter-spacing:.09em;text-transform:uppercase;font-weight:600}
.cp-band rect{fill:hsl(var(--secondary))}
.cp-band-line{stroke:hsl(var(--border));stroke-width:1}
.cp-band-t{font-size:14px;fill:hsl(var(--foreground));letter-spacing:.09em;text-transform:uppercase}
.cp-band-n{font-size:14px;fill:hsl(var(--muted-foreground));font-family:var(--cp-mono)}

/* Lenses — overlays, mutually exclusive, never a reveal of hidden structure. */
.cp-lens{display:none}
.chain-plate[data-lens="economy"] .cp-lens--economy{display:block}
.chain-plate[data-lens="unit"] .cp-lens--unit{display:block}

.cp-econ-t{font-size:14px;fill:var(--cp-far);letter-spacing:.1em;text-transform:uppercase;font-weight:700}
.cp-econ-n{font-size:14px;fill:var(--cp-far)}
.cp-econ-lead{fill:none;stroke:var(--cp-far);stroke-width:.9}

.cp-slice rect{fill:var(--cp-near);fill-opacity:.2;stroke:var(--cp-near);stroke-width:1.2}
.cp-slice-lead{fill:none;stroke:var(--cp-near);stroke-width:.9}
.cp-slice-t{font-size:14px;fill:hsl(var(--foreground));font-family:var(--cp-mono);font-weight:600}
.cp-slice-n{font-size:14px;fill:hsl(var(--muted-foreground));font-family:var(--cp-mono)}

/* Interactive marks: joints and layers. Quiet at rest; the chip with the
   margin kind shows on hover, on focus, or under the unit lens. Hover is a
   convenience only — every target is a button and opens the panel on
   click, tap or Enter. */
.cp-hit{cursor:pointer}
.cp-hit:focus{outline:none}
.cp-joint .cp-joint-mark{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1.5}
.cp-joint-lead{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:.9;stroke-dasharray:1.5 2.5}
.cp-hit-chip{display:none;pointer-events:none}
.cp-hit:focus-visible .cp-hit-chip,.cp-hit[aria-expanded="true"] .cp-hit-chip{display:block}
.chain-plate[data-lens="unit"] .cp-hit-chip{display:block}
@media (hover:hover) and (pointer:fine){
  .cp-hit:hover .cp-hit-chip{display:block}
  .cp-joint:hover .cp-joint-mark{stroke:var(--cp-near);stroke-width:2}
  .cp-band-hit:hover rect.cp-band-rect{fill:hsl(var(--muted))}
}
.cp-joint-chip{pointer-events:none}
.cp-hit-chip rect,.cp-joint-chip rect{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1}
.cp-hit-chip text,.cp-joint-chip text{font-size:14px;fill:hsl(var(--foreground));letter-spacing:.08em;text-transform:uppercase;font-weight:600}
.chain-plate[data-lens="unit"] .cp-joint .cp-joint-mark{stroke:var(--cp-near);stroke-width:2}
.cp-joint[aria-expanded="true"] .cp-joint-mark{fill:var(--cp-near);stroke:var(--cp-near)}
.cp-joint:focus-visible .cp-joint-mark{stroke:hsl(var(--ring));stroke-width:3}
.cp-band-hit rect.cp-band-rect{fill:hsl(var(--secondary))}
.cp-band-hit[aria-expanded="true"] rect.cp-band-rect{fill:hsl(var(--muted));stroke:var(--cp-near);stroke-width:1.5}
.cp-band-hit:focus-visible rect.cp-band-rect{stroke:hsl(var(--ring));stroke-width:2}
@media (prefers-reduced-motion:reduce){.cp-base{transition:none}}
`);

console.log('generated ChainPlateSvg.tsx and chain-plate.css');
