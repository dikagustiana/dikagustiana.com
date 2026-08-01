import { test, expect } from '@playwright/test';
import { anonClient, signedInClient, ADMIN, USER, LIVE } from './helpers';

/**
 * Edge Functions against a live instance. Requires the functions to be served
 * (`supabase functions serve`) in addition to E2E_LIVE=1; enable with
 * E2E_EDGE=1.
 *
 * council-review is the only function left after the rebuild — the quant,
 * remora and personal-finance functions were cut with their modules. It runs
 * verify_jwt = true and re-checks the admin role server-side, so the useful
 * assertions are about the auth boundary rather than model output: an actual
 * council run needs the AI gateway configured (AI_GATEWAY_URL /
 * AI_GATEWAY_API_KEY) and spends an AI call.
 */
const EDGE = LIVE && process.env.E2E_EDGE === '1';

const BODY = { mode: 'brainstorm', topic: 'e2e reachability probe', content: 'probe' };

test.describe('live: edge functions', () => {
  test.skip(!EDGE, 'edge suite disabled (set E2E_LIVE=1 E2E_EDGE=1 and serve functions)');

  test('council-review rejects an unauthenticated invoke', async () => {
    const client = anonClient();
    const { error } = await client.functions.invoke('council-review', { body: BODY });
    expect(error, 'anon invoke must not succeed').toBeTruthy();
  });

  test('council-review rejects a signed-in non-admin', async () => {
    const { client } = await signedInClient(USER);
    const { error } = await client.functions.invoke('council-review', { body: BODY });
    expect(error, 'non-admin invoke must be rejected').toBeTruthy();
  });

  test('council-review lets an admin past the gate', async () => {
    const { client } = await signedInClient(ADMIN);
    const res = await client.functions.invoke('council-review', { body: BODY });
    // Past the gate the call either returns a transcript or fails upstream on
    // the AI provider / an unconfigured gateway (503 council_not_configured).
    // Either is "reachable and
    // handled"; what must not happen is a 401 or 403.
    const message = res.error?.message ?? '';
    expect(message).not.toMatch(/401|403|Unauthorized|Admin access required/i);
    expect(res.error ?? res.data).toBeTruthy();
  });
});
