import { expect, test, type Page, type Route } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * docs/prd/finance-restructure §4 Tests, in the browser over the production
 * bundle (playwright.config.ts: a dead Supabase URL, every call intercepted
 * here): the six cards on /finance, the old Capital in Motion addresses
 * redirecting, and Toolkits end to end: the admin's publish with both
 * checks, the download link answering 200 with an attachment header, and a
 * v1 link still opening v1 after v2 is published.
 *
 * R2 is a stand-in host (r2.test) served by the test; the real bucket, the
 * edge function and the database are never reached. supabase/tests/toolkits.sql
 * covers the database's refusal; the live check waits for the migration.
 */

const R2 = 'https://r2.test';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MODULE = { id: 'm7', slug: 't4-m07', title: 'Driver-Based Forecasting and Business Model Mapping', track_slug: 'analytics', sort_order: 7 };
const SECTIONS = [
  ['fundamentals', 'Fundamentals'],
  ['strategic-finance', 'Strategic Finance'],
  ['planning', 'Planning & Forecasting'],
  ['analytics', 'Financial Analytics'],
  ['capital-allocation', 'Capital Allocation'],
].map(([slug, title], i) => ({ id: `s${i + 1}`, slug, title, description: `${title}.`, icon: 'X', sort_order: i + 1 }));

async function base(page: Page, tables: Record<string, unknown[]> = {}) {
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await mockSupabase(page, { tables: { finance_sections: SECTIONS, ...tables } });
}

test.describe('/finance', () => {
  test('six cards; every link opens a page, not the 404', async ({ page }) => {
    await base(page);
    await page.goto('/finance');
    const cards = page.locator('main [data-finance-card]');
    await expect(cards).toHaveCount(6);
    await expect(cards.locator('h3')).toHaveText([
      'Fundamentals', 'Strategic Finance', 'Planning & Forecasting', 'Financial Analytics', 'Finance in Action', 'Toolkits',
    ]);
    const hrefs = await cards.evaluateAll((cs) => [
      ...new Set(cs.flatMap((c) => (c.matches('a') ? [c] : [...c.querySelectorAll('a')]).map((a) => a.getAttribute('href')!))),
    ]);
    expect(hrefs).toEqual(expect.arrayContaining([
      '/finance/finance-in-action', '/finance/finance-in-action/capital-in-motion', '/finance/finance-in-action#company-models', '/finance/toolkits',
    ]));
    // The tracks' pages read their row with maybeSingle, which the mock answers "no rows"; the four links
    // added here are the ones to open (unit tests resolve every card's link against the route table).
    for (const href of hrefs.filter((h) => !/^\/finance\/(fundamentals|strategic-finance|planning|analytics)$/.test(h))) {
      await page.goto(href);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/page not found|doesn.t exist/i)).toHaveCount(0);
    }
  });
});

test.describe('old Capital in Motion addresses', () => {
  for (const [from, to] of [
    ['/finance/capital-allocation', '/finance/finance-in-action/capital-in-motion'],
    ['/finance/capital-allocation/commodity-windfall', '/finance/finance-in-action/capital-in-motion/commodity-windfall'],
    ['/finance/capital-in-motion/commodity-windfall', '/finance/finance-in-action/capital-in-motion/commodity-windfall'],
    ['/finance/finance-in-motion', '/finance/finance-in-action/capital-in-motion'],
  ]) {
    test(`${from} lands on ${to}, replacing the history entry`, async ({ page }) => {
      await base(page);
      await page.goto('/');
      await page.goto(from);
      await expect(page).toHaveURL(to);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Back goes to the page before, not to the old address (a replace, not a push).
      await page.goBack();
      await expect(page).toHaveURL('/');
    });
  }
});

/** A signed-in admin: a stored session and the admin role row. */
async function asAdmin(page: Page) {
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1000);
    const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'tester@example.com', app_metadata: {}, user_metadata: {} };
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: 'mock-access-token', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'r', user }));
  });
  await page.route('**/rest/v1/user_roles**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin' }) }));
}

test.describe('Toolkits', () => {
  test('the admin publishes only with both checks; the file goes to a new key; the card appears', async ({ page }) => {
    await base(page, { finance_modules: [MODULE] });
    await asAdmin(page);
    const writes: { url: string; method: string; body: unknown }[] = [];
    const published: unknown[] = [];
    await page.route('**/rest/v1/toolkits**', async (route: Route) => {
      const req = route.request();
      if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(published) });
      writes.push({ url: req.url(), method: req.method(), body: req.postDataJSON() });
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 't1', slug: 'driver-tree' }) });
    });
    await page.route('**/rest/v1/toolkit_versions**', async (route) => {
      const body = route.request().postDataJSON();
      writes.push({ url: route.request().url(), method: route.request().method(), body });
      published.push({
        id: 't1', slug: 'driver-tree', title: 'Driver tree', purpose: 'Rebuild revenue from volume and price.', module_id: 'm7', format: 'xlsx',
        status: 'published', checks: { no_client_data: true, verified_model: true }, created_at: '2026-10-24T00:00:00Z', updated_at: '2026-10-24T00:00:00Z',
        finance_modules: MODULE, toolkit_versions: [{ id: 'v1', toolkit_id: 't1', ...body, published_at: '2026-10-24T05:00:00Z' }],
      });
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'v1', ...body, published_at: '2026-10-24T05:00:00Z' }) });
    });
    let fnBody: Record<string, unknown> | null = null;
    await page.route('**/functions/v1/toolkit-file', async (route) => {
      fnBody = route.request().postDataJSON();
      const key = `toolkits/${fnBody!.slug}/${fnBody!.version}/${fnBody!.slug}-v${fnBody!.version}.xlsx`;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, key, url: `${R2}/${key}?X-Amz-Signature=x`, contentType: XLSX }) });
    });
    const puts: string[] = [];
    await page.route(`${R2}/**`, (route) => {
      puts.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      return route.fulfill({ status: 200, body: '' });
    });

    await page.goto('/admin/toolkits');
    const form = page.getByRole('form', { name: 'New toolkit' });
    const publish = form.getByRole('button', { name: 'Publish' });
    await expect(publish).toBeDisabled();
    await form.getByLabel('Title', { exact: true }).fill('Driver tree');
    await expect(form.getByLabel('Slug')).toHaveValue('driver-tree');
    await form.getByLabel('Purpose').fill('Rebuild revenue from volume and price.');
    await form.getByLabel('Linked module').selectOption('m7');
    await form.getByLabel('Version').fill('1.0');
    await form.getByLabel('File', { exact: true }).setInputFiles({ name: 'Driver Tree.xlsx', mimeType: XLSX, buffer: Buffer.from('PK test workbook') });
    await expect(publish).toBeDisabled();
    await form.getByRole('checkbox', { name: /no SAMB Group or client data/ }).check();
    await expect(publish).toBeDisabled();
    await form.getByRole('checkbox', { name: /passed verify-financial-model/ }).check();
    await expect(publish).toBeEnabled();
    await publish.click();

    await expect.poll(() => writes.length).toBe(2);
    expect(writes[0]).toMatchObject({ method: 'POST', body: { slug: 'driver-tree', status: 'published', checks: { no_client_data: true, verified_model: true }, module_id: 'm7' } });
    expect(fnBody).toMatchObject({ action: 'upload', slug: 'driver-tree', version: '1.0', contentType: XLSX });
    expect(puts).toEqual(['PUT /toolkits/driver-tree/1.0/driver-tree-v1.0.xlsx']);
    expect(writes[1].body).toMatchObject({ toolkit_id: 't1', version: '1.0', file_key: 'toolkits/driver-tree/1.0/driver-tree-v1.0.xlsx' });
    expect((writes[1].body as { sha256: string }).sha256).toMatch(/^[0-9a-f]{64}$/);

    await page.goto('/finance/toolkits');
    await expect(page.getByRole('heading', { level: 2, name: 'Driver tree' })).toBeVisible();
    await expect(page.getByText('xlsx · v1.0 · updated 24 Oct 2026')).toBeVisible();
  });

  test('a download answers 200 with an attachment header; after v2 the v1 link still opens v1', async ({ page }) => {
    const v = (version: string, at: string) => ({
      id: `v${version}`, toolkit_id: 't1', version, changelog: null, file_key: `toolkits/driver-tree/${version}/driver-tree-v${version}.xlsx`,
      size_bytes: 16, sha256: 'a'.repeat(64), published_at: at,
    });
    const toolkit = {
      id: 't1', slug: 'driver-tree', title: 'Driver tree', purpose: 'Rebuild revenue from volume and price.', module_id: 'm7', format: 'xlsx', status: 'published',
      checks: { no_client_data: true, verified_model: true }, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-24T00:00:00Z', finance_modules: MODULE,
      toolkit_versions: [v('1.0', '2026-10-01T05:00:00Z'), v('2.0', '2026-10-24T05:00:00Z')],
    };
    await base(page, { toolkits: [toolkit] });
    // The function's read: the asked version's key, or the latest. The stand-in bucket serves each key with its own bytes.
    await page.route('**/functions/v1/toolkit-file', async (route) => {
      const { slug, version } = route.request().postDataJSON();
      const row = version ? toolkit.toolkit_versions.find((x) => x.version === version) : toolkit.toolkit_versions[1];
      if (!row) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'not_found' }) });
      const name = row.file_key.split('/').pop();
      const url = `${R2}/${row.file_key}?response-content-disposition=${encodeURIComponent(`attachment; filename="${name}"`)}&X-Amz-Signature=x`;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, url, version: row.version, filename: name, slug }) });
    });
    const served: { path: string; status: number; disposition: string }[] = [];
    await page.route(`${R2}/**`, (route) => {
      const u = new URL(route.request().url());
      const disposition = u.searchParams.get('response-content-disposition') ?? '';
      served.push({ path: u.pathname, status: 200, disposition });
      return route.fulfill({ status: 200, headers: { 'Content-Type': XLSX, 'Content-Disposition': disposition }, body: `bytes of ${u.pathname}` });
    });

    await page.goto('/finance/toolkits');
    await expect(page.getByText('xlsx · v2.0 · updated 24 Oct 2026')).toBeVisible();

    const latest = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download driver-tree-v2.0.xlsx' }).click();
    expect((await latest).suggestedFilename()).toBe('driver-tree-v2.0.xlsx');

    await page.getByText('Previous versions').click();
    const older = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download driver-tree-v1.0.xlsx' }).click();
    const d1 = await older;
    expect(d1.suggestedFilename()).toBe('driver-tree-v1.0.xlsx');
    const fs = await import('node:fs');
    expect(fs.readFileSync((await d1.path())!, 'utf8')).toBe('bytes of /toolkits/driver-tree/1.0/driver-tree-v1.0.xlsx');

    expect(served).toEqual([
      { path: '/toolkits/driver-tree/2.0/driver-tree-v2.0.xlsx', status: 200, disposition: 'attachment; filename="driver-tree-v2.0.xlsx"' },
      { path: '/toolkits/driver-tree/1.0/driver-tree-v1.0.xlsx', status: 200, disposition: 'attachment; filename="driver-tree-v1.0.xlsx"' },
    ]);
  });
});
