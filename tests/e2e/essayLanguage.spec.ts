import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSupabase } from './mockSupabase';

/**
 * The essay language toggle end to end (docs/prd/essay-language/03-PEMBACA.md
 * §C5, 06-VERIFIKASI.md): the real production bundle, the real essay page,
 * against a mocked backend. No live database is contacted; the Indonesian text
 * here is test text, not a translation.
 */

const ESSAY_ID = '22222222-2222-2222-2222-222222222222';
const doc = (...ps: string[]) => ({ type: 'doc', content: ps.map((t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })) });

const essay = (slug: string, id = ESSAY_ID) => ({
  id,
  slug,
  title: 'English Test Essay',
  snippet: 'English snippet.',
  section: 'next-big-thing',
  phase: null,
  topic: null,
  category_id: 'cat',
  author: 'Test Author',
  read_time: '5 min',
  date: '2026-08-01',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-02T00:00:00Z',
  published: true,
  status: 'published',
  content: '<p>English body text.</p>',
  content_json: doc('English body text.'),
  brief_json: null,
  presentation: { deck: 'English deck.' },
  thumbnail_url: null,
});

const translation = {
  essay_id: ESSAY_ID,
  locale: 'id',
  title: 'Judul Uji',
  snippet: null,
  content_json: doc('Teks uji berbahasa Indonesia.'),
  brief_json: null,
  presentation: { deck: 'Dek uji.' },
  read_time: null,
  published: true,
};

/** One essay, by slug, and (optionally) its Indonesian version, as single-object reads. */
async function serve(page: Page, opts: { withTranslation: boolean }) {
  await mockSupabase(page, { tables: { essays: [] } });
  const one = (route: Route, body: unknown) => {
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    if (!body) {
      return route.fulfill({ status: single ? 406 : 200, contentType: 'application/json', body: single ? JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' }) : '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? body : [body]) });
  };
  // Registered after mockSupabase, so these win for the two tables they name.
  await page.route('**/rest/v1/essays?**', (route) => {
    const url = new URL(route.request().url());
    const slug = url.searchParams.get('slug')?.replace(/^eq\./, '');
    return slug ? one(route, essay(slug)) : route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/rest/v1/essay_translations?**', (route) => one(route, opts.withTranslation ? translation : null));
}

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
});

test('an essay without an Indonesian version shows no language toggle', async ({ page }) => {
  await serve(page, { withTranslation: false });
  await page.goto('/the-next-big-thing/lang-test');
  await expect(page.getByRole('heading', { level: 1, name: 'English Test Essay' })).toBeVisible();
  await expect(page.getByTestId('essay-language-toggle')).toHaveCount(0);
});

test('?lang=id on an essay without one: English, and the parameter is dropped', async ({ page }) => {
  await serve(page, { withTranslation: false });
  await page.goto('/the-next-big-thing/lang-test?lang=id');
  await expect(page.getByRole('heading', { level: 1, name: 'English Test Essay' })).toBeVisible();
  await expect(page).toHaveURL(/\/the-next-big-thing\/lang-test$/);
});

test('choose ID, reload, still Indonesian; back to EN', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await serve(page, { withTranslation: true });
  await page.goto('/the-next-big-thing/lang-test');

  const toggle = page.getByTestId('essay-language-toggle');
  await expect(toggle).toBeVisible();
  await toggle.getByRole('button', { name: 'Bahasa Indonesia' }).click();

  await expect(page).toHaveURL(/\?lang=id$/);
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('Judul Uji');
  await expect(page.getByText('Teks uji berbahasa Indonesia.')).toBeVisible();
  await expect(page.locator('[lang="id"]').getByText('Teks uji berbahasa Indonesia.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://dikagustiana.com/the-next-big-thing/lang-test?lang=id');
  await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveAttribute('href', 'https://dikagustiana.com/the-next-big-thing/lang-test?lang=id');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Judul Uji');

  await page.getByTestId('essay-language-toggle').getByRole('button', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/the-next-big-thing\/lang-test$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('English Test Essay');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(errors).toEqual([]);
});

test('/essays/<slug>?lang=id keeps the language through the canonical redirect', async ({ page }) => {
  await serve(page, { withTranslation: true });
  await page.goto('/essays/lang-test?lang=id');
  await expect(page).toHaveURL(/\/the-next-big-thing\/lang-test\?lang=id$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Judul Uji');
});

test('the toggle works from the keyboard', async ({ page }) => {
  await serve(page, { withTranslation: true });
  await page.goto('/the-next-big-thing/lang-test');
  const id = page.getByTestId('essay-language-toggle').getByRole('button', { name: 'Bahasa Indonesia' });
  await id.focus();
  await expect(id).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Judul Uji');
});

/** Serious or critical axe findings inside a region, as "rule selector" strings. */
async function seriousFindings(page: Page, region: string) {
  const results = await new AxeBuilder({ page }).include(region).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')}`))
    .sort();
}

for (const lang of ['en', 'id'] as const) {
  test(`the language toggle itself has no accessibility violations (${lang})`, async ({ page }) => {
    await serve(page, { withTranslation: true });
    await page.goto(`/the-next-big-thing/lang-test${lang === 'id' ? '?lang=id' : ''}`);
    await expect(page.getByTestId('essay-language-toggle')).toBeVisible();
    expect(await seriousFindings(page, '[data-testid="essay-language-toggle"]')).toEqual([]);
  });
}

// The essay page has contrast findings of its own that predate this feature
// (the deck's .editorial-subtitle, the font-size toggle's "Text" label). The
// promise here is narrower and exact: the Indonesian version adds none.
test('an Indonesian essay has no accessibility findings the English-only page lacks', async ({ page, browser }) => {
  await serve(page, { withTranslation: false });
  await page.goto('/the-next-big-thing/lang-test');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const baseline = await seriousFindings(page, '#article-content');

  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
  const other = await context.newPage();
  await other.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await other.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await serve(other, { withTranslation: true });
  await other.goto('/the-next-big-thing/lang-test?lang=id');
  await expect(other.getByRole('heading', { level: 1 })).toHaveText('Judul Uji');
  const withId = await seriousFindings(other, '#article-content');
  await context.close();

  expect(withId.filter((f) => !baseline.includes(f))).toEqual([]);
});

test('screenshots at 360px and 1440px, in Indonesian', async ({ page }) => {
  await serve(page, { withTranslation: true });
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/the-next-big-thing/lang-test?lang=id');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Judul Uji');
    await page.screenshot({ path: `docs/prd/essay-language/shots/essay-id-${width}.png`, fullPage: false });
  }
});
