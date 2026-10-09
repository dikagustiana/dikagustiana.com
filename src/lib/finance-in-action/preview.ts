/**
 * The preview's data: the SYNTHETIC fixtures, the slate and the registers.
 *
 * Only the preview pages import this module, and App.tsx imports those only
 * when __FIA_PREVIEW__ is true, so with the flag unset none of it is bundled
 * (constraint 3; scripts/assert-no-synthetic.mjs checks dist/).
 */
import type { ModelPackage } from './contract/types';
import type { IndustryLink } from './contract/links';
import { buildRegistry, type Registry, type SlateEntry, type SubIndustry } from './registry';
import links from '@/data/finance-in-action/links.json';
import subIndustries from '@/data/finance-in-action/sub-industries.json';
import slate from '@/data/finance-in-action/fixtures/slate.json';
import syntheticLinks from '@/data/finance-in-action/fixtures/links.SYNTHETIC.json';
import syntheticSubIndustries from '@/data/finance-in-action/fixtures/sub-industries.SYNTHETIC.json';

const packageModules = import.meta.glob<ModelPackage>('/src/data/finance-in-action/fixtures/*.SYNTHETIC.json', {
  eager: true,
  import: 'default',
});

const isPackage = (x: unknown): x is ModelPackage => !!x && typeof x === 'object' && 'meta' in x && 'sheets' in x;

let registry: Registry | null = null;

/** The preview's registry: the SYNTHETIC fixtures, plus any package the owner has published. */
export function buildPreviewRegistry(published: ModelPackage[] = []): Registry {
  return buildRegistry({
    packages: [...Object.values(packageModules).filter(isPackage), ...published],
    slate: slate.companies as SlateEntry[],
    subIndustries: [...subIndustries, ...syntheticSubIndustries] as SubIndustry[],
    links: [...links, ...syntheticLinks] as IndustryLink[],
  }, { requireListedSubIndustry: true });
}

/** The fixtures alone, built once. */
export function previewRegistry(): Registry {
  registry ??= buildPreviewRegistry();
  return registry;
}
