/**
 * Generator for the front-page plate. Emits ONE self-contained HTML file.
 * Geometry is computed here so ~200 coordinates stay on one grid; the
 * deliverable is the file this writes, which loads no external asset.
 *
 * The hourglass is carried by WIDTH in both layouts — lane count on the wide
 * plate, box width on the tall one — because a shape that has to be captioned
 * is not a shape.
 */
import fs from 'node:fs';

/* ── Content. Exactly the final node set: nothing added, removed or renamed. ── */

const BIO = ['Genetics and breeding', 'Cultivation', 'Livestock', 'Capture fisheries'];
const GEO = ['Fossil energy', 'Minerals and ores'];
const RETAIL = ['Warung / general trade', 'Modern trade', 'E-commerce, first party', 'Quick commerce', 'Horeca'];
const DEMAND = ['Households', 'Government and institutions', 'Abroad'];

const STRATA = [
  { label: 'Logistics and warehousing', note: 'ambient · cold chain' },
  { label: 'Credit and working capital', macro: 'Monetary policy', micro: 'DSO · DIO · DPO — who finances whom' },
  { label: 'Regulation, standards and fiscal status', macro: 'Fiscal', micro: 'output VAT less input VAT · excise payable' },
  { label: 'Contract capacity', note: 'makloon · toll manufacturing' },
  { label: 'Principal and distributor contractual governance' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T = (x, y, s, { cls = 'lbl', anchor = 'start' } = {}) =>
  `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`;
const Trot = (x, y, s, cls, anchor = 'start') =>
  `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" transform="rotate(-90 ${x} ${y})">${esc(s)}</text>`;

/** The two readings of one joint, stacked: the name, then the instrument. */
const stack = (x, y, macro, micro, { anchor = 'start', w = 300 } = {}) => `
<g class="joint">
  <rect x="${anchor === 'end' ? x - w : x}" y="${y - 13}" width="${w}" height="32" fill="transparent"/>
  ${T(x, y, macro, { cls: 'macro', anchor })}
  ${T(x, y + 15, micro, { cls: 'micro', anchor })}
</g>`;

/** Transformation stage — the only filled or heavy-outlined form on the plate. */
const stage = (x, y, w, h, lines, primary = false) => {
  const L = [].concat(lines);
  const cls = primary ? 'stage-t stage-t--rev' : 'stage-t';
  const y0 = y + h / 2 + 5 - (L.length - 1) * 7;
  return `<g class="${primary ? 'stage stage--entry' : 'stage'}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>
    ${L.map((t, i) => T(x + 10, y0 + i * 14, t, { cls })).join('')}</g>`;
};

/** Intermediary node — never filled, always dashed, always smaller. */
const node = (x, y, w, h, label) => `
<g class="node"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>
  ${T(x + 12, y + h / 2 + 4, label, { cls: 'node-t' })}</g>`;

/* ═══ WIDE PLATE ══════════════════════════════════════════════════════════ */

function wide() {
  const W = 1680, H = 830, AX = 275;
  const o = [];
  const C = {
    fanT: 150, fanL: 156, org: [206, 374], agg: [396, 496], proc: [504, 664],
    trad: [690, 800], mfg: [828, 988], dist: [1014, 1124], ret: [1150, 1300], cons: [1326, 1520],
  };
  const bioY = 168, geoY = 382;
  const bioB = [132, 72], geoB = [350, 60], procB = [238, 74], mfgB = [238, 74];
  const tradB = [259, 32], packB = [110, 42], princB = [394, 32];
  const distY = 240, wholY = 316;
  const retCY = [146, 212, 278, 344, 410], retH = 30;
  const consB = [136, 284], recB = [452, 48];

  /* 1 — the hourglass, as a field: the first thing read, the least ink. */
  o.push(`<path class="hull" d="M 156,104 C 300,96 402,106 504,232 L 988,232
    C 1090,118 1240,104 1520,100 L 1520,444 C 1240,440 1090,426 988,318
    L 504,318 C 402,444 300,452 156,400 Z"/>`);

  /* 2 — enabling layers: strata the chain runs over, deliberately the lightest. */
  STRATA.forEach((s, i) => {
    const y = 604 + i * 40;
    o.push(`<g class="strat">
      <rect x="156" y="${y}" width="1364" height="34"/>
      <path class="strat-top" d="M 156 ${y} L 1520 ${y}"/>
      ${T(166, y + 21, s.label, { cls: 'strat-t' })}
      ${s.note ? T(560, y + 21, s.note, { cls: 'strat-n' }) : ''}
      ${s.macro ? stack(1510, y + 13, s.macro, s.micro, { anchor: 'end' }) : ''}
    </g>`);
  });

  /* 3 — the border: perpendicular cuts, full height, never a band. */
  const cut = (x, label) => `<g class="cut"><path d="M ${x} 100 L ${x} 798"/>
    <rect x="${x - 40}" y="80" width="80" height="16" class="cut-chip"/>
    ${T(x, 92, label, { cls: 'cut-t', anchor: 'middle' })}</g>`;
  o.push(cut(384, 'Export'), cut(490, 'Import'), cut(814, 'Capital goods'));

  /* 4 — connective tissue. The taper IS the hourglass. */
  BIO.forEach((l, i) => {
    const y = 108 + i * 30;
    o.push(T(C.fanT, y + 4, l, { cls: 'lane-t', anchor: 'end' }),
      `<path class="flow-thin" d="M ${C.fanL} ${y} C 182 ${y}, 188 ${bioY}, ${C.org[0]} ${bioY}"/>`);
  });
  GEO.forEach((l, i) => {
    const y = 356 + i * 30;
    o.push(T(C.fanT, y + 4, l, { cls: 'lane-t', anchor: 'end' }),
      `<path class="flow-thin" d="M ${C.fanL} ${y} C 182 ${y}, 188 ${geoY}, ${C.org[0]} ${geoY}"/>`);
  });
  const flow = (x1, y1, x2, y2, cls = 'flow') =>
    `<path class="${cls}" d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}"/>`;
  o.push(
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
    `<path class="flow" d="M 880 ${packB[0] + packB[1]} C 880 200, 886 214, 892 ${mfgB[0] - 3}" marker-end="url(#tip)"/>`,
    `<path class="flow-thin" d="M 892 ${mfgB[0] + mfgB[1]} L 892 ${princB[0]}"/>`,
    `<path class="flow" d="M 1420 ${consB[0] + consB[1]} L 1420 ${recB[0] - 3}" marker-end="url(#tip)"/>`,
  );

  /* 5 — energy: perpendicular into every stage, never along the chain. */
  const en = (cx, top) => `<path class="energy" d="M ${cx} ${top - 22} L ${cx} ${top - 3}" marker-end="url(#tip-energy)"/>`;
  o.push(T(158, 84, 'Energy', { cls: 'energy-t' }),
    en(266, bioB[0]), en(266, geoB[0]), en(560, procB[0]), en(940, packB[0]),
    en(950, mfgB[0]), en(1470, consB[0]), en(1470, recB[0]));

  /* 6 — the four categories, each as its own form. */
  o.push(
    stage(C.org[0], bioB[0], 168, bioB[1], ['Biological primary', 'production'], true),
    stage(C.org[0], geoB[0], 168, geoB[1], ['Geological', 'extraction'], true),
    `<path class="entry-bar" d="M ${C.org[0] - 7} ${bioB[0]} L ${C.org[0] - 7} ${geoB[0] + geoB[1]}"/>`,
    node(C.agg[0], bioY - 17, 100, 34, 'Aggregation'),
    stage(C.proc[0], procB[0], 160, procB[1], ['Primary processing']),
    node(C.trad[0], tradB[0], 110, tradB[1], 'Trader / importer'),
    stage(C.mfg[0], packB[0], 160, packB[1], ['Packaging manufacture']),
    stage(C.mfg[0], mfgB[0], 160, mfgB[1], ['Finished-goods', 'manufacturing']),
    node(C.mfg[0], princB[0], 160, princB[1], 'Brand owner / principal'),
    node(C.dist[0], distY - 15, 110, 30, 'Distributor'),
    T(C.dist[0] + 14, distY + 28, '↳ sub-distributor · regional agent', { cls: 'recur' }),
    node(C.dist[0], wholY - 15, 110, 30, 'Wholesaler'),
    ...RETAIL.map((r, i) => node(C.ret[0], retCY[i] - retH / 2, 150, retH, r)),
    // Consumption: the title sits at the top so the three demand components own the body.
    `<g class="stage"><rect x="${C.cons[0]}" y="${consB[0]}" width="194" height="${consB[1]}" rx="2"/>
      ${T(C.cons[0] + 10, consB[0] + 22, 'Consumption and use', { cls: 'stage-t' })}</g>`,
    ...DEMAND.map((d, i) => `<g class="demand">
      <path d="M ${C.cons[0] + 12} ${218 + i * 76 - 10} L ${C.cons[0] + 12} ${218 + i * 76 + 6}"/>
      ${T(C.cons[0] + 21, 218 + i * 76 + 4, d, { cls: 'demand-t' })}</g>`),
    stage(1330, recB[0], 190, recB[1], ['Recovery']),
  );

  /* 7 — physical returns: each arc spans exactly the joints it connects. */
  const arc = (x1, x2, peak, label) => `<g class="ret">
    <path d="M ${x1} 232 C ${x1} ${peak}, ${x2} ${peak}, ${x2} 232" marker-end="url(#tip-ret)"/>
    ${T((x1 + x2) / 2, peak + 6, label, { cls: 'ret-t', anchor: 'middle' })}</g>`;
  o.push(
    arc(908, 584, 178, 'Scrap and reject'),
    arc(1225, 1069, 178, 'Commercial returns'),
    arc(1225, 908, 140, 'Reusable packaging'),
    `<g class="ret">
      <path d="M 1520 476 L 1620 476 L 1620 38 L 278 38 L 278 ${bioB[0] - 4}" marker-end="url(#tip-ret)"/>
      <path d="M 560 38 L 560 ${procB[0] - 4}" marker-end="url(#tip-ret)"/>
      ${T(1000, 30, 'Post-consumer', { cls: 'ret-t', anchor: 'middle' })}</g>`,
    `<g class="ret">
      <path d="M 1520 206 C 1562 220, 1562 252, 1520 266" marker-end="url(#tip-ret)"/>
      ${T(1568, 232, 'Secondary market', { cls: 'ret-t' })}
      ${T(1568, 245, 'and refurbishment', { cls: 'ret-t' })}</g>`,
    `<g class="byp"><path d="M 660 ${procB[0] + procB[1]} L 742 386" marker-end="url(#tip)"/>
      ${T(750, 396, 'By-product → another chain', { cls: 'byp-t' })}</g>`,
  );

  /* 8 — money and information, attached to the joints they work at. */
  const joints = [374, 490, 664, 800, 1000, 1140, 1315];
  const railChip = (x, y, label) =>
    `<rect x="${x - 4}" y="${y - 9}" width="${label.length * 5.9 + 10}" height="15" class="cut-chip"/>${T(x, y + 2, label, { cls: 'np-t' })}`;
  o.push(`<g class="np">
    ${joints.map((x) => `<path class="np-stem" d="M ${x} 446 L ${x} 552"/>`).join('')}
    <path class="np-money" d="M 1300 528 L 160 528" marker-end="url(#tip-money)"/>
    <path class="np-info" d="M 1300 552 L 160 552" marker-end="url(#tip-info)"/>
    <path class="np-info" d="M 160 552 L 1300 552" marker-end="url(#tip-info)"/>
    ${railChip(600, 528, 'Money — payment, against the goods')}
    ${railChip(600, 552, 'Information — demand signal ◁   ▷ specification and standard')}
  </g>`);

  /* 9 — the near reading, sited where each variable enters. */
  o.push(
    stack(512, 158, 'Inflation', 'gross margin by stage · renegotiation lag'),
    stack(512, 200, 'Exchange rate', 'foreign-exchange gain and loss'),
    stack(512, 352, 'Labour', 'labour inside cost of goods sold'),
    stack(700, 470, 'Business cycle', 'inventory to sales'),
    stack(1020, 470, 'Growth', 'value added: revenue less purchased inputs'),
    stack(156, 580, 'External balance', 'export revenue · import cost · landed cost'),
  );

  return `<svg class="plate plate--wide" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="An industry chain drawn as an hourglass: many production lanes narrow to primary processing, then widen through distribution to retail and final demand.">
    ${defs()}${o.join('\n')}</svg>`;
}

/* ═══ TALL PLATE ══════════════════════════════════════════════════════════ */

function tall() {
  const W = 390, H = 1580, CX = 190;
  const o = [];
  /** Centre a box of width w on the spine — width is what carries the pinch. */
  const b = (w) => [CX - w / 2, w];

  /* Hull: wide, pinched, wide — standing upright. */
  o.push(`<path class="hull" d="M 86,150 C 82,300 138,360 ${CX - 58},430 L ${CX - 58},790
    C 138,880 78,940 74,1120 L 306,1120 C 302,940 242,880 ${CX + 58},790
    L ${CX + 58},430 C 242,360 298,300 294,150 Z"/>`);

  /* Enabling layers: rails running the whole length, so a layer still spans the chain. */
  STRATA.forEach((s, i) => {
    const x = 330 + i * 12;
    o.push(`<g class="strat"><rect x="${x}" y="150" width="7" height="1080"/>
      <path class="strat-top" d="M ${x} 150 L ${x} 1230"/>
      ${Trot(x + 5, 1224, s.label, 'strat-t')}</g>`);
  });

  const st = (y, h, w, lines, primary = false) => stage(b(w)[0], y, w, h, lines, primary);
  const nd = (y, h, w, label) => node(b(w)[0], y, w, h, label);
  const down = (y1, y2) => `<path class="flow" d="M ${CX} ${y1} L ${CX} ${y2}" marker-end="url(#tip)"/>`;
  const en = (y, w) => `<path class="energy" d="M ${b(w)[0] + w + 22} ${y} L ${b(w)[0] + w + 4} ${y}" marker-end="url(#tip-energy)"/>`;

  BIO.concat(GEO).forEach((l, i) => {
    const x = 96 + i * 34;
    o.push(`<path class="flow-thin" d="M ${x} 158 C ${x} 196, ${CX} 186, ${CX} 222"/>`,
      Trot(x + 4, 152, l, 'lane-t'));
  });

  o.push(
    st(222, 38, 208, ['Biological primary production'], true), en(241, 208),
    st(264, 32, 208, ['Geological extraction'], true), en(280, 208),
    down(296, 322), nd(322, 26, 156, 'Aggregation'),
    down(348, 380), st(380, 46, 112, ['Primary', 'processing']), en(402, 112),
    down(426, 452), nd(452, 26, 132, 'Trader / importer'),
    down(478, 508), st(508, 34, 124, ['Packaging manufacture']), en(525, 124),
    down(542, 572), st(572, 46, 124, ['Finished-goods', 'manufacturing']), en(594, 124),
    down(618, 648), nd(648, 26, 160, 'Brand owner / principal'),
    down(674, 704), nd(704, 26, 150, 'Distributor'),
    T(b(150)[0] + 12, 742, '↳ sub-distributor · regional agent', { cls: 'recur' }),
    down(730, 750), nd(750, 26, 150, 'Wholesaler'),
    down(776, 796),
    ...RETAIL.map((r, i) => nd(796 + i * 34, 26, 200, r)),
    down(966, 990),
    `<g class="stage"><rect x="${b(224)[0]}" y="990" width="224" height="120" rx="2"/>
      ${T(b(224)[0] + 10, 1012, 'Consumption and use', { cls: 'stage-t' })}</g>`,
    en(1010, 224),
    ...DEMAND.map((d, i) => `<g class="demand">
      <path d="M ${b(224)[0] + 12} ${1042 + i * 24 - 9} L ${b(224)[0] + 12} ${1042 + i * 24 + 5}"/>
      ${T(b(224)[0] + 21, 1042 + i * 24 + 3, d, { cls: 'demand-t' })}</g>`),
    down(1110, 1134), st(1134, 34, 170, ['Recovery']), en(1151, 170),
    `<g class="byp"><path d="M ${b(112)[0] + 112} 414 L ${b(112)[0] + 148} 444" marker-end="url(#tip)"/>
      ${T(b(112)[0] + 116, 462, 'By-product →', { cls: 'byp-t' })}
      ${T(b(112)[0] + 116, 474, 'another chain', { cls: 'byp-t' })}</g>`,
    T(300, 214, 'Energy', { cls: 'energy-t' }),
  );

  /* Returns run up the left gutter, each spanning the joints it connects. */
  const rarc = (y1, y2, x, w1, w2, label) => `<g class="ret">
    <path d="M ${b(w1)[0]} ${y1} C ${x} ${y1}, ${x} ${y2}, ${b(w2)[0]} ${y2}" marker-end="url(#tip-ret)"/>
    ${Trot(x - 4, (y1 + y2) / 2, label, 'ret-t', 'middle')}</g>`;
  o.push(
    rarc(594, 402, 52, 124, 112, 'Scrap and reject'),
    rarc(830, 717, 40, 200, 150, 'Commercial returns'),
    rarc(880, 594, 24, 200, 124, 'Reusable packaging'),
    `<g class="ret"><path d="M ${b(170)[0]} 1151 L 12 1151 L 12 241 L ${b(208)[0]} 241" marker-end="url(#tip-ret)"/>
      <path d="M 12 402 L ${b(112)[0]} 402" marker-end="url(#tip-ret)"/>
      ${Trot(8, 700, 'Post-consumer', 'ret-t', 'middle')}</g>`,
    `<g class="ret"><path d="M ${b(224)[0] + 224} 1030 C ${b(224)[0] + 254} 1042, ${b(224)[0] + 254} 1066, ${b(224)[0] + 224} 1078" marker-end="url(#tip-ret)"/>
      ${Trot(b(224)[0] + 262, 1054, 'Secondary market', 'ret-t', 'middle')}</g>`,
  );

  /* Money and information, attached to the same joints. */
  const mj = [296, 426, 542, 674, 776, 966];
  o.push(`<g class="np">
    ${mj.map((y) => `<path class="np-stem" d="M ${CX} ${y} L 318 ${y}"/>`).join('')}
    <path class="np-money" d="M 310 1120 L 310 280" marker-end="url(#tip-money)"/>
    <path class="np-info" d="M 320 1120 L 320 280" marker-end="url(#tip-info)"/>
    <path class="np-info" d="M 320 280 L 320 1120" marker-end="url(#tip-info)"/>
    ${Trot(308, 1230, 'Money — payment', 'np-t')}
    ${Trot(322, 1230, 'Information ◁ ▷', 'np-t')}</g>`);

  /* The near reading. On a phone the chain column is too narrow to carry it at
     each joint, so it closes the plate as one block — every joint, named. */
  const NEAR = [
    ['Growth', 'value added: revenue less purchased inputs'],
    ['Inflation', 'gross margin by stage · renegotiation lag'],
    ['Monetary policy', 'DSO · DIO · DPO — who finances whom'],
    ['Exchange rate', 'foreign-exchange gain and loss'],
    ['External balance', 'export revenue · import cost · landed cost'],
    ['Fiscal', 'output VAT less input VAT · excise payable'],
    ['Labour', 'labour inside cost of goods sold'],
    ['Business cycle', 'inventory to sales'],
  ];
  o.push(`<path class="strat-top" d="M 8 1268 L 382 1268"/>`,
    T(8, 1290, 'The same joints, read close', { cls: 'strat-t' }));
  NEAR.forEach(([macro, micro], i) => {
    const y = 1318 + i * 30;
    o.push(`<g class="joint"><rect x="8" y="${y - 11}" width="374" height="28" fill="transparent"/>
      ${T(8, y, macro, { cls: 'macro' })}${T(8, y + 13, micro, { cls: 'micro' })}</g>`);
  });

  /* The border, cutting across a chain that now runs downward. */
  const mcut = (y, label) => `<g class="cut"><path d="M 8 ${y} L 382 ${y}"/>
    <rect x="${CX - 44}" y="${y - 8}" width="88" height="16" class="cut-chip"/>
    ${T(CX, y + 4, label, { cls: 'cut-t', anchor: 'middle' })}</g>`;
  o.push(mcut(310, 'Export'), mcut(366, 'Import'), mcut(556, 'Capital goods'));

  return `<svg class="plate plate--tall" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="The same industry chain turned upright for a narrow screen: production lanes at the top narrow to primary processing, then widen through distribution to retail and final demand.">
    ${defs()}${o.join('\n')}</svg>`;
}

/* Growth, monetary, fiscal and external readings that the tall plate carries
   on its strata rails and in the closing block. */
function tallExtras() {
  return '';
}

const defs = () => `<defs>
  <marker id="tip" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 7 4 L 0 7 z" class="mk"/></marker>
  <marker id="tip-ret" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 7 4 L 0 7 z" class="mk-acc"/></marker>
  <marker id="tip-money" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 7 4 L 0 7 z" class="mk-acc"/></marker>
  <marker id="tip-info" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    <path d="M 0 1 L 7 4 L 0 7 z" class="mk-soft"/></marker>
  <marker id="tip-energy" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    <path d="M 0 1 L 7 4 L 0 7 z" class="mk-soft"/></marker>
</defs>`;

/* ── The page ────────────────────────────────────────────────────────────── */

const outline = `
<h2>The chain, in reading order</h2>
<p>Four categories, never mixed: transformation stages, intermediary nodes that take title without transforming, enabling layers that take no title at all, and physical flows that run back up the chain. The chain narrows to primary processing and widens after distribution.</p>
<h3>Transformation stages</h3>
<ol>
  <li>Biological primary production — ${BIO.join(', ')}</li>
  <li>Geological extraction — ${GEO.join(', ')}</li>
  <li>Primary processing and basic industry</li>
  <li>Finished-goods manufacturing, joined by a parallel branch, Packaging manufacture</li>
  <li>Consumption and use — ${DEMAND.join(', ')}</li>
  <li>Recovery, whose output returns to processing or to primary production</li>
</ol>
<h3>Intermediary nodes — take title, transform nothing, record gross revenue</h3>
<ul><li>Aggregation</li><li>Trader / importer of intermediate goods</li><li>Brand owner / principal without a factory</li>
<li>Distributor, containing sub-distributors and regional agents</li><li>Wholesaler</li>
<li>Stock-holding retail — ${RETAIL.join(', ')}</li></ul>
<h3>Enabling layers — take no title, transform nothing, record net revenue</h3>
<ul>${STRATA.map((s) => `<li>${s.label}${s.note ? ` — ${s.note}` : ''}</li>`).join('')}
<li>Energy, drawn perpendicular into every stage rather than along the chain</li>
<li>External sector and the border, cutting across the chain at export, import and capital goods</li></ul>
<h3>Flows against the goods</h3>
<ul><li>Physical returns: commercial returns, reusable packaging, scrap and reject, post-consumer, and a secondary market and refurbishment loop inside use</li>
<li>Money, running right to left, attached at every transfer of title</li>
<li>Information: demand signal travelling back, specification and standard travelling forward</li>
<li>By-product, which leaves processing forward into another chain and is not a return</li></ul>
<h3>The same joints, read off the financial statements</h3>
<ul><li>Growth — value added: revenue less purchased inputs</li><li>Inflation — gross margin by stage and renegotiation lag</li>
<li>Monetary policy — DSO, DIO and DPO</li><li>Exchange rate — foreign-exchange gain and loss</li>
<li>External balance — export revenue, import cost and landed cost</li><li>Fiscal — output VAT less input VAT, and excise payable</li>
<li>Labour — labour inside cost of goods sold</li><li>Business cycle — inventory to sales</li></ul>`;

const html = `<title>The Chain at Two Distances</title>
<style>
:root{
  --paper:#E9ECE5; --paper-deep:#E0E4DA; --ink:#16202A; --ink-soft:#46534C;
  --ledger:#4F5A55; --rule:#BFC7BC; --accent:#A03E2B;
  --serif:"Iowan Old Style","Charter","Georgia","Times New Roman",serif;
  --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,"DejaVu Sans Mono",Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --paper:#12171A; --paper-deep:#1A2022; --ink:#E6EAE3; --ink-soft:#A9B3AC;
  --ledger:#94A096; --rule:#2B3335; --accent:#DE7357;
}}
:root[data-theme="dark"]{
  --paper:#12171A; --paper-deep:#1A2022; --ink:#E6EAE3; --ink-soft:#A9B3AC;
  --ledger:#94A096; --rule:#2B3335; --accent:#DE7357;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  min-height:100svh;display:flex;flex-direction:column;padding:16px 22px 12px;gap:10px}
header{display:flex;flex-direction:column;gap:4px;flex:0 0 auto}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(18px,1.85vw,24px);line-height:1.2;
  margin:0;max-width:40ch;text-wrap:balance;letter-spacing:-.005em}
h1 em{font-style:italic;color:var(--ledger)}
.props{font-family:var(--mono);font-size:10.5px;line-height:1.5;color:var(--ledger);margin:0}
figure{margin:0;flex:1 1 auto;display:flex;flex-direction:column;gap:6px;min-height:0}
.plate{display:block;margin:auto}
/* The wide plate fits its box in BOTH axes so the resting state is one screen. */
.plate--wide{width:100%;height:100%;min-height:0}
.plate--tall{width:100%;height:auto}
.plate--tall{display:none}
figcaption{font-family:var(--mono);font-size:10px;color:var(--ledger);line-height:1.5;flex:0 0 auto}

/* Far reading — the structure. */
.hull{fill:var(--paper-deep);stroke:none}
.stage rect{fill:var(--paper);stroke:var(--ink);stroke-width:1.4}
.stage--entry rect{fill:var(--ink);stroke:none}
.stage-t{font-size:14.5px;font-weight:600;fill:var(--ink);letter-spacing:-.005em}
.stage-t--rev{fill:var(--paper)}
.entry-bar{stroke:var(--ink);stroke-width:5;stroke-linecap:square}
.node rect{fill:none;stroke:var(--ink-soft);stroke-width:1;stroke-dasharray:3 2.5}
.node-t{font-size:12px;fill:var(--ink);font-weight:450}
.recur{font-size:10.5px;fill:var(--ink-soft)}
.lane-t{font-size:11.5px;fill:var(--ink-soft)}
.demand path{stroke:var(--ink);stroke-width:2}
.demand-t{font-size:11.5px;fill:var(--ink)}
.flow{fill:none;stroke:var(--ink-soft);stroke-width:1.2}
.flow-thin{fill:none;stroke:var(--ink-soft);stroke-width:.7}
.mk{fill:var(--ink-soft)}
.mk-acc{fill:var(--accent)}
.mk-soft{fill:var(--ink-soft)}

/* Enabling layers — strata, deliberately the lightest structure on the plate. */
.strat rect{fill:var(--paper-deep);stroke:none}
.strat-top{stroke:var(--rule);stroke-width:1}
.strat-t{font-size:11px;fill:var(--ink-soft);letter-spacing:.09em;text-transform:uppercase}
.strat-n{font-size:10.5px;fill:var(--ledger);font-family:var(--mono)}
.energy{fill:none;stroke:var(--ink-soft);stroke-width:1.2}
.energy-t{font-size:11px;fill:var(--ink-soft);letter-spacing:.09em;text-transform:uppercase}
.cut path{stroke:var(--ink-soft);stroke-width:1;stroke-dasharray:2 4}
.cut-chip{fill:var(--paper)}
.cut-t{font-size:10px;fill:var(--ink-soft);letter-spacing:.08em;text-transform:uppercase}

/* Against the goods — the one accent, spent only on counter-direction. */
.ret path{fill:none;stroke:var(--accent);stroke-width:1.1;stroke-dasharray:5 3;stroke-linejoin:round}
.ret-t{font-size:10px;fill:var(--accent);font-family:var(--mono)}
.np-money{fill:none;stroke:var(--accent);stroke-width:1.1}
.np-info{fill:none;stroke:var(--ink-soft);stroke-width:.7;stroke-dasharray:1.5 3}
.np-stem{fill:none;stroke:var(--rule);stroke-width:.7}
.np-t{font-size:10px;fill:var(--ledger);font-family:var(--mono)}
.byp path{fill:none;stroke:var(--ink-soft);stroke-width:1.1}
.byp-t{font-size:10px;fill:var(--ink-soft);font-family:var(--mono)}

/* Near reading — the ledger. Present at rest; leaning in only sharpens it. */
.macro{font-size:12px;fill:var(--ink);letter-spacing:.1em;text-transform:uppercase;font-weight:600}
.micro{font-size:11px;fill:var(--ledger);font-family:var(--mono)}
@media (hover:hover) and (pointer:fine){
  .joint .micro{transition:fill .18s ease}
  .joint:hover .micro{fill:var(--ink)}
}
@media (prefers-reduced-motion:reduce){.joint .micro{transition:none}}

@media (max-width:1000px){
  body{padding:14px 12px;min-height:0}
  .plate--wide{display:none}
  .plate--tall{display:block}
  figure{flex:0 0 auto}
}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
</style>

<header>
  <h1>An economy at arm's length. <em>A ledger up close.</em></h1>
  <p class="props">generic across sectors · the unit is the function, not the firm · descriptive, not normative</p>
</header>

<figure>
  ${wide()}
  ${tall()}${tallExtras()}
  <figcaption>One chain. Read far, it is an economy; read near, every joint is an accounting instrument.</figcaption>
</figure>

<div class="sr-only">${outline}</div>
`;

fs.writeFileSync(process.argv[2], html);

/* ── Component mode: the same two plates, as a repo component + scoped CSS. ── */
if (process.argv[3] === '--tsx') {
  const dir = process.argv[4];
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  // Prefix EVERY selector with the component root, so no rule here can reach
  // the global theme. A name list was tried first and leaked two selectors.
  const prefixLine = (line) => {
    const m = line.match(/^([^@}{][^{]*)\{(.*)$/);
    if (!m) return line;
    const out = m[1].split(',').map((sel) => {
      const t = sel.trim();
      if (!t || t.startsWith('.chain-plate') || t.startsWith('.dark')) return t;
      return `.chain-plate ${t}`;
    }).join(',');
    return `${m[1].match(/^\s*/)[0]}${out}{${m[2]}`;
  };
  const scoped = css
    .replace(/:root\{/, '.chain-plate{')
    .replace(/@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\)\{[\s\S]*?\}\}\n/, '')
    .replace(/:root\[data-theme="dark"\]\{/, '.dark .chain-plate{')
    .replace(/^\*\{box-sizing:border-box\}$/m, '')
    .replace(/^body\{margin:0;background/m, '.chain-plate{background')
    // In the app the plate sits under the site header, so its resting screen is
    // the viewport minus that chrome, not a second full viewport.
    .replace('min-height:100svh', 'min-height:calc(100svh - var(--chain-chrome, 4rem))')
    .replace(/^\.sr-only\{[\s\S]*?\}$/m, '')
    .replace(/^  body\{/m, '  .chain-plate{')
    .split('\n').map(prefixLine).join('\n');

  const jsx = (svg) => svg
    .replace(/ class=/g, ' className=')
    .replace(/ text-anchor=/g, ' textAnchor=')
    .replace(/ marker-end=/g, ' markerEnd=')
    .replace(/ stroke-width=/g, ' strokeWidth=');

  fs.writeFileSync(`${dir}/chain-plate.css`, `/**\n * The front-page plate. Scoped to .chain-plate so it never reaches the\n * global theme: the ledger palette lives on this component and nowhere else.\n * Generated — edit the generator, not this file.\n */\n${scoped.trim()}\n`);

  fs.writeFileSync(`${dir}/ChainPlate.tsx`, `/**
 * The front page, at two distances.
 *
 * Far, it reads as an economy running: an hourglass that narrows to primary
 * processing and widens after distribution. Near, every joint carries the
 * accounting instrument that measures it, set in the ledger's own register —
 * monospace, one step down. Neither reading is behind a control; the second
 * one is simply smaller, which is what "up close" means.
 *
 * Two plates, one content: the wide one lies on its side, the tall one stands
 * the hourglass upright for a narrow screen. CSS picks; both carry every node.
 * Generated by scratchpad/build.mjs — geometry is computed, not hand-placed.
 */
import './chain-plate.css';

export function ChainPlate() {
  return (
    <div className="chain-plate">
      <header>
        <h1>An economy at arm&rsquo;s length. <em>A ledger up close.</em></h1>
        <p className="props">generic across sectors &middot; the unit is the function, not the firm &middot; descriptive, not normative</p>
      </header>

      <figure>
        ${jsx(wide()).split('\n').join('\n        ')}
        ${jsx(tall()).split('\n').join('\n        ')}
        <figcaption>One chain. Read far, it is an economy; read near, every joint is an accounting instrument.</figcaption>
      </figure>

      <div className="sr-only">
        <ChainOutline />
      </div>
    </div>
  );
}

/** The same structure as prose, for a reader who cannot see the plate. */
function ChainOutline() {
  return (
    <>
      ${outline.trim().split('\n').join('\n      ')}
    </>
  );
}
`);
  console.log('written', dir + '/ChainPlate.tsx', 'and chain-plate.css');
}

console.log('written', process.argv[2], (html.length / 1024).toFixed(1) + ' KB');
