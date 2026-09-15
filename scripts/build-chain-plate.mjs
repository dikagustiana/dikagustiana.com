/**
 * Generates the industry chain plates for a wide screen.
 *
 *   node --experimental-strip-types scripts/build-chain-plate.mjs
 *   (npm run build:chain)
 *
 * Content comes from src/data/industryChain.ts — this script imports it, so
 * a label edited there is the label drawn here after one regenerate. This
 * script owns only WHERE things sit. It writes three files, all marked
 * generated:
 *
 *   src/components/industry-chain/ChainPlateSvg.tsx   two plates, as JSX:
 *       ChainPlateWide     the DETAIL: every function under its own box
 *       ChainPlateCompact  the OVERVIEW: the same records in five groups
 *   src/components/industry-chain/chain-plate.css     scoped, token-only CSS
 *   src/components/industry-chain/chainMarkOrder.ts   the reading order of
 *                          each shift's numbered marks, from where they land
 *
 * The narrow-screen layout is NOT generated: it is a React component
 * (ChainColumn.tsx) that reads the same data file, because on a phone the
 * layers become a list and the flows become toggles — HTML, not geometry.
 *
 * TWO LAYOUT FUNCTIONS, ONE SET OF RECORDS. V5 drew both levels from one
 * function with an `overview` flag, which kept the two plates from disagreeing
 * about what exists but left the overview with eight function columns and a
 * 1660-unit canvas — labels at ten pixels on a laptop. The overview now has
 * its own layout (`plateOverview`) built around five groups, and the detail
 * keeps its columns (`plateDetail`). What prevents drift is not one function
 * but one source and one emitter: both layouts read the same records, both
 * hand their geometry to the same `overlays()` for the shift outlines and the
 * numbered marks, both use the same `bands()` for the enabling layers, and
 * the unit tests check that the overview draws exactly the detail's elements
 * less the ones OVERVIEW_HIDES names, plus the group boxes.
 *
 * Geometry is computed rather than hand-placed because two hundred
 * coordinates do not stay on one grid by hand. Nothing here claims a shape:
 * every stage takes the same style, and no mark carries a magnitude.
 *
 * The joints are the protagonists. The boxes are drawn light, the flow is
 * the heaviest line on the plate, and every joint carries a chip at rest
 * whose word is the joint read at the chosen distance. The chips live in a
 * reading lane directly under the chain, one or two rows deep, each on a
 * short leader to its diamond. The enabling layers are bands directly under
 * that lane, ticked where each attaches; energy rises into every stage from
 * below; money and information are rails at the very bottom, because they
 * run the length of the chain and attach nowhere in particular.
 *
 * Interactive marks (the joint markers, the layer bands and their switches)
 * are emitted as React components — <JointHit>, <BandHit>, <LayerSwitch> —
 * with their geometry as props, so the label, the chip word and the aria text
 * come from the data file at run time and never go stale in this file. A
 * shift overlay is static geometry: outlines whose form is the status of the
 * element, one arrow where a cut moves, one where a price arrives, a callout,
 * and — where what moves an element is not the price the map can draw — the
 * mechanism named beside its outline, shown by CSS from the wrapper's
 * data-shift attribute. The numbered marks are <ShiftMark>s placed here so
 * that a mark never lands on a chip, a box or another mark.
 *
 * TARGET SIZES. Both plates now render at or above one CSS pixel per unit
 * from the 1280px breakpoint up: the overview because its canvas fits the
 * figure, the detail because the figure scrolls sideways under it rather than
 * shrinking it (chain-review.css). So a unit is a pixel, and the transparent
 * hit shapes are sized in pixels: 26 for a chip or a switch, a 13-unit radius
 * for a mark, which clears the 24px target everywhere the plates are drawn.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STAGES, NODES, RETAIL, RETAIL_GROUP, BANDS, BORDERS, JOINTS, RETURNS, BYPRODUCT, NON_PHYSICAL,
  FLOW_KIND_LABELS, CHAIN_COPY, SHIFTS, MECHANISMS, bandJoints,
  OVERVIEW_GROUPS, OVERVIEW_INTERNAL_JOINTS, drawnAtOverview,
} from '../src/data/industryChain.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'src', 'components', 'industry-chain');

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const S = byId(STAGES), N = byId(NODES), R = byId(RETURNS), G = OVERVIEW_GROUPS;
const label = (id) => (S[id] ?? N[id] ?? RETAIL.find((r) => r.id === id) ?? (id === RETAIL_GROUP.id ? RETAIL_GROUP : null))?.label ?? id;

/* Type sizes, mirrored in the generated CSS. Every box is sized FROM its
   text at these sizes, so a longer label in the data widens its box
   instead of overrunning it — and nothing here restates a label. */
const T_STAGE = 18, T_NODE = 15, T_SMALL = 14;
/** Hit shapes, in units that are pixels from the breakpoint up (see the header). */
const CHIP_H = 18, CHIP_HIT_H = 26, MARK_INK_R = 12, MARK_HIT_R = 13;
/** The band rows: the strip, the gap under it, and the switch at its left end. */
const BAND_H = 24, BAND_GAP = 10, BAND_DY = BAND_H + BAND_GAP;
const RAIL_DY = 18;

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
/** Rough text width in viewBox units, for "does this fit" decisions only. */
const est = (s, size, perEm = 0.55) => s.length * size * perEm;
const mid = (c) => Math.round((c[0] + c[1]) / 2);

/** Everything a numbered mark must not land on. Reset per plate. */
let obstacles = [];
const block = (x, y, w, h, tag = '') => obstacles.push([x, y, w, h, tag]);

/** The rectangle a chip occupies, for the collision list. */
const chipRect = (x, y, s, anchor = 'middle', size = 14, perEm = 0.56, h = 18) => {
  const w = est(s, size, perEm) + 12;
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return [x0, y - h + 4, w, h];
};

/** A label sitting on a line: an opaque chip under the text so the line breaks for it. */
const chip = (x, y, s, cls, anchor = 'middle', size = 14, perEm = 0.56, h = 18) => {
  const [x0, y0, w] = chipRect(x, y, s, anchor, size, perEm, h);
  block(x0, y0, w, h, s);
  return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2" className="cp-chip" />${T(x, y, s, cls, anchor)}`;
};

/** Transformation stage: one style for every stage. An origin gets a small bar, never a fill. */
const stage = (x, y, w, h, id, lines, { titleTop = false, size = T_STAGE } = {}) => {
  const L = [].concat(lines);
  const lh = size + 1;
  const y0 = titleTop ? y + size + 4 : y + h / 2 + size * 0.36 - ((L.length - 1) * lh) / 2;
  const origin = S[id]?.origin ? `<rect x="${x}" y="${y}" width="4" height="${h}" className="cp-origin" />` : '';
  return `<g className="cp-stage" data-id="${id}"${S[id]?.origin ? ' data-origin=""' : ''}>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" />${origin}
    ${L.map((t, i) => T(x + 12, y0 + i * lh, t, 'cp-stage-t')).join('')}</g>`;
};

/** Intermediary node: never filled, always dashed, always a pill. */
const node = (x, y, w, h, id, text = label(id), lines = [text], cls = 'cp-node') => {
  const lh = 16;
  const y0 = y + h / 2 + 5 - ((lines.length - 1) * lh) / 2;
  return `<g className="${cls}" data-id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(h / 2, 17)}" />
    ${lines.map((t, i) => T(x + 12, y0 + i * lh, t, 'cp-node-t')).join('')}</g>`;
};

/**
 * A group frame: one of the five major groups, at either level. Drawn under
 * the boxes, labelled above its top edge, and never a door — a group is a way
 * of drawing, not a margin to read. Its hover line is the group's own account
 * of what stays true while its members share the frame.
 */
const frame = (g, x, y, w, h) => {
  // Uppercase and tracked, about four fifths of an em per character; wrapped to the frame, stacked up from its top edge.
  const lines = wrap(g.label, Math.max(8, Math.floor((w - 4) / (T_SMALL * 0.8))));
  return `<g className="cp-group" data-id="${g.id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" />
    ${lines.map((t, i) => T(x + 2, y - 7 - (lines.length - 1 - i) * 16, t, 'cp-group-t')).join('')}</g>`;
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
      <marker id="cp-tip-energy${SUF}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 7 4 L 0 7 z" className="cp-mk-soft" /></marker>
    </defs>`;

const flow = (x1, y1, x2, y2, cls = 'cp-flow', marker = '') =>
  `<path className="${cls}" d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}"${marker ? ` markerEnd="${M(marker)}"` : ''} />`;

/* ═══ SHARED: the parts both layouts emit the same way ═══════════════════ */

/**
 * Energy is an input into every stage, not only a band: a short arrow rises
 * into the bottom edge of each drawn stage box, at an x the layout has chosen
 * clear of the flows, arcs and chips around that box. The band below is
 * ticked at the same x, so the eye joins the two. A full riser is not drawn
 * because the stages are stacked in pairs and a riser to the upper box would
 * have to cross the lower one.
 */
const STUB = 14;
function energyStubs(base, boxes, energyIn) {
  for (const [id, x] of Object.entries(energyIn)) {
    const [, y, , h] = boxes[id];
    const bottom = y + h;
    base.push(`<path className="cp-energy-in" data-for="${id}" d="M ${x} ${bottom + STUB} L ${x} ${bottom + 3}" markerEnd="${M('cp-tip-energy')}" />`);
  }
}

/**
 * The reading lane's name — the distance that is on — and the four rails of
 * money and information at the bottom, with their kind labels in the gutter.
 */
function laneNames(base, fanT, ROW_A) {
  base.push(
    `<g className="cp-lens-name cp-lens-name--economy" data-id="lane-economy">${T(fanT, ROW_A + 14, CHAIN_COPY.lensName.economy, 'cp-kind-t', 'end')}</g>`,
    `<g className="cp-lens-name cp-lens-name--finance" data-id="lane-finance">${T(fanT, ROW_A + 14, CHAIN_COPY.lensName.finance, 'cp-kind-t', 'end')}</g>`,
  );
}
function rails(base, fanT, RX0, RX1, RAIL0) {
  NON_PHYSICAL.forEach((f, i) => {
    const y = RAIL0 + i * RAIL_DY;
    const up = f.direction === 'upstream';
    const cls = f.kind === 'money' ? 'cp-money' : 'cp-info';
    const tip = f.kind === 'money' ? 'cp-tip-money' : 'cp-tip-info';
    base.push(`<g className="cp-nonphys" data-id="${f.id}">
      <path className="${cls}" d="${up ? `M ${RX1} ${y} L ${RX0 + 6} ${y}` : `M ${RX0} ${y} L ${RX1 - 6} ${y}`}" markerEnd="${M(tip)}" />
      ${up ? chip(RX1 + 1, y + 4, f.label, 'cp-rail-t', 'end') : chip(RX0 - 1, y + 4, f.label, 'cp-rail-t', 'start')}</g>`);
  });
  ['money', 'information'].forEach((k, i) => base.push(T(fanT, RAIL0 + i * 2 * RAIL_DY + 14, FLOW_KIND_LABELS[k], 'cp-kind-t', 'end')));
}

/**
 * Joint markers: one per drawn joint, always present, with its chip always
 * on. Row chips line up in the reading lane under the chain, on one of two
 * rows so neighbours never touch, and a chip may sit off its joint's x on an
 * elbowed leader where joints crowd one stretch. A side chip sits where a
 * leader down would have to cross a box.
 */
function joints(ctx) {
  const { jointGeom, drawnJoints, ROW_A, ROW_B } = ctx;
  const jointChipW = (text) => Math.round(text.length * 14 * 0.56 + 16);
  ctx.jointChipRect = {};
  drawnJoints.forEach((j) => {
    const [x, y, at, d] = jointGeom[j.id];
    // The fourth entry is an elbow for a row chip (dx along the lane) and a nudge for a side chip (dy down the flow).
    const chipX = at === 'left' ? x - 14 : at === 'right' ? x + 14 : x + d;
    const chipY = at === 'rowA' ? ROW_A : at === 'rowB' ? ROW_B : y - 9 + (at === 'left' || at === 'right' ? d : 0);
    const w = Math.max(jointChipW(j.read.economy.chip), jointChipW(j.read.finance.chip));
    const rx = at === 'left' ? chipX - w : at === 'right' ? chipX : chipX - w / 2;
    ctx.jointChipRect[j.id] = [rx, chipY, w, CHIP_H];
    // The chip's TARGET, not its ink: what a mark has to keep clear of is what the reader can press.
    block(rx - 4, chipY - (CHIP_HIT_H - CHIP_H) / 2, w + 8, CHIP_HIT_H, `chip ${j.id}`);
    // the ring a shift draws around the joint
    block(x - 17, y - 17, 34, 34, `ring ${j.id}`);
    ctx.jointHits.push(`<JointHit id="${j.id}" cx={${x}} cy={${y}} chipX={${chipX}} chipY={${chipY}} chipAt="${at}" />`);
  });
}

/**
 * Enabling layers: bands directly under the reading lane, each exactly over
 * its span, ticked where it attaches — at the drawn joints it rides on, under
 * the stages energy rises into, under the functions asset finance builds.
 * Interactive, so emitted as <BandHit>; label, note and fee glyph come from
 * the data at run time. Each band has a small switch at its left end.
 *
 * The energy band's top edge is the NETWORK: a filled point at its left end is
 * generation, an open point under each function is the connection, and the
 * words for both sit in the band's own note row. Where the plate cannot fit a
 * band's full label, the band shows its short form and keeps its full name
 * for the reader who asks.
 */
function bands(ctx) {
  const { colX, jointGeom, drawnJoints, energyIn, recipientX, BAND0 } = ctx;
  ctx.bandGeom = {};
  BANDS.forEach((b, i) => {
    const x0 = colX[b.span[0]][0], x1 = colX[b.span[1]][1];
    const y = BAND0 + i * BAND_DY;
    ctx.bandGeom[b.id] = [x0, y, x1 - x0, BAND_H];
    block(x0, y, x1 - x0, BAND_H, b.id);
    const width = x1 - x0;
    // Uppercase, tracked: about four fifths of an em per character.
    const shortLabel = 10 + est(b.label, T_SMALL, 0.8) + (b.margin ? 52 : 16) > width - 40;
    const shown = shortLabel ? b.short : b.label;
    const labelEnd = 10 + est(shown, T_SMALL, 0.8) + (b.margin ? 52 : 16);
    // The note row: the note itself, or for energy the words of its anatomy.
    // A note only fits where it clears the label and the fee glyph.
    const noteText = b.id === 'band-energy'
      ? `● ${CHAIN_COPY.energy.generation} — ${CHAIN_COPY.energy.network} — ○ ${CHAIN_COPY.energy.connection} · ${CHAIN_COPY.energy.selfSupply}`
      : b.note ?? '';
    const noteFits = noteText.trim() ? labelEnd + est(noteText, T_SMALL, 0.6) + 40 < width : false;
    const fundsText = b.financesLayers ? `· ${CHAIN_COPY.panel.financesLayersRun} ${b.financesLayers.map((id) => BANDS.find((x) => x.id === id).short).join(' · ')}` : '';
    const showFunds = noteFits && fundsText ? labelEnd + est(noteText, T_SMALL, 0.6) + est(fundsText, T_SMALL, 0.6) + 60 < width : false;
    const ticks =
      b.attaches === 'joints'
        ? bandJoints(b)
            .filter((jid) => drawnJoints.some((j) => j.id === jid))
            .map((jid) => jointGeom[jid][0])
        : b.attaches === 'stages'
          ? [...new Set(Object.values(energyIn))]
          : b.attaches === 'recipients'
            ? [...new Set(b.recipients.map(recipientX).filter((x) => x !== null))].sort((p, q) => p - q)
            : [];
    ctx.bandHits.push(
      `<BandHit id="${b.id}" x={${x0}} y={${y}} width={${width}} height={${BAND_H}} noteX={${noteFits ? Math.round(x0 + labelEnd) : 'null'}} shortLabel={${shortLabel}} showFunds={${showFunds}} ticks={[${ticks.join(', ')}]} />`,
    );
    ctx.layerSwitches.push(`<LayerSwitch id="${b.id}" x={${x0 - 27}} y={${y + (BAND_H - 12) / 2}} />`);
  });
  return BAND0 + BANDS.length * BAND_DY;
}

/* ── Shift overlays and numbered marks — ONE emitter for both levels ───────
   Static geometry per shift: an outline on every target whose FORM is the
   target's status (heavy for stuck, plain for moving, dashed for unpriced),
   one arrow where a cut moves, one where a price arrives, a callout, and the
   mechanism named where it is not the price the map draws — shown by CSS from
   data-shift. Nothing here redraws the chain; the base stays where it is and
   recedes.

   The numbered marks are the index onto a shift's targets. A mark is drawn
   beside the thing it belongs to: each kind of target has a list of candidate
   places, in order of preference, and the first that lands on nothing — no
   box, no chip, no band, no arrow, no earlier mark — is taken.

   The ORDER is computed from where the marks land on the DETAIL plate — left
   to right, then top to bottom, layers last because they are the bottom row —
   and the overview takes that order as given, so a number means one thing at
   both levels. The runtime numbers targets by their position in this list. ── */
function overlays(ctx, orderFrom = null) {
  const { jointGeom, bandGeom, borderGeom, returnPath, returnChip, returnLabel, boxes, jointChipRect, AX, ROW_B } = ctx;
  const shiftLayers = [], marks = [];
  const statusOf = (s, id) => s.targets.find((t) => t.id === id)?.condition?.status ?? 'moving';
  const isNodeBox = (id) => N[id] || id === RETAIL_GROUP.id || (G[id] && G[id].collapsed);
  const lit = (id, status) => {
    const cls = (kind) => `${kind} cp-lit--${status}`;
    if (jointGeom[id]) {
      const [x, y] = jointGeom[id];
      return `<circle className="${cls('cp-lit-ring')}" cx="${x}" cy="${y}" r="17" />`;
    }
    if (bandGeom[id]) {
      const [x, y, w, h] = bandGeom[id];
      return `<rect className="${cls('cp-lit-rect')}" x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="3" />`;
    }
    if (borderGeom[id]) {
      const [x, [y0, y1]] = borderGeom[id];
      return `<path className="${cls('cp-lit-line')}" d="M ${x} ${y0} L ${x} ${y1}" />`;
    }
    if (returnPath[id]) {
      // The lit path is drawn over the base, so the return's own label is painted back on top of it.
      return `<path className="${cls('cp-lit-path')}" d="${returnPath[id]}" markerEnd="${M('cp-tip-shift')}" />${returnChip[id] ?? ''}`;
    }
    if (boxes[id]) {
      const [x, y, w, h] = boxes[id];
      return `<rect className="${cls('cp-lit-rect')}" x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" rx="${isNodeBox(id) ? 12 : 4}" />`;
    }
    throw new Error(`shift target ${id} has no geometry on this plate`);
  };
  /**
   * What is actually doing the work, named on the overlay where it is not
   * the price the map draws: a chip on the outline's top-right corner, so
   * a contract or a capacity problem is not read as a repricing.
   */
  const mechanism = (t) => {
    const m = t.condition.mechanism;
    if (!m || m === 'price') return '';
    const text = MECHANISMS[m].label;
    let x, y;
    // A band names its own mechanism at run time (BandHit), inside its strip:
    // the band is drawn in the interactive layer above this overlay, so a
    // static chip inside it would be painted over by the band's own fill.
    if (bandGeom[t.id]) return '';
    if (boxes[t.id]) {
      const [bx, by, bw] = boxes[t.id];
      x = bx + bw + 4; y = by - 6;
    } else if (jointGeom[t.id]) {
      const [jx, jy] = jointGeom[t.id];
      x = jx + 24; y = jy - 20;
    } else return '';
    return `<g className="cp-callout cp-callout--mechanism" data-id="mechanism-${t.id}" data-mechanism="${m}">${chip(x, y, text, 'cp-callout-t', 'end', 14, 0.62, 18)}</g>`;
  };
  const xOf = (id) => (jointGeom[id]?.[0] ?? borderGeom[id]?.[0] ?? (boxes[id] ? boxes[id][0] + boxes[id][2] / 2 : null));
  const move = (m) => {
    if (m.kind === 'price') {
      // A price arrives at a joint that had none: a short arrow into the
      // ring from the right, in the gap between the two boxes the joint
      // sits between. The words are the callout's; the arrow is the glyph.
      const [x, y] = jointGeom[m.at];
      block(x + 22, y + 2, 44, 12, m.id);
      const d = `M ${x + 62} ${y + 8} L ${x + 22} ${y + 8}`;
      return `<g className="cp-move cp-move--price" data-id="${m.id}"><path className="cp-move-hit" d="${d}" /><path className="cp-move-path" d="${d}" markerEnd="${M('cp-tip-shift')}" /></g>`;
    }
    const x0 = xOf(m.from), x1 = xOf(m.to);
    if (x0 === null || x1 === null) throw new Error(`move ${m.id} has an end with no x`);
    // Above the chain, clear of the processing box, then down onto the joint.
    const y = ctx.moveY, land = jointGeom[m.to] ? jointGeom[m.to][1] - 22 : AX - 22;
    block(Math.min(x0, x1), y - 3, Math.abs(x1 - x0), 6, m.id);
    block(x1 - 3, y, 6, land - y, `${m.id} landing`);
    block(x0, y - 22, est(m.label, T_SMALL, 0.6), 16, `${m.id} label`);
    const d = `M ${x0} ${y} L ${x1} ${y} L ${x1} ${land}`;
    return `<g className="cp-move cp-move--cut" data-id="${m.id}"><path className="cp-move-hit" d="${d}" />
      <path className="cp-move-path" d="${d}" markerEnd="${M('cp-tip-shift')}" />
      ${T(x0, y - 8, m.label, 'cp-move-t')}</g>`;
  };
  const callout = (c) => {
    if (borderGeom[c.at]) {
      // Beside the border's own chip, on its row: the risers above leave no clear line there.
      const [x, [y0]] = borderGeom[c.at];
      return `<g className="cp-callout" data-id="${c.id}">${chip(x + 44, y0 - 1, c.label, 'cp-callout-t', 'start', 14, 0.6, 20)}</g>`;
    }
    const at = xOf(c.at);
    if (at === null) throw new Error(`callout ${c.id} has no x`);
    // Under the chain, on the lower row of the reading lane — and inside the plate, whatever the chip's width.
    const half = (est(c.label, T_SMALL, 0.66) + 12) / 2;
    const x = Math.max(half + 8, Math.min(at, ctx.W - 8 - half));
    return `<g className="cp-callout" data-id="${c.id}">${chip(x, ROW_B + 14, c.label, 'cp-callout-t', 'middle', 14, 0.6, 20)}</g>`;
  };
  SHIFTS.forEach((s) => {
    const targets = s.targets.filter((t) => t.condition);
    shiftLayers.push(`<g className="cp-shift cp-shift--${s.id}" data-id="${s.id}">
      ${targets.map((t) => `<g className="cp-lit" data-for="${t.id}" data-status="${statusOf(s, t.id)}">${lit(t.id, statusOf(s, t.id))}</g>`).join('\n      ')}
      ${s.moves.map(move).join('\n      ')}
      ${s.callouts.map(callout).join('\n      ')}
      ${targets.map(mechanism).filter(Boolean).join('\n      ')}
    </g>`);
  });

  const hits = (cx, cy, own) =>
    obstacles.some(([x, y, w, h, tag]) => !own.includes(tag) && cx + MARK_INK_R > x && cx - MARK_INK_R < x + w && cy + MARK_INK_R > y && cy - MARK_INK_R < y + h);
  const markCandidates = (id) => {
    if (jointGeom[id]) {
      const [x, y, at] = jointGeom[id];
      const [cx0, cy0, cw, ch] = jointChipRect[id];
      const own = [`ring ${id}`, `chip ${id}`];
      // Beside the chip where the chip sits beside the joint; otherwise around
      // the diamond, and failing that at either end of the chip in the lane.
      const side = at === 'left' ? [[cx0 - 13, y]] : at === 'right' ? [[cx0 + cw + 13, y]] : [];
      // Where a side chip's far end is taken, the side opposite the chip, level with the diamond.
      const across = at === 'left' ? [[x + 27, y]] : at === 'right' ? [[x - 27, y]] : [];
      const lane = side.length ? [] : [[cx0 - 13, cy0 + ch / 2], [cx0 + cw + 13, cy0 + ch / 2]];
      return { own, at: [...side, [x - 14, y - 14], [x + 14, y - 14], [x - 14, y + 14], [x + 14, y + 14], ...across, ...lane] };
    }
    if (bandGeom[id]) {
      const [x, y, , h] = bandGeom[id];
      return { own: [id], at: [[x - 45, y + h / 2]] };
    }
    if (borderGeom[id]) {
      const [x, [y0]] = borderGeom[id];
      // On the line under its chip; failing that, above the chip, then beside the line.
      return { own: [BORDERS.find((b) => b.id === id).label, id], at: [[x, y0 + 18], [x, y0 + 44], [x, y0 - 28], [x + 16, y0 + 18]] };
    }
    if (returnLabel[id]) {
      const [x, y, w, h] = returnLabel[id];
      return { own: [R[id].label, id], at: [[x - 13, y + h / 2], [x + w + 13, y + h / 2]] };
    }
    if (boxes[id]) {
      const [x, y, w, h] = boxes[id];
      return {
        own: [id],
        at: [[x - 11, y - 11], [x + w + 11, y - 11], [x - 11, y + h + 11], [x + w + 11, y + h + 11], [x + w / 2, y - 11], [x + w / 2, y + h + 11], [x - 11, y + h / 2]],
      };
    }
    throw new Error(`shift target ${id} has no place for a mark on this plate`);
  };
  const markOrder = {};
  SHIFTS.forEach((s) => {
    const placedMarks = [];
    const given = orderFrom?.[s.id];
    const ordered = s.targets
      .filter((t) => t.condition)
      .map((t) => {
        const { own, at } = markCandidates(t.id);
        // Reading order is decided by the FIRST candidate — where the mark
        // belongs — even if it has to step aside; so the numbers still run
        // left to right along the chain.
        return { id: t.id, own, at, ox: at[0][0], oy: at[0][1], row: bandGeom[t.id] ? 1 : 0 };
      })
      .sort((a, b) => (given ? given.indexOf(a.id) - given.indexOf(b.id) : a.row - b.row || a.ox - b.ox || a.oy - b.oy));
    ordered.forEach((m) => {
      const free = m.at.find(([cx, cy]) => !hits(cx, cy, m.own) && !placedMarks.some((o) => Math.hypot(o.x - cx, o.y - cy) < MARK_HIT_R * 2));
      const [x, y] = free ?? m.at[0];
      if (!free) console.warn(`mark for ${m.id} under ${s.id} found no clear place on the ${ctx.level}; using its first candidate`);
      if (!free && process.env.CHAIN_DEBUG) {
        for (const [cx, cy] of m.at) {
          const blockers = obstacles.filter(([ox, oy, ow, oh, tag]) => !m.own.includes(tag) && cx + MARK_INK_R > ox && cx - MARK_INK_R < ox + ow && cy + MARK_INK_R > oy && cy - MARK_INK_R < oy + oh).map((o) => o[4]);
          const near = placedMarks.filter((o) => Math.hypot(o.x - cx, o.y - cy) < MARK_HIT_R * 2).map((o) => o.id);
          console.warn(`   candidate (${cx}, ${cy}): ${[...blockers, ...near].join(', ') || 'free?'}`);
        }
      }
      placedMarks.push({ id: m.id, x, y });
    });
    markOrder[s.id] = placedMarks.map((m) => m.id);
    marks.push(`<g className="cp-marks cp-marks--${s.id}">
      ${placedMarks.map((m) => `<ShiftMark shift="${s.id}" id="${m.id}" cx={${Math.round(m.x)}} cy={${Math.round(m.y)}} />`).join('\n      ')}
    </g>`);
  });
  return { shiftLayers, marks, markOrder };
}

/* ═══ THE DETAIL — every function under its own box ═══════════════════════ */

function plateDetail() {
  obstacles = [];
  const AX = 275;
  const base = [], jointHits = [], bandHits = [], layerSwitches = [];

  // Characters per line, per column, tuned so a label wraps where it reads
  // rather than where the box happens to end. The words themselves always
  // come from the data file.
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
    // The retail node holds its formats as rows, so it is as wide as the widest row plus its padding.
    ret: Math.max(...L.ret.map((ls) => boxW(ls, T_SMALL, 36)), boxW([RETAIL_GROUP.label], T_NODE)),
    cons: Math.max(boxW(L.cons, T_STAGE), boxW(L.rec, T_STAGE), ...L.demand.map((ls) => boxW(ls, T_SMALL) + 21)),
  };

  /* The left margin is set by the fan of example lanes, end-anchored in it. */
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

  /* Rows. The chain runs on AX; everything else hangs off it. */
  const LANE_DY = 34;
  const bioB = [138, 20 + L.bio.length * (T_STAGE + 1)], bioY = bioB[0] + Math.round(bioB[1] / 2);
  const geoB = [352, 20 + L.geo.length * (T_STAGE + 1)], geoY = geoB[0] + Math.round(geoB[1] / 2);
  const procH = 20 + L.proc.length * (T_STAGE + 1), procB = [AX - Math.round(procH / 2), procH];
  const mfgH = 20 + L.mfg.length * (T_STAGE + 1), mfgB = [AX - Math.round(mfgH / 2), mfgH];
  const packB = [96, 20 + L.pack.length * (T_STAGE + 1)];
  const tradH = 16 + L.trad.length * 16, tradB = [AX - Math.round(tradH / 2), tradH];
  const princB = [398, 16 + L.princ.length * 16];
  const distH = 34 + (L.dist.length - 1) * 16;
  const distY = 240, wholY = 372;
  const RET_ROW_GAP = 9, RET_PAD = 12;
  const retRowH = L.ret.map((ls) => ls.length * 15 + 6);
  const retInner = retRowH.reduce((a, b) => a + b, 0) + Math.max(0, retRowH.length - 1) * RET_ROW_GAP;
  const RET_HEAD = 33; // the kicker and, under it, the note
  const retH = RET_PAD + RET_HEAD + retInner + RET_PAD;
  const retB = [AX - Math.round(retH / 2), retH];
  // Consumption is as tall as the retail node, because the two read as a pair.
  const consH = retH + 12;
  const consB = [retB[0] - 6, consH];
  const recB = [consB[0] + consB[1] + 34, 44];
  const CHAIN_BOTTOM = Math.max(recB[0] + recB[1], geoB[0] + geoB[1], princB[0] + princB[1], wholY + distH / 2);
  /* Under the chain, in this order: the reading lane (two rows of chips), the
     enabling layers as bands directly beneath it, and the four rails of money
     and information at the very bottom. */
  const ROW_A = CHAIN_BOTTOM + 30, ROW_B = ROW_A + 30;
  const BAND0 = ROW_B + CHIP_H + 26;
  const RAIL0 = BAND0 + BANDS.length * BAND_DY + 14;
  const H = RAIL0 + NON_PHYSICAL.length * RAIL_DY + 16;
  const W = C.cons[1] + 130;

  /* The five groups, as frames under the columns they span. The same five the
     overview is built from, so a reader moving between the levels finds the
     same structure with its members un-grouped. */
  const FT = 74;
  const frames = {
    'group-origins': [C.org[0] - 8, C.org[1] + 8],
    'group-processing': [C.agg[0] - 8, C.trad[1] + 8],
    'group-manufacturing': [C.mfg[0] - 8, C.mfg[1] + 8],
    'group-distribution-retail': [C.dist[0] - 8, C.ret[1] + 8],
    'group-use-recovery': [C.cons[0] - 8, C.cons[1] + 8],
  };
  for (const [gid, [x0, x1]] of Object.entries(frames)) base.push(frame(G[gid], x0, FT, x1 - x0, CHAIN_BOTTOM + 8 - FT));

  /* Fan lanes into the two origins: examples of a function, not a shape. */
  const fan = (ls, i, y0, portY) => {
    const y = y0 + i * LANE_DY;
    ls.forEach((t, k) => block(C.fanT - est(t, T_SMALL, 0.6), y - 8 + (k - (ls.length - 1) / 2) * 15, est(t, T_SMALL, 0.6), 15, t));
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
    flow(C.mfg[1], AX, C.dist[0], distY),
    flow(C.mfg[1], AX, C.dist[0], wholY),
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
  const place = (id, x, y, w, h) => { boxes[id] = [x, y, w, h]; block(x, y, w, h, id); };
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
  // the distributor's recursion note hangs under its pill
  block(C.dist[0] + 14, distY + distH / 2 + 4, est(L.recur[0], T_SMALL, 0.6), L.recur.length * 15, 'recursion');

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
    stage(C.org[0], bioB[0], widths.org, bioB[1], 'stage-biological', L.bio),
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

  const energyIn = {
    'stage-biological': mid(C.org),
    'stage-extraction': mid(C.org),
    'stage-processing': C.proc[0] + 20,
    'stage-packaging': C.mfg[0] + 20,
    'stage-manufacturing': mid(C.mfg),
    'stage-consumption': C.cons[1] - 20,
    'stage-recovery': mid(C.cons) - 30,
  };
  energyStubs(base, boxes, energyIn);
  /* Where asset finance lands: under the centre of each recipient's own box. */
  const recipientX = (id) => (boxes[id] ? mid([boxes[id][0], boxes[id][0] + boxes[id][2]]) : null);

  /* Borders: the external sector as two dashed cuts through the chain, at
     the two joints where goods actually leave and enter. Drawn before the
     returns so a return's chip paints over the dash, never under it. */
  const borderGeom = {
    'border-export': [Math.round((C.org[1] + C.proc[0]) / 2) - 30, [300, CHAIN_BOTTOM]],
    'border-import': [Math.round((C.trad[1] + C.mfg[0]) / 2), [44, CHAIN_BOTTOM]],
  };
  BORDERS.forEach((b) => {
    const [x, [y0, y1]] = borderGeom[b.id];
    block(x - 2, y0, 4, y1 - y0, b.id);
    base.push(`<g className="cp-border" data-id="${b.id}"><path d="M ${x} ${y0} L ${x} ${y1}" />
      ${chip(x, y0 - 2, b.label, 'cp-border-t')}</g>`);
  });

  /* Physical returns: dashed, above the chain, each spanning exactly its
     joints, and never crossing a node it does not connect. */
  const returnPath = {}, returnChip = {}, returnLabel = {};
  const retChip = (id, x, y, anchor = 'middle') => {
    returnLabel[id] = chipRect(x, y, R[id].label, anchor);
    returnChip[id] = chip(x, y, R[id].label, 'cp-ret-t', anchor);
    return returnChip[id];
  };
  const arc = (r, x1, y1, x2, y2, peak, lx, ly, anchor = 'middle') => {
    returnPath[r.id] = `M ${x1} ${y1} C ${x1} ${peak}, ${x2} ${peak}, ${x2} ${y2}`;
    return `<g className="cp-ret" data-id="${r.id}">
      <path d="${returnPath[r.id]}" markerEnd="${M('cp-tip-soft')}" />
      ${retChip(r.id, lx, ly, anchor)}</g>`;
  };
  const RISER_A = W - 40, RISER_B = W - 58;
  // The two post-consumer corridors run along the top, above the frames' kickers.
  returnPath['return-postconsumer-organic'] = `M ${C.rec[1]} ${recB[0] + 8} L ${RISER_A} ${recB[0] + 8} L ${RISER_A} 22 L ${mid(C.org)} 22 L ${mid(C.org)} ${bioB[0] - 4}`;
  returnPath['return-postconsumer-material'] = `M ${C.rec[1]} ${recB[0] + 22} L ${RISER_B} ${recB[0] + 22} L ${RISER_B} 42 L ${mid(C.proc)} 42 L ${mid(C.proc)} ${procB[0] - 4}`;
  returnPath['return-secondary'] = `M ${C.cons[1] - 60} ${consB[0]} C ${C.cons[1] - 60} ${consB[0] - 42}, ${C.cons[1] - 10} ${consB[0] - 42}, ${C.cons[1] - 10} ${consB[0]}`;
  const secondaryLines = wrap(R['return-secondary'].label, 18);
  returnLabel['return-secondary'] = [C.cons[1] - 6 - est(secondaryLines[0], T_SMALL, 0.56), consB[0] - 72, est(secondaryLines[0], T_SMALL, 0.56), 30];
  block(...returnLabel['return-secondary'], 'return-secondary');
  base.push(
    arc(R['return-scrap'], C.mfg[0] + 20, mfgB[0] - 4, C.proc[1] - 20, procB[0] - 4, 150, C.proc[0] + 20, 156),
    arc(R['return-commercial'], C.ret[0] + 24, retB[0] - 2, mid(C.dist), distY - distH / 2 - 3, retB[0] - 44, C.ret[0] + 6, retB[0] - 40, 'start'),
    arc(R['return-packaging'], C.ret[0] + 60, retB[0] - 2, C.mfg[0] + 20, mfgB[0] - 4, 138, Math.round((C.mfg[1] + C.ret[0]) / 2), 144),
    `<g className="cp-ret" data-id="return-postconsumer-organic">
      <path d="${returnPath['return-postconsumer-organic']}" markerEnd="${M('cp-tip-soft')}" />
      ${retChip('return-postconsumer-organic', C.dist[0], 26)}</g>`,
    `<g className="cp-ret" data-id="return-postconsumer-material">
      <path d="${returnPath['return-postconsumer-material']}" markerEnd="${M('cp-tip-soft')}" />
      ${retChip('return-postconsumer-material', C.trad[0], 46)}</g>`,
    `<g className="cp-ret" data-id="return-secondary">
      <path d="${returnPath['return-secondary']}" markerEnd="${M('cp-tip-soft')}" />
      ${secondaryLines.map((t, i) => T(C.cons[1] - 6, consB[0] - 58 + i * 15, t, 'cp-ret-t', 'end')).join('')}</g>`,
    // The by-product leaves processing FORWARD, into another chain — down and
    // to the right, so it can never be read as a flow back up the chain.
    `<g className="cp-byp" data-id="${BYPRODUCT.id}"><path d="M ${mid(C.proc) - 10} ${procB[0] + procB[1]} L ${C.proc[1] - 34} ${procB[0] + procB[1] + 52}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(C.proc[1] - 44, procB[0] + procB[1] + 74, BYPRODUCT.label, 'cp-ret-t', 'end')}</g>`,
  );

  laneNames(base, C.fanT, ROW_A);

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
    'j-consumption-recovery': [mid(C.cons) + 30, Math.round((consB[0] + consB[1] + recB[0]) / 2), 'left', 0],
  };
  const colX = {
    'stage-biological': C.org, 'stage-extraction': C.org, 'node-aggregation': C.agg, 'stage-processing': C.proc,
    'node-trader': C.trad, 'stage-packaging': C.mfg, 'stage-manufacturing': C.mfg, 'node-distributor': C.dist,
    'node-wholesaler': C.dist, 'node-retail': C.ret, 'stage-consumption': C.cons, 'stage-recovery': C.cons,
  };

  const ctx = {
    level: 'detail', W, AX, ROW_A, ROW_B, BAND0, moveY: 222,
    base, jointHits, bandHits, layerSwitches, boxes, jointGeom, drawnJoints: JOINTS, colX, energyIn, recipientX,
    borderGeom, returnPath, returnChip, returnLabel,
  };
  joints(ctx);
  bands(ctx);
  rails(base, C.fanT, C.org[0], C.cons[1], RAIL0);
  const { shiftLayers, marks, markOrder } = overlays(ctx);
  return { W, H, base, shiftLayers, marks, markOrder, hits: [...jointHits, ...bandHits, ...layerSwitches], aria: CHAIN_COPY.aria.wide };
}

/* ═══ THE OVERVIEW — the same records in five groups ══════════════════════ */

/**
 * FIVE GROUPS, ONE CHAIN. Origins; processing with the aggregator before it
 * and the trader after it; manufacturing with packaging above and the
 * principal alongside; distribution, wholesale and retail as one box; use and
 * recovery. Every group but the fourth is a frame with its members drawn
 * inside it under their own ids, so their joints stay doors and their marks
 * stay where they are; the fourth is collapsed, and the two joints inside it
 * come back with the detail. Nine of the eleven joints are drawn — every
 * joint that crosses a group's edge, and every joint whose two ends are drawn.
 *
 * The point of the grouping is ROOM: five columns instead of eight, so the
 * canvas fits a laptop and a fourteen-unit label is a fourteen-pixel one.
 */
function plateOverview(orderFrom) {
  obstacles = [];
  const AX = 300;
  const base = [], jointHits = [], bandHits = [], layerSwitches = [];
  const lines = (id, max) => wrap(label(id), max);
  const boxW = (ls, size, pad = 24) => Math.ceil(Math.max(...ls.map((l) => est(l, size, 0.6))) + pad);
  const PAD = 8, GAP = 20;

  const L = {
    bio: lines('stage-biological', 11), geo: lines('stage-extraction', 11),
    agg: lines('node-aggregation', 12), proc: lines('stage-processing', 10), trad: lines('node-trader', 9),
    pack: lines('stage-packaging', 14), mfg: lines('stage-manufacturing', 14), princ: lines('node-principal', 13),
    dist: ['node-distributor', 'node-wholesaler', RETAIL_GROUP.id].map((id) => label(id)),
    distNote: wrap(`↳ ${CHAIN_COPY.controls.transfersInside(OVERVIEW_INTERNAL_JOINTS.length)}`, 17),
    cons: lines('stage-consumption', 12), rec: lines('stage-recovery', 12),
  };
  const w = {
    org: Math.max(boxW(L.bio, T_STAGE), boxW(L.geo, T_STAGE)),
    agg: boxW(L.agg, T_NODE), proc: boxW(L.proc, T_STAGE), trad: boxW(L.trad, T_NODE),
    mfg: Math.max(boxW(L.pack, T_STAGE), boxW(L.mfg, T_STAGE), boxW(L.princ, T_NODE)),
    dist: Math.max(boxW(L.dist, T_NODE), boxW(L.distNote, T_SMALL, 12)),
    cons: Math.max(boxW(L.cons, T_STAGE), boxW(L.rec, T_STAGE)),
  };
  const groupW = {
    'group-origins': w.org + 2 * PAD,
    'group-processing': Math.max(w.proc + 16 + w.trad, w.agg) + 2 * PAD,
    'group-manufacturing': w.mfg + 2 * PAD,
    'group-distribution-retail': w.dist + 2 * PAD,
    'group-use-recovery': w.cons + 2 * PAD,
  };

  /* The left margin holds the reading-lane name and the two flow-kind names, end-anchored. */
  const gutter = [CHAIN_COPY.lensName.economy, CHAIN_COPY.lensName.finance, ...Object.values(FLOW_KIND_LABELS)];
  const laneW = Math.ceil(Math.max(...gutter.map((l) => est(l, T_SMALL, 0.84))));
  const LEFT = laneW + 24, fanT = LEFT - 12;
  const F = {};
  let x = LEFT;
  for (const gid of Object.keys(G)) {
    F[gid] = [x, x + groupW[gid]];
    x += groupW[gid] + GAP;
  }
  const W = x - GAP + 48;
  const gapMid = (a, b) => Math.round((F[a][1] + F[b][0]) / 2);

  /* Rows. */
  const FT = 150;
  const bioB = [177, 20 + L.bio.length * (T_STAGE + 1)], bioY = bioB[0] + Math.round(bioB[1] / 2);
  const geoB = [336, 20 + L.geo.length * (T_STAGE + 1)], geoY = geoB[0] + Math.round(geoB[1] / 2);
  const procH = 20 + L.proc.length * (T_STAGE + 1), procB = [AX - Math.round(procH / 2), procH];
  const tradH = 16 + L.trad.length * 16, tradB = [AX - Math.round(tradH / 2), tradH];
  const aggB = [bioY - 17, 34];
  const mfgH = 20 + L.mfg.length * (T_STAGE + 1), mfgB = [AX - Math.round(mfgH / 2), mfgH];
  const packH = 20 + L.pack.length * (T_STAGE + 1), packB = [mfgB[0] - 42 - packH, packH];
  const princB = [mfgB[0] + mfgB[1] + 26, 16 + L.princ.length * 16];
  const distH = 34 + (L.dist.length - 1) * 16, distB = [AX - Math.round(distH / 2), distH];
  const consH = 20 + L.cons.length * (T_STAGE + 1), consB = [AX - Math.round(consH / 2), consH];
  // Room under consumption for the joint into recovery, its mark and the green overlay's price arrow beside it.
  const recH = 20 + L.rec.length * (T_STAGE + 1), recB = [consB[0] + consB[1] + 52, recH];
  const distNoteBottom = distB[0] + distB[1] + 16 + L.distNote.length * 15;
  const CHAIN_BOTTOM = Math.max(geoB[0] + geoB[1], princB[0] + princB[1], recB[0] + recB[1], distNoteBottom);
  const FB = CHAIN_BOTTOM + 8;
  const ROW_A = FB + 22, ROW_B = ROW_A + 30;
  const BAND0 = ROW_B + CHIP_H + 24;
  const RAIL0 = BAND0 + BANDS.length * BAND_DY + 14;
  const H = RAIL0 + NON_PHYSICAL.length * RAIL_DY + 16;

  /* Box positions inside their frames. */
  const boxes = {};
  const place = (id, bx, by, bw, bh) => { boxes[id] = [bx, by, bw, bh]; block(bx, by, bw, bh, id); };
  const g1 = F['group-origins'], g2 = F['group-processing'], g3 = F['group-manufacturing'], g4 = F['group-distribution-retail'], g5 = F['group-use-recovery'];
  place('stage-biological', g1[0] + PAD, bioB[0], w.org, bioB[1]);
  place('stage-extraction', g1[0] + PAD, geoB[0], w.org, geoB[1]);
  place('node-aggregation', g2[0] + PAD, aggB[0], w.agg, aggB[1]);
  place('stage-processing', g2[0] + PAD, procB[0], w.proc, procB[1]);
  place('node-trader', g2[0] + PAD + w.proc + 16, tradB[0], w.trad, tradB[1]);
  place('stage-packaging', g3[0] + PAD, packB[0], w.mfg, packB[1]);
  place('stage-manufacturing', g3[0] + PAD, mfgB[0], w.mfg, mfgB[1]);
  place('node-principal', g3[0] + PAD, princB[0], w.mfg, princB[1]);
  place('group-distribution-retail', g4[0] + PAD, distB[0], w.dist, distB[1]);
  place('stage-consumption', g5[0] + PAD, consB[0], w.cons, consB[1]);
  place('stage-recovery', g5[0] + PAD, recB[0], w.cons, recB[1]);
  block(g4[0] + PAD + 14, distB[0] + distB[1] + 4, est(L.distNote[0], T_SMALL, 0.6), L.distNote.length * 15, 'transfers inside');
  const bx = (id) => boxes[id];
  const right = (id) => bx(id)[0] + bx(id)[2];
  const bottom = (id) => bx(id)[1] + bx(id)[3];
  const midX = (id) => mid([bx(id)[0], right(id)]);

  /* The frames first, so everything paints over them. */
  for (const gid of Object.keys(G)) base.push(frame(G[gid], F[gid][0], FT, F[gid][1] - F[gid][0], FB - FT));

  /* Forward flows. */
  const procX0 = bx('stage-processing')[0];
  base.push(
    flow(right('stage-biological'), bioY, bx('node-aggregation')[0], bioY),
    // the aggregator sells down into processing
    `<path className="cp-flow" d="M ${midX('node-aggregation')} ${bottom('node-aggregation')} L ${midX('node-aggregation')} ${procB[0] - 3}" markerEnd="${M('cp-tip')}" />`,
    flow(right('stage-extraction'), geoY, procX0, AX),
    `<path className="cp-flow" d="M ${right('stage-processing')} ${AX} L ${bx('node-trader')[0]} ${AX}" />`,
    flow(right('node-trader'), AX, bx('stage-manufacturing')[0], AX),
    flow(right('stage-manufacturing'), AX, bx('group-distribution-retail')[0], AX),
    flow(right('group-distribution-retail'), AX, bx('stage-consumption')[0], AX),
    // packaging joins manufacturing from above
    `<path className="cp-flow" d="M ${midX('stage-manufacturing') - 40} ${bottom('stage-packaging')} L ${midX('stage-manufacturing') - 40} ${mfgB[0] - 3}" markerEnd="${M('cp-tip')}" />`,
    // the principal takes title alongside manufacturing
    `<path className="cp-flow-thin" d="M ${bx('stage-manufacturing')[0] + 20} ${bottom('stage-manufacturing')} L ${bx('stage-manufacturing')[0] + 20} ${princB[0]}" />`,
    // consumption → recovery
    `<path className="cp-flow" d="M ${midX('stage-consumption') + 30} ${bottom('stage-consumption')} L ${midX('stage-consumption') + 30} ${recB[0] - 3}" markerEnd="${M('cp-tip')}" />`,
  );

  /* The forms. */
  base.push(
    stage(...bx('stage-biological'), 'stage-biological', L.bio),
    stage(...bx('stage-extraction'), 'stage-extraction', L.geo),
    node(...bx('node-aggregation'), 'node-aggregation', undefined, L.agg),
    stage(...bx('stage-processing'), 'stage-processing', L.proc),
    node(...bx('node-trader'), 'node-trader', undefined, L.trad),
    stage(...bx('stage-packaging'), 'stage-packaging', L.pack),
    stage(...bx('stage-manufacturing'), 'stage-manufacturing', L.mfg),
    node(...bx('node-principal'), 'node-principal', undefined, L.princ),
    // The collapsed group: one dashed box naming its three functions in the
    // order goods pass through them, and a note that the transfers between
    // them are inside it. Not a door: the margins inside are read on detail.
    node(...bx('group-distribution-retail'), 'group-distribution-retail', undefined, L.dist, 'cp-node cp-group-box'),
    ...L.distNote.map((t, i) => T(g4[0] + PAD + 14, distB[0] + distB[1] + 16 + i * 15, t, 'cp-recur')),
    stage(...bx('stage-consumption'), 'stage-consumption', L.cons),
    stage(...bx('stage-recovery'), 'stage-recovery', L.rec),
  );

  const energyIn = {
    'stage-biological': midX('stage-biological'),
    'stage-extraction': midX('stage-biological'),
    'stage-processing': procX0 + 20,
    'stage-packaging': bx('stage-packaging')[0] + 20,
    'stage-manufacturing': midX('stage-manufacturing'),
    'stage-consumption': right('stage-consumption') - 20,
    'stage-recovery': midX('stage-consumption') - 30,
  };
  energyStubs(base, boxes, energyIn);
  /* Asset finance lands under a recipient's own box, or under the box that stands for it. */
  const standsFor = (id) => (boxes[id] ? id : Object.values(G).find((gr) => gr.collapsed && gr.members.includes(id))?.id);
  const recipientX = (id) => { const b = standsFor(id); return b ? midX(b) : null; };

  /* Borders. Export cuts the extraction → processing route below the biological one; import cuts trader → manufacturing. */
  const exportX = gapMid('group-origins', 'group-processing') - 12;
  const borderGeom = {
    'border-export': [exportX, [316, CHAIN_BOTTOM]],
    'border-import': [gapMid('group-processing', 'group-manufacturing'), [108, CHAIN_BOTTOM]],
  };
  BORDERS.forEach((b) => {
    const [bxx, [y0, y1]] = borderGeom[b.id];
    block(bxx - 2, y0, 4, y1 - y0, b.id);
    base.push(`<g className="cp-border" data-id="${b.id}"><path d="M ${bxx} ${y0} L ${bxx} ${y1}" />
      ${chip(bxx, y0 - 2, b.label, 'cp-border-t')}</g>`);
  });

  /* Returns: every one drawn, each to its own destination. Commercial returns
     run inside the collapsed box, so they are drawn as a loop on it — a
     return that leaves retail and arrives at the distributor, both of which
     are in the box — not merged into any other. */
  const returnPath = {}, returnChip = {}, returnLabel = {};
  const retChip = (id, rx, ry, anchor = 'middle') => {
    returnLabel[id] = chipRect(rx, ry, R[id].label, anchor);
    returnChip[id] = chip(rx, ry, R[id].label, 'cp-ret-t', anchor);
    return returnChip[id];
  };
  const arc = (r, x1, y1, x2, y2, peak, lx, ly, anchor = 'middle') => {
    returnPath[r.id] = `M ${x1} ${y1} C ${x1} ${peak}, ${x2} ${peak}, ${x2} ${y2}`;
    return `<g className="cp-ret" data-id="${r.id}">
      <path d="${returnPath[r.id]}" markerEnd="${M('cp-tip-soft')}" />
      ${retChip(r.id, lx, ly, anchor)}</g>`;
  };
  const RISER_A = W - 22, RISER_B = W - 40;
  const mfgX0 = bx('stage-manufacturing')[0], mfgX1 = right('stage-manufacturing');
  const distX0 = bx('group-distribution-retail')[0], distX1 = right('group-distribution-retail');
  const consX1 = right('stage-consumption');
  returnPath['return-postconsumer-organic'] = `M ${right('stage-recovery')} ${recB[0] + 8} L ${RISER_A} ${recB[0] + 8} L ${RISER_A} 34 L ${midX('stage-biological')} 34 L ${midX('stage-biological')} ${bioB[0] - 4}`;
  returnPath['return-postconsumer-material'] = `M ${right('stage-recovery')} ${recB[0] + 22} L ${RISER_B} ${recB[0] + 22} L ${RISER_B} 56 L ${midX('stage-processing')} 56 L ${midX('stage-processing')} ${procB[0] - 4}`;
  returnPath['return-secondary'] = `M ${consX1 - 60} ${consB[0]} C ${consX1 - 60} ${consB[0] - 42}, ${consX1 - 10} ${consB[0] - 42}, ${consX1 - 10} ${consB[0]}`;
  const secondaryLines = wrap(R['return-secondary'].label, 18);
  returnLabel['return-secondary'] = [consX1 - 6 - est(secondaryLines[0], T_SMALL, 0.56), consB[0] - 72, est(secondaryLines[0], T_SMALL, 0.56), 30];
  block(...returnLabel['return-secondary'], 'return-secondary');
  base.push(
    arc(R['return-scrap'], mfgX0 + 20, mfgB[0] - 4, right('stage-processing') - 20, procB[0] - 4, 200, Math.round((right('stage-processing') + mfgX0) / 2) - 30, 214),
    arc(R['return-commercial'], distX1 - 24, distB[0] - 2, distX1 - 60, distB[0] - 2, distB[0] - 38, distX0 + 4, distB[0] - 54, 'start'),
    arc(R['return-packaging'], distX0 + 34, distB[0] - 2, mfgX1 - 20, mfgB[0] - 4, 236, distX0 + 26, distB[0] - 27),
    `<g className="cp-ret" data-id="return-postconsumer-organic">
      <path d="${returnPath['return-postconsumer-organic']}" markerEnd="${M('cp-tip-soft')}" />
      ${retChip('return-postconsumer-organic', midX('group-distribution-retail'), 38)}</g>`,
    `<g className="cp-ret" data-id="return-postconsumer-material">
      <path d="${returnPath['return-postconsumer-material']}" markerEnd="${M('cp-tip-soft')}" />
      ${retChip('return-postconsumer-material', midX('stage-manufacturing'), 60)}</g>`,
    `<g className="cp-ret" data-id="return-secondary">
      <path d="${returnPath['return-secondary']}" markerEnd="${M('cp-tip-soft')}" />
      ${secondaryLines.map((t, i) => T(consX1 - 6, consB[0] - 58 + i * 15, t, 'cp-ret-t', 'end')).join('')}</g>`,
    `<g className="cp-byp" data-id="${BYPRODUCT.id}"><path d="M ${midX('stage-processing') + 10} ${bottom('stage-processing')} L ${midX('stage-processing') + 46} ${bottom('stage-processing')} L ${midX('stage-processing') + 46} ${bottom('stage-processing') + 46}" markerEnd="${M('cp-tip-soft')}" />
      ${chip(procX0 + 6, bottom('stage-processing') + 70, BYPRODUCT.label, 'cp-ret-t', 'start')}</g>`,
  );

  laneNames(base, fanT, ROW_A);

  /* Joints: the nine the overview draws, in the gaps between the frames and inside the frames whose members are drawn. */
  const aggX = midX('node-aggregation');
  const jointGeom = {
    'j-production-aggregation': [gapMid('group-origins', 'group-processing'), bioY, 'rowA', -24],
    'j-extraction-processing': [exportX + 24, Math.round((geoY + AX) / 2) + 4, 'rowB', 0],
    'j-aggregation-processing': [aggX, Math.round((bottom('node-aggregation') + procB[0]) / 2), 'rowA', 56],
    'j-processing-trader': [Math.round((right('stage-processing') + bx('node-trader')[0]) / 2), AX, 'rowB', 0],
    'j-trader-manufacturing': [gapMid('group-processing', 'group-manufacturing'), AX, 'rowA', 0],
    // Its chip sits low on the flow, so the returns' labels above the distribution box have the row to themselves.
    'j-packaging-manufacturing': [midX('stage-manufacturing') - 40, Math.round((bottom('stage-packaging') + mfgB[0]) / 2), 'right', 11],
    'j-manufacturing-distribution': [gapMid('group-manufacturing', 'group-distribution-retail'), AX, 'rowB', 0],
    'j-retail-consumption': [gapMid('group-distribution-retail', 'group-use-recovery'), AX, 'rowA', 0],
    'j-consumption-recovery': [midX('stage-consumption') + 30, Math.round((bottom('stage-consumption') + recB[0]) / 2), 'left', 0],
  };
  const drawnJoints = JOINTS.filter((j) => drawnAtOverview(j.id));
  for (const j of drawnJoints) if (!jointGeom[j.id]) throw new Error(`the overview draws ${j.id} but has no geometry for it`);
  const colX = {
    'stage-biological': g1, 'stage-extraction': g1, 'node-aggregation': g2, 'stage-processing': g2, 'node-trader': g2,
    'stage-packaging': g3, 'stage-manufacturing': g3, 'node-distributor': g4, 'node-wholesaler': g4, 'node-retail': g4,
    'stage-consumption': g5, 'stage-recovery': g5,
  };

  const ctx = {
    level: 'overview', W, AX, ROW_A, ROW_B, BAND0, moveY: 228,
    base, jointHits, bandHits, layerSwitches, boxes, jointGeom, drawnJoints, colX, energyIn, recipientX,
    borderGeom, returnPath, returnChip, returnLabel,
  };
  joints(ctx);
  bands(ctx);
  rails(base, fanT, g1[0], g5[1], RAIL0);
  const { shiftLayers, marks, markOrder } = overlays(ctx, orderFrom);
  return { W, H, base, shiftLayers, marks, markOrder, hits: [...jointHits, ...bandHits, ...layerSwitches], aria: CHAIN_COPY.aria.compact };
}

/* ═══ EMIT ════════════════════════════════════════════════════════════════ */

/* role="img" would make the browser prune every button inside the drawing
   from the accessibility tree, so the plates are groups with a title and a
   description, and the joints and layers inside them stay reachable. */
const svgPlate = (kind, p) => `<svg className="cp-svg cp-svg--${kind}" viewBox="0 0 ${p.W} ${p.H}" role="group" aria-labelledby="cp-${kind}-title" aria-describedby="cp-${kind}-desc" focusable="false">
    <title id="cp-${kind}-title">${esc(p.aria.title)}</title>
    <desc id="cp-${kind}-desc">${esc(p.aria.desc)}</desc>
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
    <g className="cp-mark-layer">
      ${p.marks.join('\n      ')}
    </g>
  </svg>`;

SUF = '--wide';
const detail = plateDetail();
const detailJsx = svgPlate('wide', detail);
SUF = '--compact';
const overview = plateOverview(detail.markOrder);
const overviewJsx = svgPlate('compact', overview);
for (const s of SHIFTS) {
  if (overview.markOrder[s.id].join() !== detail.markOrder[s.id].join()) throw new Error(`the two levels number ${s.id} differently`);
}

fs.writeFileSync(path.join(OUT, 'ChainPlateSvg.tsx'), `/**
 * GENERATED by scripts/build-chain-plate.mjs — do not edit by hand.
 * Content: src/data/industryChain.ts. Layout: the generator.
 * Regenerate with \`npm run build:chain\`.
 *
 * Two plates for a wide screen, one content: the detail, with every function
 * under its own box, and the overview, the same records in five groups. The
 * joint markers and the layer bands are React components so their text comes
 * from the data at run time; the shift overlays are static geometry shown by
 * CSS from the wrapper's data-shift attribute. The narrow-screen layout is
 * ChainColumn.tsx, not generated.
 *
 * viewBox: detail ${detail.W} × ${detail.H}; overview ${overview.W} × ${overview.H}.
 */
import { BandHit } from './BandHit';
import { JointHit } from './JointHit';
import { LayerSwitch } from './LayerSwitch';
import { ShiftMark } from './ShiftMark';

export function ChainPlateWide() {
  return (
  ${detailJsx}
  );
}

export function ChainPlateCompact() {
  return (
  ${overviewJsx}
  );
}
`);

fs.writeFileSync(path.join(OUT, 'chainMarkOrder.ts'), `/**
 * GENERATED by scripts/build-chain-plate.mjs — do not edit by hand.
 *
 * The reading order of a shift's marks, computed from where they land on the
 * detail plate: left to right, then top to bottom, with the enabling layers
 * last because they are the bottom row. The overview takes the same order,
 * and so does the narrow-screen column, so a number means the same thing on
 * a phone, at the overview and on the detail. It is deliberately NOT the
 * order of src/data/industryChain.ts.
 *
 * A target whose reading is empty at either distance carries no mark; the
 * runtime filters this list and numbers what is left from one, so the numbers
 * are always contiguous.
 */
import type { ShiftId } from '@/data/industryChain';

export const MARK_ORDER: Record<ShiftId, readonly string[]> = ${JSON.stringify(detail.markOrder, null, 2).replace(/"([\w-]+)":/g, "'$1':").replace(/"/g, "'").replace(/\n/g, '\n')} as const;
`);

fs.writeFileSync(path.join(OUT, 'chain-plate.css'), `/**
 * GENERATED by scripts/build-chain-plate.mjs — do not edit by hand.
 *
 * Every colour is a token from src/index.css; nothing here adds a hue. The
 * base map sits on foreground / muted / border. The one accent on the plate
 * is the shift accent, and it means exactly one thing: a SHIFT — the
 * outline on an element that moves, the arrow of a cut that moves or a price
 * that arrives, the callout beside it, the numbered mark. It is used as a
 * field and an edge, never as running text. The two distances have no
 * colour: they change the words on the chips, and the lane label says which
 * is on.
 *
 * Every category is told by form before colour: stages are solid boxes,
 * nodes are dashed pills, groups are faint frames with a kicker, layers are
 * filled bands ticked where they attach, returns are dashed arcs, money is
 * dotted with a filled head, information is dash-dot with an open head,
 * borders are vertical dashes with a chip, energy is a short dotted arrow
 * rising into each stage from a dotted network line whose left end is
 * generation and whose open points are connections. The margin kinds are
 * told by the joint mark on the flow: a filled diamond where a stage sells
 * (conversion), an open diamond where a node sells (spread), a square where
 * a fee is paid.
 *
 * A status is told by form too, never by colour alone: a marked element is
 * outlined heavy when it is stuck, plain when it is moving, dashed when it is
 * unpriced, and its numbered disc is filled, open or dashed to match.
 *
 * Weight: the flow is the heaviest line on the plate and the joint mark the
 * heaviest form, so the chain and its joints read first; the boxes are drawn
 * a step lighter and the group frames lighter still. Under a shift the base
 * geometry and every unmarked joint recede to a fixed opacity; labels never
 * dim. At the finance distance an open reading isolates its joint: everything
 * else steps back further.
 */
.chain-plate{
  --cp-shift: hsl(var(--accent-editorial));
  /* The detail plate's own width in units, so the figure can hold it at one pixel per unit and scroll (chain-review.css). */
  --cp-detail-w: ${detail.W}px;
}
.chain-plate .cp-svg{display:block;width:100%;height:auto}

/* Base — quiet where it is not the chain. */
.cp-base :is(path,rect,circle,ellipse,line,polygon,polyline){transition:opacity .22s ease}
.cp-group rect{fill:hsl(var(--muted));fill-opacity:.32;stroke:hsl(var(--border));stroke-width:1}
.cp-group-t{font-size:${T_SMALL}px;fill:hsl(var(--muted-foreground));letter-spacing:.09em;text-transform:uppercase}
.cp-stage rect{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1}
.cp-stage .cp-origin{fill:hsl(var(--primary));stroke:none}
.cp-stage-t{font-size:${T_STAGE}px;font-weight:600;fill:hsl(var(--foreground));letter-spacing:-.005em}
.cp-node rect{fill:hsl(var(--background));stroke:hsl(var(--muted-foreground));stroke-width:1;stroke-dasharray:3 2.5}
.cp-node-t{font-size:${T_NODE}px;fill:hsl(var(--foreground))}
.cp-retail-sep{fill:none;stroke:hsl(var(--border));stroke-width:1}
.cp-recur{font-size:${T_SMALL}px;fill:hsl(var(--muted-foreground))}
.cp-lane-t{font-size:${T_SMALL}px;fill:hsl(var(--muted-foreground))}
.cp-demand path{stroke:hsl(var(--foreground));stroke-width:2}
.cp-demand-t{font-size:${T_SMALL}px;fill:hsl(var(--foreground))}
.cp-flow{fill:none;stroke:hsl(var(--foreground));stroke-width:1.7}
.cp-flow-thin{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:.8}
.cp-mk{fill:hsl(var(--foreground))}
.cp-mk-soft{fill:hsl(var(--muted-foreground))}
.cp-mk-open{fill:hsl(var(--background));stroke:hsl(var(--muted-foreground));stroke-width:1}
.cp-mk-shift{fill:var(--cp-shift)}
.cp-kind-t{font-size:${T_SMALL}px;fill:hsl(var(--muted-foreground));letter-spacing:.09em;text-transform:uppercase}
.cp-chip{fill:hsl(var(--background))}
.cp-money{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.4;stroke-dasharray:2 3.5;stroke-linecap:round}
.cp-info{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.1;stroke-dasharray:9 3 1.5 3}
.cp-rail-t{font-size:${T_SMALL}px;fill:hsl(var(--muted-foreground))}
.cp-ret path{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1;stroke-dasharray:5 3;stroke-linejoin:round}
.cp-ret-t{font-size:${T_SMALL}px;fill:hsl(var(--muted-foreground))}
.cp-byp path{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1}
.cp-border path{fill:none;stroke:hsl(var(--foreground));stroke-width:1.2;stroke-dasharray:6 4}
.cp-border-t{font-size:${T_SMALL}px;fill:hsl(var(--foreground));letter-spacing:.09em;text-transform:uppercase;font-weight:600}
/* Energy rises into every stage: a short dotted arrow at the bottom edge of each box. */
.cp-energy-in{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:1.3;stroke-dasharray:1.5 2.5;stroke-linecap:round}
.cp-band rect{fill:hsl(var(--secondary))}
.cp-band-line{stroke:hsl(var(--border));stroke-width:1}
.cp-band-t{font-size:${T_SMALL}px;fill:hsl(var(--foreground));letter-spacing:.09em;text-transform:uppercase}
.cp-band-n{font-size:${T_SMALL}px;fill:hsl(var(--muted-foreground))}
.cp-band-fee{font-size:${T_SMALL}px;fill:hsl(var(--muted-foreground));letter-spacing:.02em;text-transform:none}
/* Where a layer attaches: a filled square where its fee is paid, an open one where only its terms apply, a rising tick where it is an input, a block on a post where it builds the asset. */
.cp-tick--fee{fill:hsl(var(--foreground));stroke:none}
.cp-tick--terms{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1}
.cp-tick--up{fill:none;stroke:hsl(var(--foreground));stroke-width:1.2}
.cp-tick--asset{fill:hsl(var(--foreground));stroke:hsl(var(--foreground));stroke-width:1.2}
/* The energy band's top edge is the network: dotted like the risers, a filled point for generation at its left end, an open point at every connection. */
.cp-energy-net{fill:none;stroke:hsl(var(--foreground));stroke-width:1.4;stroke-dasharray:1.5 2.5;stroke-linecap:round}
.cp-energy-gen{fill:hsl(var(--foreground));stroke:none}
.cp-energy-conn{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1.2}

/* The reading lane: one distance name shows, from the wrapper's data-lens. */
.cp-lens-name{display:none}
.chain-plate[data-lens="economy"] .cp-lens-name--economy{display:block}
.chain-plate[data-lens="finance"] .cp-lens-name--finance{display:block}

/* Interactive marks: joints and layers. Every target is a button and opens
   the panel on click, tap or Enter; hover only strengthens the mark. */
/* The shape that takes the pointer, never the ink. Every door carries a
   larger invisible shape behind its drawn one. It has to beat the element
   rules that paint a bare circle or rect inside a mark or a chip: a
   presentation attribute loses to any stylesheet rule, which is how the first
   attempt at this drew the hit areas as rings. Two classes of specificity, so
   it wins, and it is never a visual. */
.chain-plate .cp-hit-area{fill:transparent;stroke:none;pointer-events:all}
.cp-hit{cursor:pointer}
.cp-hit:focus{outline:none}
.cp-joint .cp-joint-mark{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1.8}
.cp-joint .cp-joint-mark--filled-diamond{fill:hsl(var(--foreground))}
.cp-joint .cp-joint-mark--square{fill:hsl(var(--foreground));stroke-width:1.2}
.cp-joint-lead{fill:none;stroke:hsl(var(--muted-foreground));stroke-width:.9}
.cp-joint-chip{cursor:pointer}
.cp-joint-chip rect{fill:hsl(var(--background));stroke:hsl(var(--foreground));stroke-width:1}
.cp-joint-chip text{font-size:${T_SMALL}px;fill:hsl(var(--foreground))}
.cp-band-hit rect.cp-band-rect{fill:hsl(var(--secondary))}
@media (hover:hover) and (pointer:fine){
  .cp-joint:hover .cp-joint-mark{stroke-width:2.6}
  .cp-joint-chip:hover rect{stroke-width:1.8}
  .cp-band-hit:hover rect.cp-band-rect{fill:hsl(var(--muted))}
}
.cp-joint[aria-expanded="true"] .cp-joint-mark{stroke:var(--cp-shift);stroke-width:3}
.cp-joint:focus-visible .cp-joint-mark{stroke:hsl(var(--ring));stroke-width:3}
.cp-band-hit[aria-expanded="true"] rect.cp-band-rect{fill:hsl(var(--muted));stroke:hsl(var(--foreground));stroke-width:1.2}
.cp-band-hit:focus-visible rect.cp-band-rect{stroke:hsl(var(--ring));stroke-width:2}

/* A layer switched off recedes but stays in place; its switch stays crisp. */
.cp-band-hit[data-hidden],.chain-plate .cp-lit[data-hidden],.chain-plate .cp-mark[data-hidden],.chain-plate .cp-energy-in[data-hidden],.chain-plate .cp-callout--mechanism[data-hidden]{opacity:.18}
/* A faded door is still a door. Fading is an opacity on the group, and CSS
   cannot restore a child through its parent's opacity, so a focus ring inside
   a faded element is drawn at the faded element's opacity: measured at .18 on
   a switched-off layer, which is not a visible focus indicator. Focus brings
   the element back to full while it holds it, and it goes back when focus
   leaves. It is never applied to a pointer: a mouse reader has the pointer to
   tell them where they are. */
.chain-plate .cp-band-hit[data-hidden]:focus-visible,.chain-plate .cp-mark[data-hidden]:focus-visible{opacity:1}
.cp-switch{cursor:pointer}
.cp-switch:focus{outline:none}
.cp-switch .cp-switch-box{fill:hsl(var(--background));stroke:hsl(var(--muted-foreground));stroke-width:1}
.cp-switch .cp-switch-dot{fill:hsl(var(--foreground));stroke:none}
.cp-switch:focus-visible .cp-switch-box{stroke:hsl(var(--ring));stroke-width:2.5}
@media (hover:hover) and (pointer:fine){.cp-switch:hover .cp-switch-box{stroke:hsl(var(--foreground))}}

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
/* Status by form: stuck is heavy, moving is plain, unpriced is dashed. */
.cp-lit--stuck.cp-lit-ring,.cp-lit--stuck.cp-lit-rect{stroke-width:3.4}
.cp-lit--stuck.cp-lit-line{stroke-width:3.6;stroke-dasharray:none}
.cp-lit--stuck.cp-lit-path{stroke-width:3;stroke-dasharray:none}
.cp-lit--unpriced.cp-lit-ring,.cp-lit--unpriced.cp-lit-rect{stroke-dasharray:4 3;stroke-width:2}
.cp-lit--unpriced.cp-lit-path{stroke-dasharray:3 4;stroke-width:1.8}
.cp-move-path{fill:none;stroke:var(--cp-shift);stroke-width:2}
.cp-move-hit{fill:none;stroke:transparent;stroke-width:14;cursor:help}
.cp-move-t{font-size:${T_SMALL}px;fill:hsl(var(--foreground));font-weight:600}
.cp-callout rect{fill:hsl(var(--background));stroke:var(--cp-shift);stroke-width:1.6}
.cp-callout-t{font-size:${T_SMALL}px;fill:hsl(var(--foreground));font-weight:600}
/* What moves an element, named on the overlay where it is not the price the map draws. */
.cp-callout--mechanism rect{stroke-dasharray:3 2}
.cp-callout--mechanism text{font-weight:500}
.cp-hit[data-lit] .cp-joint-mark{stroke:var(--cp-shift);stroke-width:2.4}
.cp-hit[data-lit] rect.cp-band-rect{stroke:var(--cp-shift);stroke-width:1.5}

/* Isolation: at the finance distance an open reading keeps its joint, the
   two hands either side of it and the layers that touch it; the rest of the
   plate steps back until the reading closes. */
/* What steps back is the GEOMETRY. Fading a group takes its labels with it,
   and a reader deciding which comparison to make next has to be able to read
   what is there: measured, a stage name inside a stepped-back group came out
   at an effective .1, which is a name you cannot read. So the shapes recede
   and the names stay legible a step behind the reading. */
.chain-plate[data-isolate] .cp-svg [data-dim]{opacity:1}
.chain-plate[data-isolate] .cp-svg [data-dim]:is(path,rect,circle,ellipse,line,polygon,polyline),
.chain-plate[data-isolate] .cp-svg [data-dim] :is(path,rect,circle,ellipse,line,polygon,polyline){opacity:.1}
.chain-plate[data-isolate] .cp-svg [data-dim] text{opacity:.45}
/* Same rule, the other fade: a stepped-back joint that a keyboard reader has
   tabbed to comes back whole while it holds focus, so its focus ring is a
   focus ring and not a tenth of one. */
.chain-plate[data-isolate] .cp-svg [data-dim]:focus-visible :is(path,rect,circle,ellipse,line,polygon,polyline),
.chain-plate[data-isolate] .cp-svg [data-dim]:focus-visible text{opacity:1}

/* The numbered marks: an index onto the shift that is on, drawn last so a
   mark is never buried, and carried on an opaque disc so it stays legible
   wherever it lands. Only the marks of the shift that is on are in the
   document's tab order — display:none, not opacity. The disc's FORM is the
   status: filled for stuck, open for moving, dashed for unpriced. */
.cp-marks{display:none}
.chain-plate[data-shift="reindustrialisation"] .cp-marks--reindustrialisation{display:block}
.chain-plate[data-shift="green"] .cp-marks--green{display:block}
.cp-mark{cursor:pointer}
.cp-mark:focus{outline:none}
.cp-mark circle{fill:hsl(var(--background));stroke:var(--cp-shift);stroke-width:1.8}
.cp-mark text{font-size:${T_SMALL}px;font-weight:700;fill:hsl(var(--foreground));letter-spacing:0}
.cp-mark--stuck circle{fill:var(--cp-shift)}
.cp-mark--stuck text{fill:hsl(var(--background))}
.cp-mark--unpriced circle{stroke-dasharray:3 2.5}
.cp-mark[aria-expanded="true"] circle{stroke-width:3}
.cp-mark:focus-visible circle{stroke:hsl(var(--ring));stroke-width:3}
@media (hover:hover) and (pointer:fine){.cp-mark:hover circle{stroke-width:2.8}}
/* Renumbering is a change of place, so the marks arrive in reading order
   rather than all at once: the reader's eye is led along the new sequence
   instead of having to find it. */
@keyframes cp-mark-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.cp-mark{animation:cp-mark-in .2s ease both;animation-delay:calc(var(--cp-n, 0) * 45ms);transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:reduce){.cp-mark{animation:none}}
@media (prefers-reduced-motion:reduce){.cp-base :is(path,rect,circle,ellipse,line,polygon,polyline){transition:none}}
`);

console.log(`generated ChainPlateSvg.tsx (detail ${detail.W}×${detail.H}, overview ${overview.W}×${overview.H}) and chain-plate.css`);
