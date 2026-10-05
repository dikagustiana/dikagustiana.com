/**
 * The essay→chain direction of the site's architecture.
 *
 * The chain map's URL contract (useChainUrl.ts) exists so "an essay can link
 * straight into the reading it is arguing from" — but which reading an essay
 * argues from is DATA, decided by the owner in chainCurriculumMap.ts, never
 * guessed from titles (a module linked to the wrong joint does more damage
 * than a joint with no module). This helper turns that table into the one
 * link an essay page may render: only modules the owner has pinned to the
 * chain get a link, at the finance distance; everything else gets none,
 * because an honest absence beats a wrong placement.
 */
import { CHAIN_MODULE_LINKS } from '@/data/chainCurriculumMap';

export interface ChainLink {
  label: string;
  path: string;
}

export function chainLinkForModule(moduleSlug: string | null | undefined): ChainLink | null {
  if (!moduleSlug) return null;
  const link = CHAIN_MODULE_LINKS.find(l => l.moduleSlug === moduleSlug);
  if (!link) return null;
  return { label: 'View this on the industry chain', path: '/?distance=finance' };
}
