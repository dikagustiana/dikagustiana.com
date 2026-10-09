import { defineConfig, devices } from '@playwright/test';

/**
 * The Kawasan Industri world's browser suite (tests/e2e/world.spec.ts): the
 * same premise as playwright.config.ts (a real production bundle pointed at
 * a dead Supabase URL, every call intercepted in-test), built with the world
 * flag ON. The default config builds with the flag off, as production does,
 * so the flag-off regression (worldFlagOff.spec.ts) runs there and this
 * config runs only the world's own spec. WebGL runs on SwiftShader where no
 * GPU exists.
 *
 *   npm run test:e2e:world
 */
const PORT = 4176;
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';
process.env.VITE_SUPABASE_PROJECT_ID = 'test';
process.env.VITE_WORLD_KAWASAN = 'true';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /world\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite build --outDir dist-world && npx vite preview --outDir dist-world --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
