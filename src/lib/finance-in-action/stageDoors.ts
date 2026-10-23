/**
 * The homepage chain map's doors into Finance in Action (chain view,
 * PROMPT-site §3.7, K6): for every stage with companies on the slate, where
 * its box goes, the small label it carries and the link's name. The counts are
 * positionCounts, the same numbers as the index's stage pills; the address is
 * positionPath, the same anchor as the index's sections.
 */
import type { StageModels } from '@/components/industry-chain/chainModelsContext';
import { CHAIN_STAGES } from './chain';
import { positionCounts } from './counts';
import { formatNumber } from './format';
import type { Registry } from './registry';
import { positionPath } from './routes';

const plural = (n: number, word: string) => `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;

export function stageDoors(reg: Registry): Map<string, StageModels> {
  const counts = positionCounts(reg);
  const out = new Map<string, StageModels>();
  for (const stage of CHAIN_STAGES) {
    const c = counts.get(stage.id);
    if (!c || !c.companies) continue;
    const text = c.published ? plural(c.published, 'model') : 'planned';
    out.set(stage.id, {
      href: positionPath(stage.id),
      text,
      name: `${stage.label}: ${plural(c.companies, 'company model')} in Finance in Action, ${c.published ? `${formatNumber(c.published)} published` : 'planned'}`,
    });
  }
  return out;
}
