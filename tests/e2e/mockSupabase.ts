import type { Page, Route } from '@playwright/test';

/**
 * Intercepts every Supabase network call and fulfils it locally so the app
 * can be exercised end-to-end WITHOUT ever touching a real (production)
 * backend. Combined with a dead VITE_SUPABASE_URL (127.0.0.1:54321) this
 * guarantees zero outbound traffic to production.
 *
 * Behaviour:
 *  - REST list selects            -> 200 [] (or seeded rows, if provided)
 *  - REST single()/maybeSingle()  -> 406 PGRST116 ("0 rows") so maybeSingle
 *                                    resolves to null and single resolves to
 *                                    an error the UI is expected to handle.
 *  - auth token / signup          -> a valid-looking mock session.
 *  - storage / functions / rpc    -> empty success.
 *  - realtime websocket           -> aborted (the app must not depend on it).
 */

const PGRST_NO_ROWS = {
  code: 'PGRST116',
  details: 'Results contain 0 rows',
  hint: null,
  message: 'JSON object requested, multiple (or no) rows returned',
};

function mockUser() {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'tester@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mockSession() {
  return {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user: mockUser(),
  };
}

export interface MockOptions {
  /** Per-table seed rows for list selects, keyed by table name. */
  tables?: Record<string, unknown[]>;
}

export async function mockSupabase(page: Page, opts: MockOptions = {}) {
  const tables = opts.tables ?? {};

  const restHandler = (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const accept = req.headers()['accept'] ?? '';
    const wantsSingleObject = accept.includes('vnd.pgrst.object');

    // Table name is the first path segment after /rest/v1/
    const table = url.pathname.split('/rest/v1/')[1]?.split('?')[0] ?? '';

    if (method === 'GET' || method === 'HEAD') {
      if (wantsSingleObject) {
        return route.fulfill({
          status: 406,
          contentType: 'application/json',
          body: JSON.stringify(PGRST_NO_ROWS),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tables[table] ?? []),
      });
    }

    // Writes (POST/PATCH/DELETE) — never expected on public flows, but echo OK.
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  };

  const authHandler = (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSession()),
      });
    }
    if (path.endsWith('/signup')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockUser(), session: mockSession() }),
      });
    }
    if (path.endsWith('/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser()),
      });
    }
    if (path.endsWith('/logout')) {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };

  await page.route('**/rest/v1/**', restHandler);
  await page.route('**/auth/v1/**', authHandler);
  await page.route('**/storage/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/functions/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/rpc/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  // Block the realtime websocket — the app must degrade gracefully without it.
  await page.route('**/realtime/v1/**', (route) => route.abort());
}
