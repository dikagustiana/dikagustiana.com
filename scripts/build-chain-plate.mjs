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
 * every stage takes the same style, and no mark carries a magnitude.
 *
 * The joints are the protagonists. The boxes are drawn light, the flow is
 * the heaviest line on the plate, and every joint carries a chip at rest
 * whose word is the joint read at the chosen distance. The chips live in a
 * reading lane directly under the chain, one or two rows deep, each on a
 * short leader to its diamond.
 *
 * Interactive marks (the joint markers and the layer bands) are emitted as
 * React components — <JointHit>, <BandHit> — with their geometry as props,
 * so the label, the chip word and the aria text come from the data file at
 * run time and never go stale in this file. A shift overlay is static
 * geometry: rings, outlines, one arrow and a callout, shown by CSS from the
 * wrapper's data-shift attribute.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STAGES, NODES, RETAIL, RETAIL_GROUP, BANDS, BORDERS, JOINTS, RETURNS, BYPRODUCT, NON_PHYSICAL,
  FLOW_KIND_LABELS, COMPACT, CHAIN_COPY, SHIFTS,
} from '../src/data/industryChain.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'src', 'components', 'industry-chain');

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const S = byId(STAGES), N = byId(NODES), R = byId(RETURNS);
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
const chip = (x, y, s, cls, anchor = 'middle', size = 14, perEm = 0.56, h = 18) => {
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
      <marker id="cp-tip${SUF}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk" /></marker>
      <marker id="cp-tip-soft${SUF}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk-soft" /></marker>
      <marker id="cp-tip-money${SUF}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk-soft" /></marker>
      <marker id="cp-tip-info${SUF}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 1 1.5 L 8 5 L 1 8.5 z" className="cp-mk-open" /></marker>
      <marker id="cp-tip-shift${SUF}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk-shift" /></marker>
    </defs>`;

const flow = (x1, y1, x2, y2, cls = 'cp-flow', marker = '') =>
  `<path className="${cls}" d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}"${marker ? ` markerEnd="${M(marker)}"` : ''} />`;

/** A quiet diamond on a flow, for the short plate where the joints are a motif, not doors. */
const diamond = (x, y, r = 5) => `<path className="cp-joint-motif" d="M ${x} ${y - r} L ${x + r} ${y} L ${x} ${y + r} L ${x - r} ${y} Z" />`;

/* ═══ WIDE PLATE — the full chain ═════════════════════════════════════════ */

function wide() {
  const AX = 275;
  const base = [], jointHits = [], bandHits = [], shiftLayers = [];

  /* Type sizes, mirrored in the generated CSS. Every box is sized FROM its
     text at these sizes, so a longer label in the data widens its box
     instead of overrunning it — and nothing here restates a label. */
  const T_STAGE = 18, T_NODE = 15, T_SMALL = 14;
  /* The one layout decision: how many characters a line may hold in each
     column. The words themselves always come from the data file. */
  const CHARS = { org: 10, agg: 12, proc: 10, trad: 18, mfg: 14, dist: 12, recur: 18, ret: 14, cons: 12, demand: 15, lane: 13 };
  const lines = (id, max) => wrap(label(id), max);
  const boxW = (ls, size, pad = 24) => Math.ceil(Math.max(...ls.map((l) => est(l, size, 0.6))) + pad);

  const L = {
    bio: lines('stage-biological', CHARS.org),
    geo: lines('stage-extraction', CHARS.org),
    agg: lines('node-aggregation', CHARS.agg),
    proc: lines('stage-processing', CHARS.proc),
    trad: lines('node-trader', CHARS.trad),
    pack: lines('stage-packaging', CHARS.mfg),
    mfg: lines('stage-manufacturing', CHARS.mfg),
    princ: lines('node-principal', CHARS.mfg),
    dist: lines('node-distributor', CHARS.dist),
    whol: lines('node-wholesaler', CHARS.dist),
    recur: wrap(N['node-distributor'].recursion, CHARS.recur).map((t, i) => (i === 0 ? '↳ ' : '') + t),
    ret: RETAIL.map((r) => wrap(r.label, CHARS.ret)),
    cons: lines('stage-consumption', CHARS.cons),
    rec: lines('stage-recovery', CHARS.cons),
    demand: S['stage-consumption'].demand.map((d) => wrap(d, CHARS.demand)),
    bioLanes: S['stage-biological'].lanes.map((l) => wrap(l, CHARS.lane)),
    geoLanes: S['stage-extraction'].lanes.map((l) => wrap(l, CHARS.lane)),
  };

  const widths = {
    org: Math.max(boxW(L.bio, T_STAGE), boxW(L.geo, T_STAGE)),
    agg: boxW(L.agg, T_NODE),
    proc: boxW(L.proc, T_STAGE),
    trad: boxW(L.trad, T_NODE),
    mfg: Math.max(boxW(L.pack, T_STAGE), boxW(L.mfg, T_STAGE), boxW(L.princ, T_NODE)),
    dist: Math.max(boxW(L.dist, T_NODE), boxW(L.whol, T_NODE), boxW(L.recur, T_SMALL, 12)),
    // The retail node holds its formats as rows, so it is as wide as the widest row plus its own padding.
    ret: Math.max(...L.ret.map((ls) => boxW(ls, T_SMALL, 36)), boxW([RETAIL_GROUP.label], T_NODE)),
    cons: Math.max(boxW(L.cons, T_STAGE), boxW(L.rec, T_STAGE), ...L.demand.map((ls) => boxW(ls, T_SMALL) + 21)),
  };

  /* The fan of example lanes sets the left margin: its labels are
     end-anchored, so the chain starts far enough right for them to fit. */
  const laneW = Math.ceil(Math.max(...[...L.bioLanes, ...L.geoLanes].flat().map((l) => est(l, T_SMALL, 0.6))));
  const GAP = 26, LEFT = laneW + 66;
  const C = { fanT: LEFT - 58, fanL: LEFT - 50 };
  let cx = LEFT;
  for (const k of ['org', 'agg', 'proc', 'trad', 'mfg', 'dist', 'ret', 'cons']) {
    C[k] = [cx, cx + widths[k]];
    cx += widths[k] + GAP;
  }
  C.princ = C.mfg;
  C.rec = C.cons;
  const mid = (c) => Math.round((c[0] + c[1]) / 2);

  /* Rows. The chain runs on AX; everything else hangs off it. */
  const LANE_DY = 34;
  const bioB = [138, 20 + L.bio.length * (T_STAGE + 1)], bioY = bioB[0] + Math.round(bioB[1] / 2);
  const geoB = [352, 20 + L.geo.length * (T_STAGE + 1)], geoY = geoB[0] + Math.round(geoB[1] / 2);
  const procH = 20 + L.proc.length * (T_STAGE + 1), procB = [AX - Math.round(procH / 2), procH];
  const mfgH = 20 + L.mfg.length * (T_STAGE + 1), mfgB = [AX - Math.round(mfgH / 2), mfgH];
  const packB = [96, 20 + L.pack.length * (T_STAGE + 1)];
  const tradH = 16 + L.trad.length * 16, tradB = [AX - Math.round(tradH / 2), tradH];
  const princB = [398, 16 + L.princ.length * 16];
  const distY = 240, wholY = 372, distH = 34;
  /* The retail node: a kicker, then one row per format, each as tall as its wrapped label. */
  const RET_ROW_GAP = 9, RET_PAD = 12;
  const retRowH = L.ret.map((ls) => ls.length * 15 + 6);
  const retInner = retRowH.reduce((a, b) => a + b, 0) + (retRowH.length - 1) * RET_ROW_GAP;
  const RET_HEAD = 33; // the kicker and, under it, the note
  const retH = RET_PAD + RET_HEAD + retInner + RET_PAD;
  const retB = [AX - Math.round(retH / 2), retH];
  const consB = [retB[0] - 6, retH + 12];
  const recB = [consB[0] + consB[1] + 34, 44];
  const CHAIN_BOTTOM = recB[0] + recB[1];
  const ROW_A = CHAIN_BOTTOM + 22, ROW_B = ROW_A + 24;
  const RAIL0 = ROW_B + 36, RAIL_DY = 20;
  const BAND0 = RAIL0 + NON_PHYSICAL.length * RAIL_DY + 16, BAND_H = 26, BAND_DY = 30;
  const H = BAND0 + BANDS.length * BAND_DY + 10;
  const W = C.cons[1] + 130;

  /* Fan lanes into the two origins: examples of a function, not a shape. */
  const fan = (ls, i, y0, portY) => {
    const y = y0 + i * LANE_DY;
    return [
      ...ls.map((t, k) => T(C.fanT, y + 4 + (k - (ls.length - 1) / 2) * 15, t, 'cp-lane-t', 'end')),
      `<path className="cp-flow-thin" d="M ${C.fanL} ${y} C ${C.fanL + 26} ${y}, ${C.fanL + 32} ${portY}, ${C.org[0]} ${portY}" />`,
    ];
  };
  L.bioLanes.forEach((ls, i) => base.push(...fan(ls, i, 106, bioY)));
  L.geoLanes.forEach((ls, i) => base.push(...fan(ls, i, 360, geoY)));

  /* Forward flows — the heaviest line on the plate: the chain itself. */
  base.push(
    flow(C.org[1], bioY, C.agg[0], bioY),
    flow(C.agg[1], bioY, C.proc[0], AX),
    flow(C.org[1], geoY, C.proc[0], AX),
    flow(C.proc[1], AX, C.trad[0], AX),
    flow(C.trad[1], AX, C.mfg[0], AX),
    flow(C.mfg[1], AX, C.dist[0], distY), flow(C.mfg[1], AX, C.dist[0], wholY),
    // the distributor sells on to the wholesaler
    `<path className="cp-flow" d="M ${C.dist[0] + 8} ${distY + distH / 2} L ${C.dist[0] + 8} ${wholY - distH / 2 - 3}" markerEnd="${M('cp-tip')}" />`,
    // the distributor and the wholesaler both sell into the retail node
    flow(C.dist[1], distY, C.ret[0], distY),
    flow(C.dist[1], wholY, C.ret[0], wholY),
    // retail sells to consumption on the axis
    `<path className="cp-flow" d="M ${C.ret[1]} ${AX} L ${C.cons[0]} ${AX}" />`,
    // packaging joins manufacturing from above
    `<path className="cp-flow" d="M ${mid(C.mfg) - 40} ${packB[0] + packB[1]} L ${mid(C.mfg) - 40} ${mfgB[0] - 3}" markerEnd="${M('cp-tip')}" />`,
    // the principal takes title alongside manufacturing
    `<path className="cp-flow-thin" d="M ${C.mfg[0] + 20} ${mfgB[0] + mfgB[1]} L ${C.mfg[0] + 20} ${princB[0]}" />`,
    // consumption → recovery, on the right half of the column so its chip has room
    `<path className="cp-flow" d="M ${mid(C.cons) + 30} ${consB[0] + consB[1]} L ${mid(C.cons) + 30} ${recB[0] - 3}" markerEnd="${M('cp-tip')}" />`,
  );

  /* The forms. Every line of text comes from the data, wrapped to the column. */
  const boxes = {};
  const place = (id, x, y, w, h) => { boxes[id] = [x, y, w, h]; };
  place('stage-biological', C.org[0], bioB[0], widths.org, bioB[1]);
  place('stage-extraction', C.org[0], geoB[0], widths.org, geoB[1]);
  place('node-aggregation', C.agg[0], bioY - 17, widths.agg, 34);
  place('stage-processing', C.proc[0], procB[0], widths.proc, procB[1]);
  place('node-trader', C.trad[0], tradB[0], widths.trad, tradB[1]);
  place('stage-packaging', C.mfg[0], packB[0], widths.mfg, packB[1]);
  place('stage-manufacturing', C.mfg[0], mfgB[0], widths.mfg, mfgB[1]);
  place('node-principal', C.princ[0], princB[0], widths.mfg, princB[1]);
  place('node-distributor', C.dist[0], distY - distH / 2, widths.dist, distH);
  place('node-wholesaler', C.dist[0], wholY - distH / 2, widths.dist, distH);
  place(RETAIL_GROUP.id, C.ret[0], retB[0], widths.ret, retB[1]);
  place('stage-consumption', C.cons[0], consB[0], widths.cons, consB[1]);
  place('stage-recovery', C.rec[0], recB[0], widths.cons, recB[1]);

  /* The retail node: one dashed node holding its five formats as rows. */
  const retail = () => {
    const [x, y, w, h] = boxes[RETAIL_GROUP.id];
    let ry = y + RET_PAD + RET_HEAD + 6;
    const rows = RETAIL.map((r, i) => {
      const ls = L.ret[i];
      const out = `<g className="cp-retail-row" data-id="${r.id}">${ls.map((t, k) => T(x + 14, ry + 11 + k * 15, t, 'cp-node-t')).join('')}</g>` +
        (i < RETAIL.length - 1 ? `<path className="cp-retail-sep" d="M ${x + 14} ${ry + retRowH[i] + 4} L ${x + w - 14} ${ry + retRowH[i] + 4}" />` : '');
      ry += retRowH[i] + RET_ROW_GAP;
      return out;
    });
    return `<g className="cp-node cp-retail" data-id="${RETAIL_GROUP.id}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" />
      ${T(x + 14, y + RET_PAD + 12, RETAIL_GROUP.label, 'cp-kind-t')}${T(x + 14, y + RET_PAD + 27, RETAIL_GROUP.note, 'cp-recur')}
      ${rows.join('\n      ')}</g>`;
  };

  base.push(
    stage(...boxes['stage-biological'].slice(0, 2), widths.org, bioB[1], 'stage-biological', L.bio),
    stage(C.org[0], geoB[0], widths.org, geoB[1], 'stage-extraction', L.geo),
    node(C.agg[0], bioY - 17, widths.agg, 34, 'node-aggregation', undefined, L.agg),
    stage(C.proc[0], procB[0], widths.proc, procB[1], 'stage-processing', L.proc),
    node(C.trad[0], tradB[0], widths.trad, tradB[1], 'node-trader', undefined, L.trad),
    stage(C.mfg[0], packB[0], widths.mfg, packB[1], 'stage-packaging', L.pack),
    stage(C.mfg[0], mfgB[0], widths.mfg, mfgB[1], 'stage-manufacturing', L.mfg),
    node(C.princ[0], princB[0], widths.mfg, princB[1], 'node-principal', undefined, L.princ),
    node(C.dist[0], distY - distH / 2, widths.dist, distH, 'node-distributor', undefined, L.dist),
    ...L.recur.map((t, i) => T(C.dist[0] + 14, distY + distH / 2 + 16 + i * 15, t, 'cp-recur')),
    node(C.dist[0], wholY - distH / 2, widths.dist, distH, 'node-wholesaler', undefined, L.whol),
    retail(),
    stage(C.cons[0], consB[0], widths.cons, consB[1], 'stage-consumption', L.cons, { titleTop: true }),
    ...L.demand.map((ls, i) => {
      const y = consB[0] + 30 + L.cons.length * (T_STAGE + 1) + 22 + i * 48;
      return `<g className="cp-demand">
      <path d="M ${C.cons[0] + 12} ${y - 12} L ${C.cons[0] + 12} ${y + 4 + (ls.length - 1) * 15}" />
      ${ls.map((t, k) => T(C.cons[0] + 21, y + k * 15, t, 'cp-demand-t')).join('')}</g>`;
    }),
    stage(C.rec[0], recB[0], widths.cons, recB[1], 'stage-recovery', L.rec),
  );

  /* Borders: the external sector as two dashed cuts through the chain, at
     the two joints where goods actually leave and enter. Drawn before the
     returns so a return's chip paints over the dash, never under it. */
  const borderGeom = {
    'border-export': [Math.round((C.org[1] + C.proc[0]) / 2) - 30, [300, CHAIN_BOTTOM]],
    'border-import': [Math.round((C.trad[1] + C.mfg[0]) / 2), [86, CHAIN_BOTTOM]],
  };
  BORDERS.forEach((b) => {
    const [x, [y0, y1]] = borderGeom[b.id];
    base.push(`<g className="cp-border" data-id="${b.id}"><path d="M ${x} ${y0} L ${x} ${y1}" />
      ${chip(x, y0 - 2, b.label, 'cp-border-t')}</g>`);
  });

  /* Physical returns: dashed, above the chain, each spanning exactly its
     joints, and never crossing a node it does not connect. The path of each
     is kept so a shift can redraw it lit. */
  const returnPath = {};
  const arc = (r, x1, y1, x2, y2, peak, lx, ly, anchor = 'middle') => {
    returnPath[r.id] = `M ${x1} ${y1} C ${x1} ${peak}, ${x2} ${peak}, ${x2} ${y2}`;
    return `<g className="cp-ret" data-id="${r.id}">
      <path d="${returnPath[r.id]}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(lx, ly, r.label, 'cp-ret-t', anchor)}</g>`;
  };
  const RISER_A = W - 40, RISER_B = W - 58;
  returnPath['return-postconsumer-organic'] = `M ${C.rec[1]} ${recB[0] + 8} L ${RISER_A} ${recB[0] + 8} L ${RISER_A} 34 L ${mid(C.org)} 34 L ${mid(C.org)} ${bioB[0] - 4}`;
  returnPath['return-postconsumer-material'] = `M ${C.rec[1]} ${recB[0] + 22} L ${RISER_B} ${recB[0] + 22} L ${RISER_B} 56 L ${mid(C.proc)} 56 L ${mid(C.proc)} ${procB[0] - 4}`;
  returnPath['return-secondary'] = `M ${C.cons[1] - 60} ${consB[0]} C ${C.cons[1] - 60} ${consB[0] - 42}, ${C.cons[1] - 10} ${consB[0] - 42}, ${C.cons[1] - 10} ${consB[0]}`;
  base.push(
    arc(R['return-scrap'], C.mfg[0] + 20, mfgB[0] - 4, C.proc[1] - 20, procB[0] - 4, 150, C.proc[0] + 20, 156),
    arc(R['return-commercial'], C.ret[0] + 24, retB[0] - 2, mid(C.dist), distY - distH / 2 - 3, retB[0] - 44, C.ret[0] + 6, retB[0] - 40, 'start'),
    arc(R['return-packaging'], C.ret[0] + 60, retB[0] - 2, C.mfg[0] + 20, mfgB[0] - 4, 138, Math.round((C.mfg[1] + C.ret[0]) / 2), 144),
    `<g className="cp-ret" data-id="return-postconsumer-organic">
      <path d="${returnPath['return-postconsumer-organic']}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(C.dist[0], 38, R['return-postconsumer-organic'].label, 'cp-ret-t')}</g>`,
    `<g className="cp-ret" data-id="return-postconsumer-material">
      <path d="${returnPath['return-postconsumer-material']}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(C.trad[0], 60, R['return-postconsumer-material'].label, 'cp-ret-t')}</g>`,
    `<g className="cp-ret" data-id="return-secondary">
      <path d="${returnPath['return-secondary']}" markerEnd="${M('cp-tip-soft')}" />
      ${wrap(R['return-secondary'].label, 18).map((t, i) => T(C.cons[1] - 6, consB[0] - 58 + i * 15, t, 'cp-ret-t', 'end')).join('')}</g>`,
    // The by-product leaves processing FORWARD, into another chain — down and
    // to the right, so it can never be read as a flow back up the chain.
    `<g className="cp-byp" data-id="${BYPRODUCT.id}"><path d="M ${mid(C.proc) - 10} ${procB[0] + procB[1]} L ${C.proc[1] - 34} ${procB[0] + procB[1] + 52}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(C.proc[1] - 44, procB[0] + procB[1] + 74, BYPRODUCT.label, 'cp-ret-t', 'end')}</g>`,
  );

  /* Non-physical flows: four rails under the chain. Money is dotted with a
     filled head; information is dash-dot with an open head. Upstream runs
     right to left; downstream left to right. Labels sit on the tail end. */
  const RX0 = C.org[0], RX1 = C.cons[1];
  NON_PHYSICAL.forEach((f, i) => {
    const y = RAIL0 + i * RAIL_DY;
    const up = f.direction === 'upstream';
    const cls = f.kind === 'money' ? 'cp-money' : 'cp-info';
    const tip = f.kind === 'money' ? 'cp-tip-money' : 'cp-tip-info';
    base.push(`<g className="cp-nonphys" data-id="${f.id}">
      <path className="${cls}" d="${up ? `M ${RX1} ${y} L ${RX0 + 6} ${y}` : `M ${RX0} ${y} L ${RX1 - 6} ${y}`}" markerEnd="${M(tip)}" />
      ${up ? chip(RX1 + 1, y + 4, f.label, 'cp-rail-t', 'end') : chip(RX0 - 1, y + 4, f.label, 'cp-rail-t', 'start')}</g>`);
  });
  ['money', 'information'].forEach((k, i) => base.push(T(C.fanT, RAIL0 + i * 2 * RAIL_DY + 14, FLOW_KIND_LABELS[k], 'cp-kind-t', 'end')));

  /* The reading lane: the chips of the joints sit here, and its label is the
     distance that is on. Both names are drawn; CSS shows the one that is. */
  base.push(
    T(C.fanT, ROW_A + 14, CHAIN_COPY.lensName.economy, 'cp-kind-t cp-lens-name cp-lens-name--economy', 'end'),
    T(C.fanT, ROW_A + 14, CHAIN_COPY.lensName.finance, 'cp-kind-t cp-lens-name cp-lens-name--finance', 'end'),
  );

  /* Enabling layers: six bands, each exactly over its span. Interactive, so
     emitted as <BandHit>; the label and chip come from the data at run time. */
  const colX = {
    'stage-biological': C.org, 'stage-extraction': C.org, 'node-aggregation': C.agg, 'stage-processing': C.proc,
    'node-trader': C.trad, 'stage-packaging': C.mfg, 'stage-manufacturing': C.mfg, 'node-distributor': C.dist,
    'node-wholesaler': C.dist, 'node-retail': C.ret, 'stage-consumption': C.cons, 'stage-recovery': C.cons,
  };
  const bandGeom = {};
  BANDS.forEach((b, i) => {
    const x0 = colX[b.span[0]][0], x1 = colX[b.span[1]][1];
    const y = BAND0 + i * BAND_DY;
    bandGeom[b.id] = [x0, y, x1 - x0, BAND_H];
    const labelEnd = 10 + est(b.label, T_SMALL, 0.62) + 46;
    // A note only fits where it clears the label and the chip at the far end.
    const chipRoom = 10 + est('Conversion', T_SMALL, 0.62) + 26;
    const noteFits = b.note ? labelEnd + est(b.note, T_SMALL, 0.6) + chipRoom < x1 - x0 : false;
    bandHits.push(`<BandHit id="${b.id}" x={${x0}} y={${y}} width={${x1 - x0}} height={${BAND_H}} noteX={${noteFits ? Math.round(x0 + labelEnd) : 'null'}} />`);
  });

  /* Joint markers: one per joint, always present, with its chip always on.
     Row chips line up in the reading lane under the chain, on one of two
     rows so neighbours never touch, and a chip may sit off its joint's x on
     an elbowed leader where three joints share one stretch. A side chip sits
     where a leader down would have to cross a box. The joint that shares its
     x with a border takes the lower row, so its chip is never read as the
     border's label. */
  const jointGeom = {
    'j-production-aggregation': [Math.round((C.org[1] + C.agg[0]) / 2), bioY, 'rowA', -20],
    'j-extraction-processing': [C.org[1] + 116, 298, 'rowB', 0],
    'j-aggregation-processing': [Math.round((C.agg[1] + C.proc[0]) / 2), Math.round((bioY + AX) / 2), 'rowA', 20],
    'j-processing-trader': [Math.round((C.proc[1] + C.trad[0]) / 2), AX, 'rowB', 0],
    'j-trader-manufacturing': [Math.round((C.trad[1] + C.mfg[0]) / 2), AX, 'rowB', 0],
    'j-packaging-manufacturing': [mid(C.mfg) - 40, Math.round((packB[0] + packB[1] + mfgB[0]) / 2), 'right', 0],
    'j-manufacturing-distribution': [Math.round((C.mfg[1] + C.dist[0]) / 2), AX, 'rowA', 0],
    'j-distributor-wholesaler': [C.dist[0] + 8, Math.round((distY + wholY) / 2), 'right', 0],
    'j-wholesale-retail': [Math.round((C.dist[1] + C.ret[0]) / 2), wholY, 'rowA', 0],
    'j-retail-consumption': [Math.round((C.ret[1] + C.cons[0]) / 2), AX, 'rowA', 0],
    'j-consumption-recovery': [mid(C.cons) + 30, Math.round((consB[0] + consB[1] + recB[0]) / 2), 'right', 0],
  };
  JOINTS.forEach((j) => {
    const [x, y, at, dx] = jointGeom[j.id];
    const chipX = at === 'left' ? x - 14 : at === 'right' ? x + 14 : x + dx;
    const chipY = at === 'rowA' ? ROW_A : at === 'rowB' ? ROW_B : y - 9;
    jointHits.push(`<JointHit id="${j.id}" cx={${x}} cy={${y}} chipX={${chipX}} chipY={${chipY}} chipAt="${at}" />`);
  });

  /* ── Shift overlays: static geometry per shift — a ring on every target,
     one arrow where a cut moves, a callout — shown by CSS from data-shift.
     Nothing here redraws the chain; the base stays where it is and recedes. ── */
  const lit = (id) => {
    if (jointGeom[id]) {
      const [x, y] = jointGeom[id];
      return `<circle className="cp-lit-ring" cx="${x}" cy="${y}" r="17" />`;
    }
    if (bandGeom[id]) {
      const [x, y, w, h] = bandGeom[id];
      return `<rect className="cp-lit-rect" x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="3" />`;
    }
    if (borderGeom[id]) {
      const [x, [y0, y1]] = borderGeom[id];
      return `<path className="cp-lit-line" d="M ${x} ${y0} L ${x} ${y1}" />`;
    }
    if (returnPath[id]) return `<path className="cp-lit-path" d="${returnPath[id]}" markerEnd="${M('cp-tip-shift')}" />`;
    if (boxes[id]) {
      const [x, y, w, h] = boxes[id];
      return `<rect className="cp-lit-rect" x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" rx="${N[id] || id === RETAIL_GROUP.id ? 12 : 4}" />`;
    }
    throw new Error(`shift target ${id} has no geometry on the wide plate`);
  };
  const xOf = (id) => (jointGeom[id]?.[0] ?? borderGeom[id]?.[0] ?? (boxes[id] ? boxes[id][0] + boxes[id][2] / 2 : null));
  const move = (m) => {
    const x0 = xOf(m.from), x1 = xOf(m.to);
    if (x0 === null || x1 === null) throw new Error(`move ${m.id} has an end with no x`);
    // Above the chain, clear of the processing box, then down onto the joint.
    const y = 222, land = jointGeom[m.to] ? jointGeom[m.to][1] - 22 : AX - 22;
    return `<g className="cp-move" data-id="${m.id}">
      <path className="cp-move-path" d="M ${x0} ${y} L ${x1} ${y} L ${x1} ${land}" markerEnd="${M('cp-tip-shift')}" />
      ${T(x0, y - 8, m.label, 'cp-move-t')}</g>`;
  };
  const callout = (c) => {
    if (borderGeom[c.at]) {
      // Beside the border's own chip, on its row: the two risers above leave no clear line there.
      const [x, [y0]] = borderGeom[c.at];
      return `<g className="cp-callout" data-id="${c.id}">${chip(x + 44, y0 - 1, c.label, 'cp-callout-t', 'start', 14, 0.6, 20)}</g>`;
    }
    const x = xOf(c.at);
    if (x === null) throw new Error(`callout ${c.id} has no x`);
    // Under the chain, on the lower row of the reading lane.
    return `<g className="cp-callout" data-id="${c.id}">${chip(x, ROW_B + 14, c.label, 'cp-callout-t', 'middle', 14, 0.6, 20)}</g>`;
  };
  SHIFTS.forEach((s) => {
    shiftLayers.push(`<g className="cp-shift cp-shift--${s.id}" data-id="${s.id}">
      ${s.targets.map((t) => `<g className="cp-lit" data-for="${t.id}">${lit(t.id)}</g>`).join('\n      ')}
      ${s.moves.map(move).join('\n      ')}
      ${s.callouts.map(callout).join('\n      ')}
    </g>`);
  });

  return { W, H, base, shiftLayers, hits: [...jointHits, ...bandHits], aria: CHAIN_COPY.aria.wide };
}

/* ═══ COMPACT PLATE — the short version ═══════════════════════════════════ */

function compact() {
  const W = 1590, H = 320, AX = 150;
  const base = [];
  const SW = 180, GW = 150, GAP = 28;
  /* Wrapped from the data, never restated here: fifteen characters is what a
     180-wide box holds at the stage type size. */
  const stageLines = (id) => wrap(label(id), 15);
  /** A box is as tall as the label the data gives it. */
  const stageH = (id) => 20 + stageLines(id).length * 19;

  /* Lay the sequence out left to right; remember each item's exits. */
  let x = 20;
  const placed = []; // { step, x0, x1, ports: {id: y} }
  COMPACT.sequence.forEach((step) => {
    if (step.kind === 'stages') {
      const ports = {};
      if (step.ids.length === 1) {
        const h = stageH(step.ids[0]);
        base.push(stage(x, AX - h / 2, SW, h, step.ids[0], stageLines(step.ids[0])));
        ports[step.ids[0]] = AX;
      } else {
        // two origins, stacked; the axis runs between them
        const hs = step.ids.map(stageH);
        const total = hs.reduce((a, b) => a + b, 0) + 16;
        let top = AX - total / 2;
        step.ids.forEach((id, i) => {
          base.push(stage(x, top, SW, hs[i], id, stageLines(id)));
          ports[id] = top + hs[i] / 2;
          top += hs[i] + 16;
        });
      }
      placed.push({ step, x0: x, x1: x + SW, ports });
      x += SW + GAP;
    } else {
      const lines = wrap(step.label, 15);
      const h = lines.length > 1 ? 46 : 32;
      /* A group that serves only some of the origins sits on THAT origin's
         row, so the origins it does not serve pass it by instead of running
         through it. */
      const prev = placed[placed.length - 1];
      const y = step.from && prev && Object.keys(prev.ports).length > 1 ? prev.ports[step.from[0]] : AX;
      base.push(node(x, y - h / 2, GW, h, step.id, step.label, lines));
      placed.push({ step, x0: x, x1: x + GW, ports: { [step.id]: y } });
      x += GW + GAP;
    }
  });

  /* Flows: each item feeds the next; a group with `from` takes only those
     origins, and the other origins skip over it to the item after. A quiet
     diamond sits on every flow at its middle: the joints, as a motif. */
  const motifs = [];
  const join = (x1, y1, x2, y2) => {
    base.push(flow(x1, y1, x2, y2));
    motifs.push(diamond((x1 + x2) / 2, (y1 + y2) / 2));
  };
  placed.forEach((p, i) => {
    const next = placed[i + 1];
    if (!next) return;
    const targetY = Object.values(next.ports)[0];
    Object.entries(p.ports).forEach(([id, y]) => {
      if (next.step.kind === 'group' && next.step.from && !next.step.from.includes(id)) {
        const after = placed[i + 2];
        if (after) join(p.x1, y, after.x0, Object.values(after.ports)[0]);
        return;
      }
      join(p.x1, y, next.x0, targetY);
    });
  });
  base.push(...motifs);

  /* One return arrow, no detail. */
  const from = placed.find((p) => p.ports[COMPACT.returnArrow.from]);
  const to = placed.find((p) => p.ports[COMPACT.returnArrow.to]);
  const fx = (from.x0 + from.x1) / 2, tx = (to.x0 + to.x1) / 2;
  base.push(`<g className="cp-ret" data-id="${COMPACT.returnArrow.id}">
      <path d="M ${fx} ${AX - 26} L ${fx} 70 L ${tx} 70 L ${tx} ${AX - 30}" markerEnd="${M('cp-tip-soft')}" />
      ${chip((fx + tx) / 2, 74, COMPACT.returnArrow.label, 'cp-ret-t')}</g>`);

  /* Two layers, the whole chain. Static here: the short version has no doors. */
  const B = byId(BANDS);
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
const svgWide = (p) => `<svg className="cp-svg cp-svg--wide" viewBox="0 0 ${p.W} ${p.H}" role="group" aria-labelledby="cp-wide-title" aria-describedby="cp-wide-desc" focusable="false">
    <title id="cp-wide-title">${esc(p.aria.title)}</title>
    <desc id="cp-wide-desc">${esc(p.aria.desc)}</desc>
    ${defs()}
    <g className="cp-base">
      ${p.base.join('\n      ')}
    </g>
    <g className="cp-shifts" aria-hidden="true">
      ${p.shiftLayers.join('\n      ')}
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
 * their text comes from the data at run time; the shift overlays are static
 * geometry shown by CSS from the wrapper's data-shift attribute. The
 * narrow-screen layout is ChainColumn.tsx, not generated.
 */
import { BandHit } from './BandHit';
import { JointHit } from './JointHit';

export function ChainPlateWide() {
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
 * base map sits on foreground / muted / border. The one accent on the plate
 * is the editorial orange, and it means exactly one thing: a SHIFT — the
 * ring on a joint or layer that moves, the arrow of a cut that moves, the
 * callout beside it. It is used as a field and an edge, never as text, which
 * would fail contrast on the card ground. The two distances have no colour:
 * they change the words on the chips, and the lane label says which is on.
 *
 * Every category is told by form before colour: stages are solid boxes,
 * nodes are dashed pills, layers are filled bands, returns are dashed arcs,
 * money is dotted with a filled head, information is dash-dot with an open
 * head, borders are vertical dashes with a chip. The margin kinds are told
 * by the chip's border: solid for conversion, dashed for a spread, filled
 * for a fee — the same three forms the panel uses.
 *
 * Weight: the flow is the heaviest line on the plate and the joint diamond
 * the heaviest mark, so the chain and its joints read first; the boxes are
 * drawn a step lighter than they were. Under a shift the base geometry and
 * every unlit joint recede to a fixed opacity; labels never dim.
 */
.chain-plate{
  --cp-shift: hsl(var(--accent-editorial));
}
.chain-plate .cp-svg{display:block;width:100%;height:auto}

/* Base — quiet where it is not the chain. */
.cp-base :is(path,rect,circle,ellipse,line,polygon,polyline){transition:opacity .22s ease}
.cp-stage rect{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1}
.cp-stage .cp-origin{fill:hsl(var(--primary));stroke:none}
.cp-stage-t{font-size:18px;font-weight:600;fill:hsl(var(--foreground));letter-spacing:-.005em}
.cp-node rect{fill:hsl(var(--background));stroke:hsl(var(--muted-foreground));stroke-width:1;stroke-dasharray:3 2.5}
.cp-node-t{font-size:15px;fill:hsl(var(--foreground))}
.cp-retail-sep{fill:none;stroke:hsl(var(--border));stroke-width:1}
.cp-recur{font-size:14px;fill:hsl(var(--muted-foreground))}
.cp-lane-t{font-size:14px;fill:hsl(var(--muted-foreground))}
.cp-demand path{stroke:hsl(var(--foreground));stroke-width:2}
.cp-demand-t{font-size:14px;fill:hsl(var(--foreground))}
.cp-flow{fill:none;stroke:hsl(var(--foreground));stroke-width:1.7}
.cp-flow-thin{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:.8}
.cp-mk{fill:hsl(var(--foreground))}
.cp-mk-soft{fill:hsl(var(--muted-foreground))}
.cp-mk-open{fill:hsl(var(--background));stroke:hsl(var(--muted-foreground));stroke-width:1}
.cp-mk-shift{fill:var(--cp-shift)}
.cp-kind-t{font-size:14px;fill:hsl(var(--muted-foreground));letter-spacing:.09em;text-transform:uppercase}
.cp-chip{fill:hsl(var(--background))}
.cp-money{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.4;stroke-dasharray:2 3.5;stroke-linecap:round}
.cp-info{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.1;stroke-dasharray:9 3 1.5 3}
.cp-rail-t{font-size:14px;fill:hsl(var(--muted-foreground))}
.cp-ret path{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1;stroke-dasharray:5 3;stroke-linejoin:round}
.cp-ret-t{font-size:14px;fill:hsl(var(--muted-foreground))}
.cp-byp path{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1}
.cp-border path{fill:none;stroke:hsl(var(--foreground));stroke-width:1.2;stroke-dasharray:6 4}
.cp-border-t{font-size:14px;fill:hsl(var(--foreground));letter-spacing:.09em;text-transform:uppercase;font-weight:600}
.cp-band rect{fill:hsl(var(--secondary))}
.cp-band-line{stroke:hsl(var(--border));stroke-width:1}
.cp-band-t{font-size:14px;fill:hsl(var(--foreground));letter-spacing:.09em;text-transform:uppercase}
.cp-band-n{font-size:14px;fill:hsl(var(--muted-foreground))}
.cp-joint-motif{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1.5}

/* The reading lane: one distance name shows, from the wrapper's data-lens. */
.cp-lens-name{display:none}
.chain-plate[data-lens="economy"] .cp-lens-name--economy{display:block}
.chain-plate[data-lens="finance"] .cp-lens-name--finance{display:block}

/* Interactive marks: joints and layers. Every target is a button and opens
   the panel on click, tap or Enter; hover only strengthens the mark. */
.cp-hit{cursor:pointer}
.cp-hit:focus{outline:none}
.cp-joint .cp-joint-mark{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1.8}
.cp-joint-lead{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:.9}
.cp-joint-chip{pointer-events:none}
.cp-joint-chip rect{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1}
.cp-joint-chip text{font-size:14px;fill:hsl(var(--foreground))}
.cp-joint-chip.cp-chip--dashed rect{stroke-dasharray:3 2.5}
.cp-joint-chip.cp-chip--filled rect{fill:hsl(var(--secondary));stroke:hsl(var(--border))}
.cp-hit-chip{pointer-events:none}
.cp-hit-chip rect{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1}
.cp-hit-chip text{font-size:14px;fill:hsl(var(--foreground))}
.cp-hit-chip.cp-chip--dashed rect{stroke-dasharray:3 2.5}
.cp-hit-chip.cp-chip--filled rect{fill:hsl(var(--background));stroke:hsl(var(--border))}
.cp-hit-chip.cp-chip--word rect{stroke:hsl(var(--muted-foreground))}
.cp-hit-chip.cp-chip--word text{fill:hsl(var(--muted-foreground))}
@media (hover:hover) and (pointer:fine){
  .cp-joint:hover .cp-joint-mark{stroke-width:2.6}
  .cp-band-hit:hover rect.cp-band-rect{fill:hsl(var(--muted))}
}
.cp-joint[aria-expanded="true"] .cp-joint-mark{fill:hsl(var(--foreground))}
.cp-joint:focus-visible .cp-joint-mark{stroke:hsl(var(--ring));stroke-width:3}
.cp-band-hit rect.cp-band-rect{fill:hsl(var(--secondary))}
.cp-band-hit[aria-expanded="true"] rect.cp-band-rect{fill:hsl(var(--muted));stroke:hsl(var(--foreground));stroke-width:1.2}
.cp-band-hit:focus-visible rect.cp-band-rect{stroke:hsl(var(--ring));stroke-width:2}

/* Shifts — one overlay at a time, never a redraw. The rest of the plate recedes. */
.cp-shift{display:none}
.chain-plate[data-shift="reindustrialisation"] .cp-shift--reindustrialisation{display:block}
.chain-plate[data-shift="green"] .cp-shift--green{display:block}
.chain-plate[data-shift] .cp-base :is(path,rect,circle,ellipse,line,polygon,polyline){opacity:.4}
.chain-plate[data-shift] .cp-hit:not([data-lit]),.chain-plate[data-shift] .cp-joint-chip:not([data-lit]){opacity:.4}
.cp-lit-ring{fill:none;stroke:var(--cp-shift);stroke-width:2.2}
.cp-lit-rect{fill:var(--cp-shift);fill-opacity:.08;stroke:var(--cp-shift);stroke-width:1.8}
.cp-lit-line{fill:none;stroke:var(--cp-shift);stroke-width:2.4;stroke-dasharray:6 4}
.cp-lit-path{fill:none;stroke:var(--cp-shift);stroke-width:1.8;stroke-dasharray:5 3;stroke-linejoin:round}
.cp-move-path{fill:none;stroke:var(--cp-shift);stroke-width:2}
.cp-move-t{font-size:14px;fill:hsl(var(--foreground));font-weight:600}
.cp-callout rect{fill:hsl(var(--background));stroke:var(--cp-shift);stroke-width:1.6}
.cp-callout-t{font-size:14px;fill:hsl(var(--foreground));font-weight:600}
.cp-hit[data-lit] .cp-joint-mark{stroke:var(--cp-shift);stroke-width:2.4}
.cp-hit[data-lit] rect.cp-band-rect{stroke:var(--cp-shift);stroke-width:1.5}
@media (prefers-reduced-motion:reduce){.cp-base :is(path,rect,circle,ellipse,line,polygon,polyline){transition:none}}
`);

console.log('generated ChainPlateSvg.tsx and chain-plate.css');
