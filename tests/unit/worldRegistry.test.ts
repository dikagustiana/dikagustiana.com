/**
 * The registry (mega prompt §5.4; PRD §8.1 invariants), checked on the real
 * source tables and the committed generated files:
 *
 *   - 35 sub-sectors, 69 industries, 130 sub-industries, 125 placed;
 *   - every chainNodeId exists in the chain data file;
 *   - every ticker is unique across the registry;
 *   - a confirmed company sits on an owner-placed sub-industry;
 *   - every link's endpoints exist and no link is measured without sources;
 *   - the generator is deterministic and idempotent: running it on the
 *     committed sources reproduces the committed generated files byte for
 *     byte, so any change to a placement shows up in review-registry.md;
 *   - the citation lock: a changed source without a changed citation fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAIN_IDS, EXPECTED, RegistryError, generate, type Sources } from '@/lib/world/registry/generate';
import { REGISTRY, SUB_INDUSTRIES } from '@/lib/world/registry/subindustries.generated';
import { LINKS } from '@/lib/world/registry/links.generated';
import { isMeasured } from '@/lib/finance-in-action/contract/links';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'docs/world/sources');
const read = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8');
const sources = (): Sources => ({
  classification: read('idx-ic-classification.tsv'),
  sectors: read('idx-ic-sectors.tsv'),
  subsektor: read('idx-ic-subsektor.tsv'),
  placement: read('placement.tsv'),
  companies: read('companies.tsv'),
  links: read('links.tsv'),
  issuersJson: read('issuers-snapshot.json'),
  citation: JSON.parse(read('citation.json')),
});

describe('the registry', () => {
  it('has 35 / 69 / 130 / 125', () => {
    const codes = SUB_INDUSTRIES.map((s) => s.code);
    expect(new Set(codes.map((c) => c.slice(0, 2))).size).toBe(EXPECTED.subSectors);
    expect(new Set(codes.map((c) => c.slice(0, 3))).size).toBe(EXPECTED.industries);
    expect(codes).toHaveLength(EXPECTED.subIndustries);
    expect(SUB_INDUSTRIES.filter((s) => s.zone !== 'unplaced')).toHaveLength(EXPECTED.placed);
    expect(SUB_INDUSTRIES.filter((s) => s.code.startsWith('Z')).every((s) => s.zone === 'unplaced')).toBe(true);
  });

  it('points every sub-industry at an id in the chain data file', () => {
    for (const s of SUB_INDUSTRIES) expect(CHAIN_IDS, `${s.code} → ${s.chainNodeId}`).toContain(s.chainNodeId);
  });

  it('never lists a ticker twice, and names at most two companies per sub-industry', () => {
    const tickers = SUB_INDUSTRIES.flatMap((s) => s.companies.map((c) => c.ticker));
    expect(new Set(tickers).size).toBe(tickers.length);
    for (const s of SUB_INDUSTRIES) expect(s.companies.length, s.code).toBeLessThanOrEqual(2);
  });

  it('carries the FSRE first slate on A121 and B121', () => {
    expect(SUB_INDUSTRIES.find((s) => s.code === 'A121')?.companies.map((c) => c.ticker)).toEqual(['PTBA', 'ITMG']);
    expect(SUB_INDUSTRIES.find((s) => s.code === 'B121')?.companies.map((c) => c.ticker)).toEqual(['INTP', 'SMGR']);
  });

  it('has every confirmed company on an owner-placed sub-industry, and every placement reviewed or proposed', () => {
    for (const s of SUB_INDUSTRIES) {
      expect(['owner', 'proposed']).toContain(s.review.placedBy);
      for (const c of s.companies) if (c.status === 'confirmed') expect(s.review.placedBy, `${c.ticker} on ${s.code}`).toBe('owner');
    }
  });

  it('links only existing sub-industries, all expected, none measured without sources', () => {
    const codes = new Set(SUB_INDUSTRIES.map((s) => s.code));
    for (const l of LINKS) {
      expect(codes.has(l.from) && codes.has(l.to), `${l.from} → ${l.to}`).toBe(true);
      expect(l.state).toBe('expected');
      // a link is measured only if cost share and demand share both have a source (contract constraint 10)
      if (l.state === 'measured') expect(isMeasured({ id: '', from: l.from, to: l.to, whatFlows: '', driverFrom: '', driverTo: '', intensity: null, passThrough: null,
        costShare: l.costShare ? { value: l.costShare.value, period: l.costShare.period, source: l.costShare.source } : null,
        demandShare: l.demandShare ? { value: l.demandShare.value, period: l.demandShare.period, source: l.demandShare.source } : null })).toBe(true);
    }
    expect(REGISTRY.links).toBe(LINKS);
  });

  it('exposes the two default rooms on and the two switchable rooms off', () => {
    expect(REGISTRY.rooms.filter((r) => r.on).map((r) => r.id)).toEqual(['next-big-thing', 'industry-analysis']);
    expect(REGISTRY.rooms.filter((r) => !r.on).map((r) => r.id)).toEqual(['green-transition', 'development-finance']);
  });

  it('is generated deterministically from the committed sources: the generated files match byte for byte', () => {
    const out = generate(sources());
    expect(out.files.subIndustriesTs).toBe(fs.readFileSync(path.join(ROOT, 'src/lib/world/registry/subindustries.generated.ts'), 'utf8'));
    expect(out.files.linksTs).toBe(fs.readFileSync(path.join(ROOT, 'src/lib/world/registry/links.generated.ts'), 'utf8'));
    expect(out.files.reviewMd).toBe(fs.readFileSync(path.join(ROOT, 'docs/world/review-registry.md'), 'utf8'));
    const again = generate(sources());
    expect(again.files).toEqual(out.files);
  });

  it('refuses a source that changed without its citation changing', () => {
    const s = sources();
    s.classification = s.classification.replace('Coal Production', 'Coal production');
    expect(() => generate(s)).toThrow(RegistryError);
    expect(() => generate(s)).toThrow(/citation/);
  });

  it('refuses a placement the owner has not written for every code, and a wrong count', () => {
    const s = sources();
    s.placement = s.placement.split('\n').filter((l) => !l.startsWith('E745\t')).join('\n');
    expect(() => generate(s)).toThrow(/E745|rows/);
  });
});
