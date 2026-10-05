/**
 * The essay→chain link (WO-09, docs/review/09-plan.md): only modules the
 * owner has pinned in chainCurriculumMap get a link, at the finance
 * distance; everything else gets none. An honest absence beats a wrong
 * placement — the mapping table's own header is the rule this enforces.
 */
import { describe, it, expect } from 'vitest';
import { chainLinkForModule } from '@/lib/chainLink';
import { CHAIN_MODULE_LINKS } from '@/data/chainCurriculumMap';

describe('chainLinkForModule', () => {
  it('links a module the owner pinned to the chain, at the finance distance', () => {
    const pinned = CHAIN_MODULE_LINKS.find(l => l.moduleClass === 'chain-located');
    expect(pinned).toBeTruthy();
    const link = chainLinkForModule(pinned!.moduleSlug);
    expect(link).toEqual({ label: 'View this on the industry chain', path: '/?distance=finance' });
  });

  it('returns null for an unpinned module, a null slug, and nothing at all', () => {
    expect(chainLinkForModule('some-unmapped-module')).toBeNull();
    expect(chainLinkForModule(null)).toBeNull();
    expect(chainLinkForModule(undefined)).toBeNull();
  });
});
