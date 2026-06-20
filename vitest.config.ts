/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Vitest config for unit (src/lib) + component (jsdom) tests.
// Playwright specs (tests/e2e, tests/live use *.spec.ts) are excluded; vitest
// only collects *.test.{ts,tsx}.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/e2e', 'tests/live'],
    css: false,
  },
});
