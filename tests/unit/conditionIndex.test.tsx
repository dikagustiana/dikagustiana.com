/**
 * Condition ↔ company (docs/prd/finance-restructure §4 Tests) over the four
 * coal packages fia.model_packages returned on 2026-10-24 (ADRO, INDY, ITMG,
 * PTBA; tests/e2e/fixtures/fia-published-coal.packages.json), built into the
 * live registry as production builds it; and subsection A of the index drawn
 * from it.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import packages from '../e2e/fixtures/fia-published-coal.packages.json';
import { renderFiaPage } from './helpers/renderFiaPage';
import { makeQueryResult } from './helpers/renderWithProviders';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => makeQueryResult([]),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));

import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { buildLiveRegistry } from '@/lib/finance-in-action/live';
import { companiesByCondition, companiesFor, moduleChip } from '@/lib/finance-in-action/conditionIndex';
import { CONDITIONS } from '@/data/capitalConditions';
import { COPY } from '@/lib/finance-in-action/copy';
import { FiaIndex } from '@/pages/finance-in-action/FiaIndex';
import type { RegistryState } from '@/lib/finance-in-action/registryState';

const PKGS = (packages as { package: ModelPackage }[]).map((r) => r.package);
const reg = buildLiveRegistry(PKGS);
const index = companiesByCondition(reg);
const tickers = (n: number) => companiesFor(index, n).map((c) => c.ticker);
const conditionsOf = (ticker: string) => CONDITIONS.filter((c) => tickers(c.number).includes(ticker)).map((c) => c.number);

describe('companiesByCondition', () => {
  it('builds the registry from the four packages, all accepted', () => {
    expect(reg.rejected).toEqual([]);
    expect(reg.packages.map((p) => p.meta.ticker).sort()).toEqual(['ADRO', 'INDY', 'ITMG', 'PTBA']);
  });

  it('ADRO → {3, 9}; PTBA, ITMG, INDY as their conditionIds say', () => {
    expect(conditionsOf('ADRO')).toEqual([3, 9]);
    for (const p of PKGS) expect(conditionsOf(p.meta.ticker)).toEqual([...p.meta.conditionIds].sort((a, b) => a - b));
    expect(conditionsOf('PTBA')).toEqual([3]);
    expect(conditionsOf('ITMG')).toEqual([3]);
    expect(conditionsOf('INDY')).toEqual([3, 8]);
  });

  it('lists each condition’s companies by ticker', () => {
    expect(tickers(3)).toEqual(['ADRO', 'INDY', 'ITMG', 'PTBA']);
    expect(tickers(9)).toEqual(['ADRO']);
  });

  it('a condition with no package → an empty array, not undefined', () => {
    expect(index.get(21)).toEqual([]);
    expect(companiesFor(index, 21)).toEqual([]);
    expect(index.size).toBe(21);
  });

  it('counts published companies only: the slate’s planned companies are not tagged', () => {
    // BREN, SMGR, … are on the slate with conditionIds but have no package here.
    expect(tickers(4)).toEqual([]);
    expect(tickers(1)).toEqual([]);
  });

  it('writes a module chip as the PRD does', () => {
    expect(moduleChip('t1-m14b')).toBe('T1 · M14B');
  });
});

describe('the index, subsection A then B', () => {
  const useRegistry = (): RegistryState => ({ reg, published: 'ok', failure: null, fixtures: false });
  const render = () => renderFiaPage(<FiaIndex useRegistry={useRegistry} />, { path: '/finance/finance-in-action', url: '/finance/finance-in-action' });

  it('stacks Capital in Motion above Company models, both on one page', async () => {
    render();
    const a = await screen.findByRole('heading', { level: 2, name: COPY.capitalInMotion });
    const b = screen.getByRole('heading', { level: 2, name: COPY.companyModels });
    expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lists all 21 conditions; 03 carries the four coal tickers as links, 09 ADRO alone', async () => {
    render();
    await screen.findByRole('heading', { level: 2, name: COPY.capitalInMotion });
    const rows = document.querySelectorAll('[data-fia-conditions] > li');
    expect(rows).toHaveLength(21);
    const row = (n: number) => document.querySelector<HTMLElement>(`[data-condition="${n}"]`)!;
    const chips = within(within(row(3)).getByRole('list', { name: 'Companies' })).getAllByRole('link');
    expect(chips.map((a) => a.textContent)).toEqual(['ADRO', 'INDY', 'ITMG', 'PTBA']);
    expect(chips[0]).toHaveAttribute('href', '/finance/finance-in-action/adro');
    expect(within(row(9)).getByRole('link', { name: 'ADRO' })).toBeInTheDocument();
  });

  it('says "No company tagged yet" where none is, and draws no module row while modules are empty', async () => {
    render();
    await screen.findByRole('heading', { level: 2, name: COPY.capitalInMotion });
    const row21 = document.querySelector<HTMLElement>('[data-condition="21"]')!;
    expect(within(row21).getByText(COPY.noCompanyTagged)).toBeInTheDocument();
    expect(within(row21).queryByRole('list', { name: 'Modules' })).toBeNull();
    expect(within(row21).getByRole('link', { name: CONDITIONS.find((c) => c.number === 21)!.title })).toHaveAttribute(
      'href',
      '/finance/finance-in-action/capital-in-motion/structural-sequencing',
    );
  });
});
