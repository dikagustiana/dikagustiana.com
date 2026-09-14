import { test, expect, type Page, type Route } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * The reader journeys, end to end.
 *
 * Not a second copy of the unit tests. Each one walks the path a person walks
 * and asserts the thing the 2026-09 audit found missing at the end of it: a
 * stranger who arrives cold meets a bounded position rather than a list of
 * rooms; the scope, the objection and the limits are on the page rather than
 * in the author's head; an unfinished step says it is unfinished; the map's
 * marks say whether they are findings or illustrations; and a reading can be
 * sent to someone else.
 *
 * The shared `mockSupabase` answers every single-object select with 406, which
 * is right for the pages it was written for and wrong for an essay page. This
 * file registers its own REST handler AFTER it, so Playwright matches this one
 * first, and it filters on the query the way PostgREST does.
 */

const ESSAYS = [
  {
    id: 'e1',
    slug: 'driver-tree-construction',
    title: 'Driver Tree Construction',
    snippet: 'How to map a business model into drivers that reconcile to the accounts.',
    section: 'finance',
    phase: 'financial-analytics',
    finance_section: 'analytics',
    fsli_slug: null,
    topic: null,
    author: 'Dika Gustiana Irawan',
    read_time: '20 min read',
    date: '2026-08-01',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    published: true,
    status: 'published',
    is_selected: true,
    thumbnail_url: null,
    content: '<p>Body.</p>',
    presentation: null,
    brief_json: null,
    category_id: 'c1',
    code: 'fa-07-01',
    finance_modules: { slug: 'fa-07', track_slug: 'analytics' },
  },
  {
    id: 'e2',
    slug: 'macro-scenario-construction-for-cfos',
    title: 'Macro Scenario Construction for CFOs',
    snippet: 'Three percentage bands are not three economic states.',
    section: 'finance',
    phase: 'financial-planning',
    finance_section: 'planning',
    fsli_slug: null,
    topic: null,
    author: 'Dika Gustiana Irawan',
    read_time: '21 min read',
    date: '2026-08-02',
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    published: true,
    status: 'published',
    is_selected: true,
    thumbnail_url: null,
    content: '<p>Body.</p>',
    presentation: null,
    brief_json: null,
    category_id: 'c1',
    code: 'pf-03-01',
    finance_modules: { slug: 'pf-03', track_slug: 'planning' },
  },
  {
    id: 'e4',
    slug: 'indonesias-reindustrialization-bet',
    title: "Indonesia's Reindustrialization Bet",
    snippet: 'Carbon Liability, Capital Sequencing, and The Conditions For Payoff',
    section: 'next-big-thing',
    phase: 'economy',
    finance_section: null,
    fsli_slug: null,
    topic: null,
    author: 'Dika Gustiana Irawan',
    read_time: '10 min read',
    date: '2026-08-02',
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    published: true,
    status: 'published',
    is_selected: true,
    thumbnail_url: null,
    content:
      '<h4>The Imperative is Industrial</h4><p>The strongest objection is the option value of delay.</p><p>The bet fails if CBAM weakens.</p>',
    presentation: null,
    brief_json: null,
    category_id: 'c1',
    code: null,
    finance_modules: null,
  },
];

/** What PostgREST would return for this URL, given the seed above. */
function rowsFor(url: string): Record<string, unknown>[] {
  const u = new URL(url);
  if (!u.pathname.startsWith('/rest/v1/essays')) return [];
  let rows: Record<string, unknown>[] = ESSAYS;
  for (const [key, raw] of u.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op === 'eq') rows = rows.filter((r) => String(r[key]) === value);
    else if (op === 'in') {
      const set = value.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''));
      rows = rows.filter((r) => set.includes(String(r[key])));
    }
  }
  return rows;
}

async function seed(page: Page) {
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await mockSupabase(page);
  await page.route('**/rest/v1/**', (route: Route) => {
    const rows = rowsFor(route.request().url());
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(single ? rows[0] ?? null : rows),
    });
  });
}

test.beforeEach(async ({ page }) => seed(page));

test('thirty seconds: the hero leads to a bounded position, and a completed piece is one click away', async ({ page }) => {
  await page.goto('/');

  // "Read the essays" pointed at six subject doors below the curated strip.
  const cta = page.getByRole('link', { name: /Start with the argument/i });
  await expect(cta).toBeVisible();
  await cta.click();

  const argument = page.locator('#the-argument');
  await expect(argument).toBeVisible();
  // Bounded to a case, not a claim about a country.
  await expect(argument).toContainText(/captive/i);
  await expect(argument).toContainText(/nickel/i);

  const flagship = page
    .getByRole('link', { name: /Indonesia.s Reindustrialization Bet/i })
    .first();
  await expect(flagship).toHaveAttribute(
    'href',
    '/the-next-big-thing/economy/indonesias-reindustrialization-bet',
  );
});

test('three minutes: the scope, the comparison, the objection and the limits are all on the page', async ({ page }) => {
  await page.goto('/about');
  const argument = page.locator('#the-argument');
  for (const heading of [
    'The case it is made on',
    'What is being compared',
    'The strongest objection',
    'What would change my mind',
    'What the evidence does not cover',
  ]) {
    await expect(argument).toContainText(heading);
  }

  // An unfinished argument that looks finished is the failure this guards.
  // Scoped and exact: the phrase also opens both gap explanations and the
  // heading in the revision section, and getByText is a case-insensitive
  // substring match.
  await expect(argument.getByText('Not written', { exact: true })).toHaveCount(2);
  await expect(page.locator('#changed-my-mind')).toBeVisible();
});

test('one substantial reading: the completed argument carries its own objection', async ({ page }) => {
  await page.goto('/the-next-big-thing/economy/indonesias-reindustrialization-bet');
  const main = page.locator('main');
  await expect(main).toContainText(/Reindustrialization Bet/i);
  await expect(main).toContainText(/option value of delay/i);
  await expect(main).toContainText(/The bet fails if/i);
});

test('map reading: the basis is declared, distance changes the work, and the state can be sent', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/about');
  await page.getByRole('button', { name: 'green transition', exact: true }).click();
  await page.getByRole('button', { name: /Green transition · Energy · Moving$/ }).first().click();

  const panel = page.getByRole('region', { name: 'Energy' });
  // A mark is a promise of a diagnosis; this one is the single assessed
  // reading, and it says so before it says anything else.
  await expect(panel.locator('[data-basis="assessed"]')).toBeVisible();
  // The map can only draw a repricing. What moves this element is a contract.
  await expect(panel.locator('[data-mechanism="contract"]')).toBeVisible();
  await expect(panel.getByRole('link', { name: /Reindustrialization Bet/i })).toBeVisible();

  const atEconomy = await panel.innerText();
  await page.getByRole('button', { name: 'finance', exact: true }).click();
  const atFinance = await page.getByRole('region', { name: 'Energy' }).innerText();
  // Moving the distance control has to change the explanatory work, not the
  // label over the same words.
  expect(atFinance).not.toEqual(atEconomy);

  const shared = page.url();
  expect(shared).toContain('lens=green');
  expect(shared).toContain('distance=finance');
  expect(shared).toContain('node=energy');

  const fresh = await context.newPage();
  await seed(fresh);
  await fresh.goto(shared);
  await expect(fresh.getByRole('region', { name: 'Energy' })).toBeVisible();
  await expect(fresh.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');
  await fresh.close();
});

test('a reading opened from the landing page can be sent, which it previously could not', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'See the full chain' }).click();
  await page.getByRole('button', { name: 'green transition', exact: true }).click();
  await expect.poll(() => page.url()).toContain('lens=green');
});

test('curriculum: the syllabus says what it is, and promises no dates', async ({ page }) => {
  await page.goto('/finance');
  const main = page.locator('main');
  await expect(main).toContainText(/working syllabus/i);
  // "Coming soon" was a delivery promise repeated on 159 unwritten rows.
  await expect(main).not.toContainText(/coming soon/i);
});
