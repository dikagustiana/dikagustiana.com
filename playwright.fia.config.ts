import { defineConfig, devices } from '@playwright/test';

/**
 * The Finance in Action preview's browser suite (tests/e2e/fia-sheet-first.spec.ts,
 * docs/company-models/sheet-first PRD K1, K2, K6 to K9): the same premise as
 * playwright.config.ts (a real production bundle pointed at a dead Supabase
 * URL, every call intercepted in-test), built with VITE_FIA_PREVIEW=true, the
 * only build in which the model pages and their SYNTHETIC fixtures exist. The
 * default config builds with the flag off, as production does.
 *
 *   npx playwright test -c playwright.fia.config.ts
 */
const PORT = 4177;
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';
process.env.VITE_SUPABASE_PROJECT_ID = 'test';
process.env.VITE_FIA_PREVIEW = 'true';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /fia-sheet-first\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    acceptDownloads: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite build --outDir dist-fia && npx vite preview --outDir dist-fia --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
