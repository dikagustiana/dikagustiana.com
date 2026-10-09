/**
 * Builds the world's registry from the committed source tables.
 *
 *   node --experimental-strip-types scripts/world/build-registry.ts   (npm run build:registry)
 *
 * Reads docs/world/sources/{idx-ic-classification.tsv, idx-ic-sectors.tsv,
 * idx-ic-subsektor.tsv, placement.tsv, companies.tsv, links.tsv,
 * issuers-snapshot.json, citation.json}; writes
 * src/lib/world/registry/subindustries.generated.ts, links.generated.ts and
 * docs/world/review-registry.md. Deterministic and idempotent: running it
 * twice changes nothing. Fails on a missing citation, a changed source, or
 * counts other than 35 / 69 / 130 / 125 (src/lib/world/registry/generate.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, RegistryError } from '../../src/lib/world/registry/generate.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'docs/world/sources');
const read = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8');

try {
  const out = generate({
    classification: read('idx-ic-classification.tsv'),
    sectors: read('idx-ic-sectors.tsv'),
    subsektor: read('idx-ic-subsektor.tsv'),
    placement: read('placement.tsv'),
    companies: read('companies.tsv'),
    links: read('links.tsv'),
    issuersJson: read('issuers-snapshot.json'),
    citation: JSON.parse(read('citation.json')),
  });
  const targets: [string, string][] = [
    ['src/lib/world/registry/subindustries.generated.ts', out.files.subIndustriesTs],
    ['src/lib/world/registry/links.generated.ts', out.files.linksTs],
    ['docs/world/review-registry.md', out.files.reviewMd],
  ];
  let changed = 0;
  for (const [rel, content] of targets) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === content) continue;
    fs.writeFileSync(p, content); changed++;
  }
  const c = out.counts;
  console.log(`build-registry: ${c.subSectors} / ${c.industries} / ${c.subIndustries} / ${c.placed} · ${c.links} links · ${c.proposedPlacements} placements proposed · ${c.proposedCompanies} companies proposed · ${c.emptySlots} slots empty · ${changed} file(s) written`);
} catch (e) {
  if (e instanceof RegistryError) { console.error(`build-registry: ${e.message}`); process.exit(1); }
  throw e;
}
