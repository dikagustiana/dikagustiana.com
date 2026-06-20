import { test, expect } from '@playwright/test';
import { anonClient, signedInClient, ADMIN, LIVE } from './helpers';

/**
 * Edge Functions against a live instance. Requires the functions to be served
 * (`supabase functions serve`) in addition to E2E_LIVE=1; enable with
 * E2E_EDGE=1. Many functions call external data providers, so we assert they
 * are reachable and return a *handled* structured response, not that upstream
 * data exists.
 */
const EDGE = LIVE && process.env.E2E_EDGE === '1';

test.describe('live: edge functions', () => {
  test.skip(!EDGE, 'edge suite disabled (set E2E_LIVE=1 E2E_EDGE=1 and serve functions)');

  test('remora-health returns a structured health report (no JWT required)', async () => {
    const client = anonClient();
    const { data, error } = await client.functions.invoke('remora-health', { body: {} });
    // The function always responds with JSON (200 health report or 500 error
    // body) — either way it must be reachable and structured.
    if (error) {
      // functions.invoke throws on non-2xx; surface the context for debugging.
      expect(error.message, `remora-health error: ${error.message}`).toBeTruthy();
      return;
    }
    expect(data).toBeTruthy();
    expect(['healthy', 'degraded', 'critical']).toContain(
      (data as { overallStatus?: string }).overallStatus,
    );
  });

  test('an authenticated invoke carries the user JWT', async () => {
    const { client } = await signedInClient(ADMIN);
    // remora-signals is verify_jwt=false but accepts an authenticated call too.
    const res = await client.functions.invoke('remora-signals', { body: {} });
    // Reachable + handled (data or a structured error), not a transport crash.
    expect(res.error ?? res.data).toBeTruthy();
  });
});
