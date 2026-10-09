/**
 * The production section's data: published packages only (PRD "FSRE publish
 * path" §6.3 A), with the slate, the sub-industries and the link register.
 *
 * This module imports NO fixture: with VITE_FIA_LIVE=true and VITE_FIA_PREVIEW
 * unset, App.tsx reaches the pages through FiaLiveIndexPage and
 * FiaLiveModelRoute, which read the registry from here, and preview.ts (the
 * SYNTHETIC glob) is never part of the bundle. scripts/assert-no-synthetic.mjs
 * checks dist/ for the marker after every such build.
 *
 * A package whose provenance is not `filings` is refused here, listed under
 * `rejected` with its reason, and never drawn: production shows models built
 * from filings and nothing else, whatever the database holds.
 */
import type { ModelPackage } from './contract/types';
import type { IndustryLink } from './contract/links';
import type { Provenance } from './constants';
import { buildRegistry, type Registry, type SlateEntry, type SubIndustry } from './registry';
import links from '@/data/finance-in-action/links.json';
import subIndustries from '@/data/finance-in-action/sub-industries.json';
import slate from '@/data/finance-in-action/fixtures/slate.json';

/** The one provenance production accepts. */
export const PRODUCTION_PROVENANCE: Provenance = 'filings';

/** The published packages, those from filings listed and the rest refused with the reason, over the real lists. */
export function buildLiveRegistry(published: ModelPackage[] = []): Registry {
  const accepted = published.filter((p) => p.meta.provenance === PRODUCTION_PROVENANCE);
  const refused = published.filter((p) => p.meta.provenance !== PRODUCTION_PROVENANCE);
  const reg = buildRegistry({
    packages: accepted,
    slate: slate.companies as SlateEntry[],
    subIndustries: subIndustries as SubIndustry[],
    links: links as IndustryLink[],
  }, { requireListedSubIndustry: true });
  return {
    ...reg,
    rejected: [
      ...refused.map((p) => ({
        ticker: p.meta.ticker,
        issues: [{ path: 'meta.provenance', message: `${p.meta.provenance} is not ${PRODUCTION_PROVENANCE}; production shows models built from filings only` }],
      })),
      ...reg.rejected,
    ],
  };
}
