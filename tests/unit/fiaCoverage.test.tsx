/**
 * The coverage tracker (docs/prd/finance-restructure §1 B, §3, §4,
 * Acceptance: "Coverage tracker counts equal the registry's slate counts"):
 * counted from the live registry and the statuses fia.slate_progress serves.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
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
const { progress } = vi.hoisted(() => ({ progress: { current: new Map<string, string>() } }));
vi.mock('@/lib/finance-in-action/slateProgress', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/finance-in-action/slateProgress')>()),
  useSlateProgress: () => progress.current,
}));

import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { buildLiveRegistry } from '@/lib/finance-in-action/live';
import { coverageLine, coverageOf, type SlateStatus } from '@/lib/finance-in-action/coverage';
import { fetchSlateProgress } from '@/lib/finance-in-action/slateProgress';
import { FiaIndex } from '@/pages/finance-in-action/FiaIndex';
import slate from '@/data/finance-in-action/fixtures/slate.json';

const PKGS = (packages as { package: ModelPackage }[]).map((r) => r.package);
const coal = buildLiveRegistry(PKGS);
const none = buildLiveRegistry([]);
const of = (reg: typeof coal, code: string, p = new Map<string, SlateStatus>()) =>
  coverageOf(reg.companies.filter((c) => c.subIndustry === code), p);

afterEach(() => {
  progress.current = new Map();
  vi.unstubAllGlobals();
});

describe('coverageOf', () => {
  it('totals equal the slate’s count per sub-industry', () => {
    for (const code of ['A121', 'B121', 'J411']) {
      expect(of(none, code).total).toBe(slate.companies.filter((c) => c.subIndustry === code).length);
      expect(of(coal, code).total).toBe(slate.companies.filter((c) => c.subIndustry === code).length);
    }
  });

  it('counts a company with a published package as modelled, the rest by their slate status', () => {
    expect(coverageLine(of(coal, 'A121'))).toBe('4 of 4 modelled');
    const p = new Map<string, SlateStatus>([['INTP', 'queued'], ['SMGR', 'in_review'], ['ADRO', 'rejected']]);
    expect(coverageLine(of(coal, 'B121', p))).toBe('0 of 2 modelled · 1 queued · 1 in review');
    // A published company is modelled whatever the slate says.
    expect(coverageLine(of(coal, 'A121', p))).toBe('4 of 4 modelled');
    expect(coverageLine(of(none, 'J411'))).toBe('0 of 2 modelled · 2 not started');
  });

  it('lists the companies not modelled yet, by ticker, with their status', () => {
    const p = new Map<string, SlateStatus>([['SMGR', 'rejected']]);
    expect(of(coal, 'B121', p).pending.map((x) => `${x.company.ticker}:${x.status}`)).toEqual(['INTP:not_started', 'SMGR:rejected']);
  });
});

describe('fetchSlateProgress', () => {
  it('reads fia.slate_progress as anon and keeps only known statuses', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ ticker: 'INTP', status: 'queued' }, { ticker: 'X', status: 'published' }]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const got = await fetchSlateProgress('https://db.example', 'key');
    expect([...got]).toEqual([['INTP', 'queued']]);
    expect(fetchMock).toHaveBeenCalledWith('https://db.example/rest/v1/slate_progress?select=ticker,status', expect.objectContaining({ headers: expect.objectContaining({ 'Accept-Profile': 'fia' }) }));
  });

  it('a view not there yet (404) leaves every status unknown, so the tracker says not started', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"code":"PGRST106"}', { status: 404 })));
    expect((await fetchSlateProgress('https://db.example', 'key')).size).toBe(0);
  });
});

describe('the tracker on the index', () => {
  it('draws the line under each sub-industry, and the unmodelled names collapsed', async () => {
    progress.current = new Map([['INTP', 'queued']]);
    renderFiaPage(<FiaIndex useRegistry={() => ({ reg: coal, published: 'ok', failure: null, fixtures: false })} />, {
      path: '/finance/finance-in-action',
      url: '/finance/finance-in-action',
    });
    await screen.findByRole('heading', { level: 2, name: 'Company models' });
    const lines = [...document.querySelectorAll<HTMLElement>('[data-fia-coverage]')];
    expect(lines.map((l) => l.querySelector('p')?.textContent)).toEqual([
      '4 of 4 modelled',
      '0 of 2 modelled · 1 queued · 1 not started',
      '0 of 2 modelled · 2 not started',
    ]);
    const b121 = lines[1];
    expect(within(b121).getByText('Not modelled yet (2)').closest('details')).not.toHaveAttribute('open');
    expect(b121).toHaveTextContent('INTP Indocement Tunggal Prakarsa · queued');
  });
});
