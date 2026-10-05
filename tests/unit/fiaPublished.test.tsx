/**
 * Finance in Action, programme milestone M5 step 4: the preview reads the
 * owner's published models from fsre_published.model_packages, read-only, and
 * a failed read never empties the page. The package here is SYNTHETIC (built
 * by the FSRE suite from its synthetic golden case and relabelled).
 */
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
import { fetchPublishedPackages } from '@/lib/finance-in-action/published';
import { buildPreviewRegistry } from '@/lib/finance-in-action/preview';
import { COPY } from '@/lib/finance-in-action/copy';
import FiaIndexPage from '@/pages/finance-in-action/FiaIndexPage';

const PKG = published as unknown as ModelPackage;
const INDEX = '/finance/finance-in-action';

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('reading the published models', () => {
  it('asks the published schema with the publishable key only, and returns the packages', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ package: PKG }]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const got = await fetchPublishedPackages('https://example.supabase.test', 'publishable-key');
    expect(got).toHaveLength(1);
    expect(got[0].meta.ticker).toBe('SYNP');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.supabase.test/rest/v1/model_packages?select=package');
    const headers = init.headers as Record<string, string>;
    expect(headers['Accept-Profile']).toBe('fsre_published');
    expect(headers.apikey).toBe('publishable-key');
    expect(headers).not.toHaveProperty('Authorization'); // no session: the database answers as anon
    expect(init.method ?? 'GET').toBe('GET'); // read-only
  });

  it('says why when the read fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    await expect(fetchPublishedPackages('https://example.supabase.test', 'k')).rejects.toThrow('answered 404');
  });

  it('has nothing to read without the site settings', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchPublishedPackages('', '')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the preview with a published model', () => {
  it('lists the published package beside the fixtures, checked like them', () => {
    const reg = buildPreviewRegistry([PKG]);
    expect(reg.rejected).toEqual([]);
    const c = reg.company('SYNP');
    expect(c?.status).toBe('published');
    expect(c?.pkg?.workpaper.approvedBy).toBe('SYNTHETIC approver');
    expect(reg.companies.some((x) => x.ticker === 'XCEM')).toBe(true); // the fixtures stay
  });

  it('draws the index with the published model once the read returns', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.test');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ package: PKG }]), { status: 200 })));
    renderFiaPage(<FiaIndexPage />, { path: INDEX, url: INDEX });
    expect(await screen.findByText('Synthetic Process Co (SYNTHETIC)')).toBeInTheDocument();
  });

  it('keeps the fixtures and names the reason when the read fails', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.test');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    renderFiaPage(<FiaIndexPage />, { path: INDEX, url: INDEX });
    expect(await screen.findByText(new RegExp(COPY.publishedFailed.slice(0, 30)))).toBeInTheDocument();
    expect(screen.getAllByText(/Example Cement Co/).length).toBeGreaterThan(0);
  });
});
