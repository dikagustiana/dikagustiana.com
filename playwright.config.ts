import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. The app is built and served as the real production bundle, but
 * pointed at a dead localhost Supabase URL. Every Supabase call is intercepted
 * in-test (see tests/e2e/mockSupabase.ts), so NO production backend is ever
 * contacted.
 */
const PORT = 4173;
const TEST_SUPABASE_ENV =
  'VITE_SUPABASE_URL=http://127.0.0.1:54321 ' +
  'VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key ' +
  'VITE_SUPABASE_PROJECT_ID=test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // `vite build` directly, NOT `npm run build`: the npm script also runs
    // scripts/prerender.mjs, which contacts the REAL Supabase project (it
    // deliberately ignores non-supabase.co URLs, so the test URL above does
    // not stop it) and dies on 401 under the fake test key. This suite's
    // whole premise is that no production backend is ever contacted; the
    // SPA bundle is what it tests, and preview falls back to index.html for
    // every route, so the per-essay static files are not needed here.
    command: `${TEST_SUPABASE_ENV} npx vite build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
