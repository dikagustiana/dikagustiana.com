import { test, expect, Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * Smoke tests: every public route must render without an uncaught runtime
 * error and must not produce a blank "white screen". Supabase is fully mocked,
 * so this proves the app's routing + data-fetching + render code paths run.
 */

// Routes reachable without authentication. Param routes use placeholder slugs
// (no seed data) to prove the page degrades gracefully instead of crashing.
const PUBLIC_ROUTES: { path: string; name: string }[] = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/auth', name: 'Auth' },
  { path: '/accounting', name: 'Accounting' },
  { path: '/accounting/fsli', name: 'FSLI list' },
  { path: '/accounting/consolidated-reporting', name: 'Consolidated reporting' },
  { path: '/accounting/statutory-reporting', name: 'Statutory reporting' },
  { path: '/finance', name: 'Finance landing' },
  { path: '/finance/finance-in-motion', name: 'Finance in motion' },
  { path: '/finance/finance-in-action', name: 'Finance in action' },
  { path: '/finance/analytics', name: 'Finance track index' },
  { path: '/green-transition', name: 'Green transition' },
  { path: '/green-transition/climate-finance', name: 'Climate finance' },
  { path: '/green-transition/tracker', name: 'GT tracker' },
  { path: '/green-transition/tracker/archive', name: 'GT tracker archive' },
  { path: '/green-transition/now', name: 'GT phase: now' },
  { path: '/green-transition/gaps', name: 'GT phase: gaps' },
  { path: '/green-transition/future', name: 'GT phase: future' },
  { path: '/development-finance', name: 'Development finance' },
  { path: '/development-finance/origins', name: 'Development finance phase' },
  { path: '/critical-thinking-research', name: 'Critical thinking' },
  { path: '/books-academia', name: 'Books academia' },
  { path: '/books/categories', name: 'Books categories' },
  { path: '/books/economics', name: 'Books list' },
  { path: '/english-ielts', name: 'English IELTS' },
  { path: '/the-next-big-thing', name: 'The next big thing' },
  { path: '/this-route-does-not-exist', name: '404 NotFound' },
];

function collectErrors(page: Page) {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  return pageErrors;
}

test.beforeEach(async ({ page }) => {
  await mockSupabase(page);
  // Keep external font CSS deterministic / offline-safe.
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
});

for (const route of PUBLIC_ROUTES) {
  test(`renders ${route.name} (${route.path})`, async ({ page }) => {
    const pageErrors = collectErrors(page);

    const response = await page.goto(route.path, { waitUntil: 'load' });
    // SPA: server returns index.html (200) for every path.
    expect(response?.status(), 'HTTP status').toBeLessThan(400);

    // Allow React to render and the (mocked, instant) queries to settle.
    await page.waitForTimeout(700);

    // No uncaught runtime exceptions.
    expect(pageErrors, `uncaught errors on ${route.path}`).toEqual([]);

    // Not a blank white screen — the root has real rendered content.
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
    const text = (await page.locator('body').innerText()).trim();
    expect(text.length, `visible text length on ${route.path}`).toBeGreaterThan(20);
  });
}
