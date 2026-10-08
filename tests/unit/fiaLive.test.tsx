/**
 * Finance in Action in production (PRD "FSRE publish path" §6.3 A and B):
 * the published-only registry, the provenance rule, the three failures a
 * read can be, the index over the slate when nothing is published, and the
 * proof that the live page modules import no fixture. The package used is
 * the suite's SYNTHETIC golden case relabelled, which is exactly what the
 * live registry must refuse.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { makeQueryResult } from './helpers/renderWithProviders';
import { renderFiaPage } from './helpers/renderFiaPage';
import published from './fixtures/SYNP.SYNTHETIC.published-package.json';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { classifyFailure, failureOf, fetchPublishedPackages, PublishedReadError } from '@/lib/finance-in-action/published';
import { buildLiveRegistry, PRODUCTION_PROVENANCE } from '@/lib/finance-in-action/live';
import { FIA_LIVE } from '@/lib/finance-in-action/flag';
import { COPY } from '@/lib/finance-in-action/copy';
import slate from '@/data/finance-in-action/fixtures/slate.json';
import FiaLiveIndexPage from '@/pages/finance-in-action/FiaLiveIndexPage';
import FiaLiveModelRoute from '@/pages/finance-in-action/FiaLiveModelRoute';

const SYNTHETIC_PKG = published as unknown as ModelPackage;
/**
 * The same package as a filings one, in a real sub-industry (B121, the stage
 * the package names): what a real approval looks like to the registry. The
 * figures stay the golden case's round synthetic numbers.
 */
const FILINGS_PKG: ModelPackage = { ...SYNTHETIC_PKG, meta: { ...SYNTHETIC_PKG.meta, provenance: 'filings', subIndustry: 'B121' } };
const INDEX = '/finance/finance-in-action';
const MODEL = '/finance/finance-in-action/:modelSlug';

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.test');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const answer = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe('the live flag', () => {
  it('is off in tests, as the preview flag is', () => {
    expect(FIA_LIVE).toBe(false);
  });
});

describe('the three failures a read can be', () => {
  it.each([
    [404, { message: 'not found' }, 'not-available'],
    [400, { code: 'PGRST106', message: 'The schema must be one of the following: public' }, 'not-available'],
    [404, { code: '42P01', message: 'relation does not exist' }, 'not-available'],
    [401, { message: 'Invalid API key' }, 'refused'],
    [403, { code: '42501', message: 'permission denied' }, 'refused'],
    [500, null, 'failed'],
    [503, { code: 'XX000' }, 'failed'],
  ] as const)('%i %j is %s', (status, body, reason) => {
    expect(classifyFailure(status, body)).toBe(reason);
  });

  it('is raised by the read with its reason, and read back by failureOf', async () => {
    answer(400, { code: 'PGRST106' });
    const error = await fetchPublishedPackages().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PublishedReadError);
    expect(failureOf(error)).toEqual({ reason: 'not-available', detail: 'published models answered 400 (not-available)' });
    expect(failureOf(new Error('offline'))).toEqual({ reason: 'failed', detail: 'offline' });
  });
});

describe('the live registry', () => {
  it('lists a package from filings, with no fixture beside it, and the slate as planned', () => {
    const reg = buildLiveRegistry([FILINGS_PKG]);
    expect(reg.rejected).toEqual([]);
    expect(reg.company('SYNP')?.status).toBe('published');
    expect(reg.companies.some((c) => c.synthetic)).toBe(false);
    expect(reg.companies.some((c) => c.ticker === 'XCEM' || c.ticker === 'XCOA')).toBe(false);
    for (const planned of slate.companies) expect(reg.company(planned.ticker)?.status).toBe('not_started');
  });

  it('refuses a package whose provenance is not filings, listing it under rejected and drawing nothing', () => {
    const reg = buildLiveRegistry([SYNTHETIC_PKG]);
    expect(reg.company('SYNP')).toBeUndefined();
    expect(reg.rejected).toEqual([{ ticker: 'SYNP', issues: [{ path: 'meta.provenance', message: expect.stringContaining(`is not ${PRODUCTION_PROVENANCE}`) }] }]);
    expect(reg.packages).toEqual([]);
  });

  it('still runs the contract and formula checks on a filings package', () => {
    const broken = { ...FILINGS_PKG, meta: { ...FILINGS_PKG.meta, chainStage: 'nowhere' } };
    const reg = buildLiveRegistry([broken]);
    expect(reg.rejected.map((r) => r.ticker)).toEqual(['SYNP']);
    expect(reg.rejected[0].issues.some((i) => i.path === 'meta.chainStage')).toBe(true);
  });

  it('is the slate alone with nothing published', () => {
    const reg = buildLiveRegistry();
    expect(reg.packages).toEqual([]);
    expect(reg.companies.map((c) => c.ticker).sort()).toEqual(slate.companies.map((c) => c.ticker).sort());
  });
});

describe('the production index', () => {
  it('draws the slate as planned with nothing published, and nothing synthetic anywhere', async () => {
    answer(200, []);
    renderFiaPage(<FiaLiveIndexPage />, { path: INDEX, url: INDEX });
    expect(await screen.findByRole('heading', { level: 1, name: COPY.title })).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument(); // no SYNTHETIC banner
    expect(document.body.textContent).not.toMatch(/SYNTHETIC|XCOA|XCEM|Example Coal|Example Cement/);
    for (const planned of slate.companies) expect(screen.getAllByText(new RegExp(planned.ticker)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('draws a published filings package', async () => {
    answer(200, [{ package: FILINGS_PKG }]);
    renderFiaPage(<FiaLiveIndexPage />, { path: INDEX, url: INDEX });
    expect(await screen.findByText(/Synthetic Process Co/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses a published package that is not from filings, and says so', async () => {
    answer(200, [{ package: SYNTHETIC_PKG }]);
    renderFiaPage(<FiaLiveIndexPage />, { path: INDEX, url: INDEX });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/SYNP.*meta\.provenance synthetic is not filings/);
    expect(screen.queryByText(/Synthetic Process Co/)).not.toBeInTheDocument();
  });

  it.each([
    [404, { message: 'not found' }, 'not-available', COPY.liveNotAvailable],
    [401, { message: 'Invalid API key' }, 'refused', COPY.liveRefused],
    [500, null, 'failed', COPY.liveFailed],
  ] as const)('says which failure a %i is, in a sentence without a number, and still lists the slate', async (status, body, reason, sentence) => {
    answer(status, body);
    renderFiaPage(<FiaLiveIndexPage />, { path: INDEX, url: INDEX });
    const note = await screen.findByRole('status');
    expect(note.getAttribute('data-published-failure')).toBe(reason);
    expect(note.textContent).toBe(sentence);
    expect(note.textContent).not.toMatch(/\d/);
    expect(screen.getAllByText(new RegExp(slate.companies[0].ticker)).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/SYNTHETIC|XCOA|XCEM/);
  });
});

describe('the production model route', () => {
  it('opens a published filings model, and falls through to the existing page for a planned one', async () => {
    answer(200, [{ package: FILINGS_PKG }]);
    renderFiaPage(<FiaLiveModelRoute />, { path: MODEL, url: '/finance/finance-in-action/synp' });
    expect(await screen.findByRole('heading', { level: 1, name: /Synthetic Process Co/ })).toBeInTheDocument();
  });

  it('waits for the read, then falls through for a slug with no package', async () => {
    answer(200, []);
    renderFiaPage(<FiaLiveModelRoute />, { path: MODEL, url: '/finance/finance-in-action/ptba' });
    expect(screen.getByText(COPY.publishedLoading)).toBeInTheDocument();
    expect(await screen.findByText(/Model not found|Finance in Action/i, {}, { timeout: 3000 })).toBeInTheDocument();
  });
});

describe('no fixture reaches the live bundle', () => {
  const SRC = path.resolve(__dirname, '../../src');
  const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  /** Every static import a module makes, resolved to a src-relative path when it is one of ours. */
  const importsOf = (rel: string): string[] =>
    [...read(rel).matchAll(/from\s+'([^']+)'/g)]
      .map((m) => m[1])
      .filter((spec) => spec.startsWith('@/') || spec.startsWith('.'))
      .map((spec) => (spec.startsWith('@/') ? spec.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec))));
  const resolve = (spec: string): string | null => {
    for (const candidate of [spec, `${spec}.ts`, `${spec}.tsx`, `${spec}/index.ts`]) if (fs.existsSync(path.join(SRC, candidate))) return candidate;
    return null;
  };
  /** The modules reachable from an entry, through static imports, as the bundler would see them. */
  const reachable = (entry: string): Set<string> => {
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length) {
      const rel = queue.shift() as string;
      if (seen.has(rel)) continue;
      seen.add(rel);
      if (!/\.(ts|tsx)$/.test(rel)) continue;
      for (const spec of importsOf(rel)) {
        const found = resolve(spec);
        if (found) queue.push(found);
      }
    }
    return seen;
  };

  it.each(['pages/finance-in-action/FiaLiveIndexPage.tsx', 'pages/finance-in-action/FiaLiveModelRoute.tsx'])('%s reaches no SYNTHETIC file and not preview.ts', (entry) => {
    const modules = [...reachable(entry)];
    expect(modules.filter((m) => /SYNTHETIC/.test(m))).toEqual([]);
    expect(modules.filter((m) => /finance-in-action\/preview\.ts$/.test(m) || /usePreviewRegistry/.test(m))).toEqual([]);
    expect(modules).toContain('lib/finance-in-action/live.ts');
  });

  it('while the preview page does reach them (the control that the scan sees imports at all)', () => {
    const modules = [...reachable('pages/finance-in-action/FiaIndexPage.tsx')];
    expect(modules).toContain('lib/finance-in-action/preview.ts');
  });

  it('the live data module imports nothing with SYNTHETIC in its name', () => {
    expect(importsOf('lib/finance-in-action/live.ts').filter((m) => /SYNTHETIC/.test(m))).toEqual([]);
  });
});
