import { defineConfig } from '@playwright/test';

/**
 * LIVE e2e config — API-level tests that hit a REAL (local/staging) Supabase
 * via @supabase/supabase-js. No browser or web server is needed. Gated by
 * E2E_LIVE=1 (individual specs skip themselves otherwise).
 *
 * Run: see docs/e2e-live-testing.md
 */
export default defineConfig({
  testDir: './tests/live',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
});
