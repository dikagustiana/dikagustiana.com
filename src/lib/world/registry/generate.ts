/**
 * The registry generator (mega prompt §5; PRD §8.1): reads the committed
 * source tables under docs/world/sources/ and writes the generated
 * constants and the review table. Pure: strings in, strings out, so the
 * unit tests run it on the real sources and the script only does the I/O.
 *
 * Rules it enforces:
 *   - the citation lock: the classification table and the issuer snapshot
 *     must hash to what citation.json records, so a source cannot change
 *     without its citation changing;
 *   - the counts: 35 sub-sectors, 69 industries, 130 sub-industries, 125
 *     outside Z, and the owner's table agrees;
 *   - every placement names a known zone, family, stage, archetype and a
 *     chain id that exists in src/data/industryChain.ts;
 *   - `placedBy` is copied, never flipped; a `confirmed` company needs an
 *     `owner` placement;
 *   - tickers are unique across the registry; link endpoints exist;
 *   - example pairs: the owner's companies.tsv first, then the two
 *     earliest-listed issuers of the sub-industry from the snapshot, marked
 *     proposed with the rule as the reason; a sub-industry absent from the
 *     snapshot gets "not yet counted" and no proposal.
 */
import { createHash } from 'node:crypto';
import { BANDS, BORDERS, BYPRODUCT, NODES, NON_PHYSICAL, RETAIL, RETAIL_GROUP, RETURNS, STAGES } from '../../../data/industryChain.ts';
import {
  ARCHETYPES, BUILDING_FAMILIES, CHAIN_STAGES, ZONES,
  type Archetype, type BuildingFamily, type ChainStage, type CompanyRef, type Link, type ListedCount, type Room, type SubIndustry, type Zone,
} from './types.ts';

export const EXPECTED = { subSectors: 35, industries: 69, subIndustries: 130, placed: 125 } as const;

/** The ids a sub-industry may hang on in the chain map. */
export const CHAIN_IDS: readonly string[] = [
  ...STAGES.map((s) => s.id), ...NODES.map((n) => n.id), RETAIL_GROUP.id, ...RETAIL.map((n) => n.id), ...BANDS.map((b) => b.id),
  ...BORDERS.map((b) => b.id), ...RETURNS.map((r) => r.id), BYPRODUCT.id, ...NON_PHYSICAL.map((f) => f.id),
];

/** The think-tank rooms (PRD §7.10): two on by default, two switchable here. */
export const ROOMS: readonly Room[] = [
  { id: 'next-big-thing', label: 'The Next Big Thing', section: 'next-big-thing', on: true },
  { id: 'industry-analysis', label: 'Industry analysis', section: null, on: true },
  { id: 'green-transition', label: 'The Green Transition', section: 'green-transition', on: false },
  { id: 'development-finance', label: 'Development Finance', section: 'development-finance', on: false },
];

export interface IssuerSnapshot {
  source: string;
  fetched: string;
  codes: Record<string, { ticker: string; name: string; ipo: string; founded: string }[]>;
}
export interface Citation {
  classification: { title: string; publisher: string; url: string; accessed: string; sha256: string; note?: string };
  issuers: { title: string; publisher: string; url: string; fetched: string; sha256: string; note?: string };
}
export interface Sources {
  classification: string;
  sectors: string;
  subsektor: string;
  placement: string;
  companies: string;
  links: string;
  issuersJson: string;
  citation: Citation;
}
export interface Generated {
  subIndustries: SubIndustry[];
  links: Link[];
  rooms: readonly Room[];
  counts: { subSectors: number; industries: number; subIndustries: number; placed: number; links: number; proposedPlacements: number; proposedCompanies: number; emptySlots: number };
  files: { subIndustriesTs: string; linksTs: string; reviewMd: string };
}

export class RegistryError extends Error {
  constructor(message: string) { super(message); this.name = 'RegistryError'; }
}

export const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

export function parseTsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  const head = lines[0].split('\t');
  return lines.slice(1).map((l) => { const cells = l.split('\t'); return Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? '').trim()])); });
}

const MONTHS: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6, Jul: 7, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12 };
/** "Des 05, 2024" → 20241205, for ordering; an unreadable date sorts last. */
export function ipoKey(s: string): number {
  const m = s.match(/^([A-Za-z]{3}) (\d{2}), (\d{4})$/);
  if (!m || !MONTHS[m[1]]) return Number.MAX_SAFE_INTEGER;
  return Number(m[3]) * 10000 + MONTHS[m[1]] * 100 + Number(m[2]);
}
/** "Des 05, 2024" → "5 December 2024", for the review table. */
export function ipoLabel(s: string): string {
  const m = s.match(/^([A-Za-z]{3}) (\d{2}), (\d{4})$/);
  const names = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return m && MONTHS[m[1]] ? `${Number(m[2])} ${names[MONTHS[m[1]]]} ${m[3]}` : s;
}

const is = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);

export function generate(src: Sources): Generated {
  // ---- the citation lock ----
  const clsHash = sha256(src.classification), issHash = sha256(src.issuersJson);
  if (clsHash !== src.citation.classification.sha256) throw new RegistryError(`the classification table changed without its citation changing (sha256 ${clsHash}, citation ${src.citation.classification.sha256})`);
  if (issHash !== src.citation.issuers.sha256) throw new RegistryError(`the issuer snapshot changed without its citation changing (sha256 ${issHash}, citation ${src.citation.issuers.sha256})`);
  for (const [k, c] of Object.entries(src.citation)) if (!c.title || !c.publisher || !c.url) throw new RegistryError(`citation ${k} is missing its title, publisher or url`);

  // ---- the classification ----
  const sectors = new Map(parseTsv(src.sectors).map((r) => [r.code, r]));
  const cls = parseTsv(src.classification);
  const codes = new Set(cls.map((r) => r.code));
  if (codes.size !== cls.length) throw new RegistryError('duplicate codes in the classification table');
  for (const r of cls) if (!/^[A-Z][1-9]\d{2}$/.test(r.code)) throw new RegistryError(`${r.code} is not an IDX-IC sub-industry code`);
  const subSectorCodes = new Set(cls.map((r) => r.code.slice(0, 2))), industryCodes = new Set(cls.map((r) => r.code.slice(0, 3)));
  const counts = { subSectors: subSectorCodes.size, industries: industryCodes.size, subIndustries: cls.length, placed: 0 };
  // the owner's table: sub-sector names and the counts it states
  const owner = parseTsv(src.subsektor);
  const subSectorNames = new Map<string, { nameId: string; nameEn: string; industries: number; subIndustries: number }>();
  for (const r of owner) {
    if (!/^[A-Z][1-9]$/.test(r.Kode)) continue;
    const [nameId, nameEn] = r['Sub-sektor'].split(' / ').map((s) => s.trim());
    subSectorNames.set(r.Kode, { nameId, nameEn: nameEn ?? nameId, industries: Number(r.Industri), subIndustries: Number(r['Sub-ind.']) });
  }
  if (subSectorNames.size !== EXPECTED.subSectors) throw new RegistryError(`the owner's table has ${subSectorNames.size} sub-sectors, expected ${EXPECTED.subSectors}`);
  for (const [ss, info] of subSectorNames) {
    const inCls = cls.filter((r) => r.code.startsWith(ss));
    const ind = new Set(inCls.map((r) => r.code.slice(0, 3))).size;
    if (inCls.length !== info.subIndustries || ind !== info.industries) throw new RegistryError(`${ss}: the owner's table says ${info.industries} industries / ${info.subIndustries} sub-industries, the classification has ${ind} / ${inCls.length}`);
  }

  // ---- placement ----
  const placement = new Map(parseTsv(src.placement).map((r) => [r.code, r]));
  if (placement.size !== cls.length) throw new RegistryError(`placement.tsv has ${placement.size} rows, the classification ${cls.length}`);
  for (const code of codes) if (!placement.has(code)) throw new RegistryError(`no placement for ${code}`);

  // ---- companies: the owner's file, then the snapshot's earliest-listed issuers ----
  const issuers: IssuerSnapshot = JSON.parse(src.issuersJson);
  const ownerCompanies = parseTsv(src.companies);
  const seenTickers = new Map<string, string>();
  const takeTicker = (ticker: string, code: string) => {
    const t = ticker.toUpperCase();
    const prev = seenTickers.get(t);
    if (prev && prev !== code) throw new RegistryError(`${t} appears in two sub-industries, ${prev} and ${code}`);
    seenTickers.set(t, code);
    return t;
  };

  const subIndustries: SubIndustry[] = [];
  let proposedPlacements = 0, proposedCompanies = 0, emptySlots = 0;
  for (const r of cls) {
    const p = placement.get(r.code)!;
    const zone = p.zone, family = p.buildingFamily, stage = p.chainStage, arche = p.archetypeFallback;
    if (!is(ZONES, zone)) throw new RegistryError(`${r.code}: unknown zone ${zone}`);
    if (!is(BUILDING_FAMILIES, family)) throw new RegistryError(`${r.code}: unknown building family ${family}`);
    if (!is(CHAIN_STAGES, stage)) throw new RegistryError(`${r.code}: unknown chain stage ${stage}`);
    if (!is(ARCHETYPES, arche)) throw new RegistryError(`${r.code}: unknown archetype ${arche}`);
    if (!CHAIN_IDS.includes(p.chainNodeId)) throw new RegistryError(`${r.code}: chainNodeId ${p.chainNodeId} is not in the chain data file`);
    if (p.placedBy !== 'owner' && p.placedBy !== 'proposed') throw new RegistryError(`${r.code}: placedBy must be owner or proposed`);
    if (p.placedBy === 'proposed') proposedPlacements++;
    if (zone !== 'unplaced') counts.placed++;
    const sector = sectors.get(r.code[0]), ss = subSectorNames.get(r.code.slice(0, 2));
    if (!sector || !ss) throw new RegistryError(`${r.code}: no sector or sub-sector name`);

    const listedRows = issuers.codes[r.code];
    const listed: ListedCount = listedRows
      ? { n: listedRows.length, source: `${src.citation.issuers.url} (${src.citation.issuers.publisher})`, asOf: src.citation.issuers.fetched }
      : { n: null, note: 'not yet counted' };

    const companies: CompanyRef[] = [];
    for (const c of ownerCompanies.filter((c) => c.code === r.code)) {
      if (c.status !== 'confirmed' && c.status !== 'proposed') throw new RegistryError(`${c.ticker}: status must be confirmed or proposed`);
      if (c.status === 'confirmed' && p.placedBy !== 'owner') throw new RegistryError(`${c.ticker} is confirmed but ${r.code}'s placement is not the owner's`);
      companies.push({ ticker: takeTicker(c.ticker, r.code), name: c.name, status: c.status, reason: c.reason, source: c.source });
    }
    if (listedRows) {
      const have = new Set(companies.map((c) => c.ticker));
      const inSnapshot = new Set(listedRows.map((x) => x.ticker.toUpperCase()));
      for (const c of companies) if (!inSnapshot.has(c.ticker)) throw new RegistryError(`${c.ticker} is listed in companies.tsv under ${r.code} but the issuer snapshot does not have it there`);
      const byIpo = [...listedRows].sort((a, b) => ipoKey(a.ipo) - ipoKey(b.ipo) || a.ticker.localeCompare(b.ticker));
      for (const x of byIpo) {
        if (companies.length >= 2) break;
        if (have.has(x.ticker.toUpperCase())) continue;
        companies.push({
          ticker: takeTicker(x.ticker, r.code), name: x.name || x.ticker, status: 'proposed',
          reason: `earliest-listed issuer in the sub-industry (IPO ${ipoLabel(x.ipo)}): the longest run of filings to model`,
          source: `${src.citation.issuers.url} (${src.citation.issuers.publisher}, fetched ${src.citation.issuers.fetched})`,
        });
        proposedCompanies++;
      }
    }
    emptySlots += Math.max(0, 2 - companies.length);

    subIndustries.push({
      code: r.code, nameId: r.nameId, nameEn: r.nameEn,
      sector: { code: r.code[0], name: sector.nameEn },
      subSector: { code: r.code.slice(0, 2), name: ss.nameEn },
      industry: { code: r.code.slice(0, 3), name: r.industryNameId },
      zone: zone as Zone, buildingFamily: family as BuildingFamily, chainStage: stage as ChainStage, chainNodeId: p.chainNodeId,
      listed, companies, archetypeFallback: arche as Archetype,
      review: { placedBy: p.placedBy, ...(p.note ? { note: p.note } : {}) },
    });
  }
  if (counts.subSectors !== EXPECTED.subSectors || counts.industries !== EXPECTED.industries || counts.subIndustries !== EXPECTED.subIndustries || counts.placed !== EXPECTED.placed) {
    throw new RegistryError(`counts are ${counts.subSectors} / ${counts.industries} / ${counts.subIndustries} / ${counts.placed}, expected ${EXPECTED.subSectors} / ${EXPECTED.industries} / ${EXPECTED.subIndustries} / ${EXPECTED.placed}`);
  }

  // ---- links: all expected, no weights ----
  const links: Link[] = [];
  const pairs = new Set<string>();
  for (const l of parseTsv(src.links)) {
    if (!codes.has(l.from) || !codes.has(l.to)) throw new RegistryError(`link ${l.from} → ${l.to}: unknown code`);
    if (l.from === l.to) throw new RegistryError(`link ${l.from} → ${l.to}: a sub-industry cannot feed itself`);
    const key = `${l.from}>${l.to}`;
    if (pairs.has(key)) throw new RegistryError(`link ${l.from} → ${l.to} is listed twice`);
    pairs.add(key);
    links.push({ from: l.from, to: l.to, state: 'expected', ...(l.note ? { note: l.note } : {}) });
  }

  const all = { subSectors: counts.subSectors, industries: counts.industries, subIndustries: counts.subIndustries, placed: counts.placed, links: links.length, proposedPlacements, proposedCompanies, emptySlots };
  return {
    subIndustries, links, rooms: ROOMS, counts: all,
    files: {
      subIndustriesTs: renderSubIndustriesTs(subIndustries, src.citation, clsHash),
      linksTs: renderLinksTs(links),
      reviewMd: renderReview(subIndustries, links, all, src.citation),
    },
  };
}

const GENERATED = '// GENERATED by scripts/world/build-registry.ts from docs/world/sources/ — do not edit by hand; edit the source tables and regenerate.';

function renderSubIndustriesTs(rows: SubIndustry[], citation: Citation, clsHash: string): string {
  return `${GENERATED}
/**
 * The 130 IDX-IC sub-industries with their place in the world (PRD §8.1).
 * Source: ${citation.classification.title}, ${citation.classification.publisher}, ${citation.classification.url}
 * (accessed ${citation.classification.accessed}; the committed table hashes to ${clsHash}).
 * Listed-issuer counts and the proposed example pairs: ${citation.issuers.title}, ${citation.issuers.publisher},
 * fetched ${citation.issuers.fetched}. Every placement and pair carries its review state; the generator never
 * changes \`review.placedBy\`, the owner does, in docs/world/sources/placement.tsv.
 */
import type { Registry, SubIndustry } from './types.ts';
import { LINKS } from './links.generated';

export const SUB_INDUSTRIES: readonly SubIndustry[] = ${JSON.stringify(rows, null, 2)};

export const REGISTRY_SOURCE: Registry['source'] = ${JSON.stringify({ title: citation.classification.title, publisher: citation.classification.publisher, url: citation.classification.url, sha256: clsHash }, null, 2)};

export const subIndustryByCode = (code: string): SubIndustry | undefined => SUB_INDUSTRIES.find((s) => s.code === code);

/** The registry as scene and shell code read it. */
export const REGISTRY: Registry = {
  subIndustries: SUB_INDUSTRIES,
  links: LINKS,
  rooms: ${JSON.stringify(ROOMS, null, 2)},
  source: REGISTRY_SOURCE,
};
`;
}

function renderLinksTs(links: Link[]): string {
  return `${GENERATED}
/**
 * The expected links between sub-industries (PRD §8.4): supplier → customer,
 * with a one-line rationale and no weights. Every link here is
 * \`state: 'expected'\`. AT RUNTIME A PUBLISHED PACKAGE WINS: when a model
 * package in fsre_published carries measured weights for a link (cost share
 * and demand share, both sourced), src/world/data/boundary.ts overrides this
 * entry with the measured state and class, and the registry is updated at
 * the next review. Nothing here is ever drawn as a figure.
 */
import type { Link } from './types.ts';

export const LINKS: readonly Link[] = ${JSON.stringify(links, null, 2)};

export const linksFrom = (code: string): Link[] => LINKS.filter((l) => l.from === code);
export const linksTo = (code: string): Link[] => LINKS.filter((l) => l.to === code);
`;
}

function renderReview(rows: SubIndustry[], links: Link[], counts: Generated['counts'], citation: Citation): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  const company = (c: CompanyRef) => `${c.ticker} (${c.status})`;
  const lines: string[] = [];
  lines.push('# Registry review', '', GENERATED.replace('// ', '').replace(' — do not edit by hand; edit the source tables and regenerate.', '. Do not edit by hand: edit the source tables and regenerate.'), '');
  lines.push(`Counts: ${counts.subSectors} sub-sectors · ${counts.industries} industries · ${counts.subIndustries} sub-industries · ${counts.placed} placed · ${counts.links} expected links.`);
  lines.push(`Review state: ${counts.proposedPlacements} placements proposed (${counts.subIndustries - counts.proposedPlacements} by the owner) · ${counts.proposedCompanies} companies proposed by the earliest-listed rule · ${counts.emptySlots} slots not yet proposed.`, '');
  lines.push(`Sources: ${citation.classification.title} (${citation.classification.publisher}, accessed ${citation.classification.accessed}); issuer lists from ${citation.issuers.title} (${citation.issuers.publisher}, fetched ${citation.issuers.fetched}).`, '');
  lines.push('To change a placement or a pair, edit `docs/world/sources/placement.tsv` or `companies.tsv` and run `npm run build:registry`; set `placedBy` to `owner` to mark a placement reviewed.', '');
  lines.push('## Placements', '', '| Code | Sub-industry | Zone | Family | Stage · chain id | Archetype | Listed | Companies | Review | Note |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const s of rows) {
    const listed = s.listed.n === null ? 'not yet counted' : String(s.listed.n);
    const comps = s.companies.length ? s.companies.map(company).join(', ') : 'not yet proposed';
    const slots = s.companies.length < 2 && s.listed.n !== null && s.listed.n > 0 ? ` · ${2 - s.companies.length} slot not yet proposed` : '';
    lines.push(`| ${s.code} | ${esc(s.nameEn)} | ${s.zone} | ${s.buildingFamily} | ${s.chainStage} · ${s.chainNodeId} | ${s.archetypeFallback} | ${listed} | ${esc(comps)}${slots} | ${s.review.placedBy} | ${esc(s.review.note ?? '')} |`);
  }
  lines.push('', '## Proposed pairs: the reason for each', '', '| Code | Ticker | Name | Status | Reason | Source |', '|---|---|---|---|---|---|');
  for (const s of rows) for (const c of s.companies) lines.push(`| ${s.code} | ${c.ticker} | ${esc(c.name)} | ${c.status} | ${esc(c.reason ?? '')} | ${esc(c.source ?? '')} |`);
  lines.push('', '## Expected links', '', '| From | To | State | Rationale |', '|---|---|---|---|');
  for (const l of links) lines.push(`| ${l.from} | ${l.to} | ${l.state} | ${esc(l.note ?? '')} |`);
  lines.push('');
  return lines.join('\n');
}
