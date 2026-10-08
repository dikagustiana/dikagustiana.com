/**
 * The data boundary (PRD §9.3.4; mega prompt §8): the only module under
 * src/world/ that imports the Finance in Action data layer. Scene code
 * receives statuses, flow classes and station bindings and nothing else; a
 * figure with a currency or a unit never crosses this line. Cards and the
 * board read packages from the data layer directly through the shell.
 *
 * Fetch policy (PRD §8.3): one request for the published index at world
 * load. The site's read path returns every published package in that one
 * request (src/lib/finance-in-action/published.ts selects the package
 * column), so no second request per company is needed; the shell caches the
 * result for the session with react-query under the same key the Finance in
 * Action preview uses.
 *
 * Outage versus absence: a failed index request yields 'unavailable' for
 * every company the registry names, never 'none'.
 */
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { isMeasured } from '@/lib/finance-in-action/contract/links';
import { buildRegistry, type Registry as FiaRegistry } from '@/lib/finance-in-action/registry';
import { fetchPublishedPackages, PUBLISHED_QUERY_KEY } from '@/lib/finance-in-action/published';
import fiaSubIndustries from '@/data/finance-in-action/sub-industries.json';
import fiaLinks from '@/data/finance-in-action/links.json';
import type { IndustryLink } from '@/lib/finance-in-action/contract/links';
import type { SubIndustry as FiaSubIndustry } from '@/lib/finance-in-action/registry';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import type { Archetype } from '@/lib/world/registry/types';
import type { FlowWeight, ModelStatus, StationBinding } from './types';

export { PUBLISHED_QUERY_KEY };

/** The published packages, validated by the data layer's own checks, as a Finance in Action registry. */
export async function loadPublished(): Promise<FiaRegistry> {
  const packages = await fetchPublishedPackages();
  return buildRegistry({ packages, slate: [], subIndustries: fiaSubIndustries as FiaSubIndustry[], links: fiaLinks as IndustryLink[] });
}

/** Every ticker the world registry names, with its model status. */
export function statusesFrom(reg: FiaRegistry | null, outage: boolean): Map<string, ModelStatus> {
  const out = new Map<string, ModelStatus>();
  for (const s of REGISTRY.subIndustries) for (const c of s.companies) {
    if (outage || !reg) { out.set(c.ticker, { ticker: c.ticker, state: 'unavailable' }); continue; }
    const pkg = reg.packages.find((p) => p.meta.ticker.toUpperCase() === c.ticker.toUpperCase() && p.meta.status === 'published');
    out.set(c.ticker, pkg ? { ticker: c.ticker, state: 'published', period: pkg.meta.asOf.latestQuarter, packageVersion: pkg.meta.version, archetype: archetypeOf(pkg) } : { ticker: c.ticker, state: 'none' });
  }
  return out;
}

/** The archetype a package names, if the contract carries it (proposal pending); else undefined and the zone's fallback applies. */
export function archetypeOf(pkg: ModelPackage): Archetype | undefined {
  const named = (pkg.meta as { archetype?: string }).archetype;
  const m = named?.match(/^(?:ARC-)?(PROC|DIST|ASSET|MINE|FARM|SERVICE)$/i);
  return m ? (m[1].toUpperCase() as Archetype) : undefined;
}

/** Flow classes for the links the data layer measures; everything else stays expected. */
export function flowsFrom(reg: FiaRegistry | null): FlowWeight[] {
  if (!reg) return [];
  return reg.links.map((l) => ({ from: l.from, to: l.to, cls: isMeasured(l) ? ((l.costShare?.value ?? 0) >= 0.2 ? 'measured-heavy' : 'measured-light') : 'expected' }));
}

export function packageFor(reg: FiaRegistry | null, ticker: string): ModelPackage | null {
  return reg?.packages.find((p) => p.meta.ticker.toUpperCase() === ticker.toUpperCase() && p.meta.status === 'published') ?? null;
}

/** Scene code receives labels, never figures: the line's label and its station. Matching is Phase G's (physical-units.ts). */
export function bindingsFrom(pkg: ModelPackage, match: (physicalUnit: string, description: string) => string | null): StationBinding[] {
  return pkg.unitEconomics.lines.filter((l) => l.role === 'cost' && l.driver).map((l) => ({ lineId: l.id, label: l.label, stationId: match(l.driver!.physicalUnit, l.driver!.description) }));
}
