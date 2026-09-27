/**
 * link-preview — resolves a pasted URL to plain-text metadata for the editor's
 * link card (docs/DECISIONS.md, "Link previews: server-resolved, metadata
 * only"). Called at AUTHORING time from LinkCardDialog; the public page never
 * calls it. The rules live in ./resolve.ts; this file is auth and wiring.
 *
 * Authorisation. Deployed with verify_jwt = true (supabase/config.toml), so
 * the platform rejects a request with no valid JWT before this code runs.
 * That is necessary but not sufficient — the anon key is itself a valid JWT —
 * so it is re-checked here, server-side, from the caller's own token, and no
 * frontend guard is trusted:
 *   1. Auth confirms the token belongs to a signed-in user (GET /auth/v1/user).
 *   2. PostgREST, called WITH THAT USER'S TOKEN, returns the caller's admin
 *      row from public.user_roles. RLS (user_roles_select_own) lets a user read
 *      only their own roles, so anyone who is not an admin gets nothing and is
 *      refused with 403.
 * No service-role or secret-key client exists in this function. It needs no
 * privileged write, and that combination — verify_jwt = false plus a
 * service-role client — is the historical failure config.toml records.
 */

import { resolveLinkPreview, type ResolveDeps } from './resolve.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

/**
 * The project's public key, sent on `apikey` only (a publishable key is not a
 * JWT and must never be a Bearer token). The legacy anon key is the fallback
 * until the project retires legacy keys.
 */
function publicApiKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    if (typeof keys?.default === 'string' && keys.default) return keys.default;
  } catch {
    // fall through to the legacy key
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}
const API_KEY = publicApiKey();

// Bearer-token auth, no cookies, so any origin may ask: the token is the gate.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

type Caller = 'admin' | 'not_admin' | 'no_user' | 'error';

async function callerRole(token: string): Promise<Caller> {
  const headers = { apikey: API_KEY, Authorization: `Bearer ${token}` };
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userRes.ok) {
    await userRes.body?.cancel();
    return 'no_user';
  }
  const user = await userRes.json().catch(() => null);
  const id = typeof user?.id === 'string' ? user.id : '';
  if (!id) return 'no_user';

  const rolesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?select=role&role=eq.admin&user_id=eq.${encodeURIComponent(id)}`,
    { headers: { ...headers, Accept: 'application/json' } },
  );
  if (!rolesRes.ok) {
    await rolesRes.body?.cancel();
    return 'error';
  }
  const rows = await rolesRes.json().catch(() => null);
  return Array.isArray(rows) && rows.length > 0 ? 'admin' : 'not_admin';
}

// ---------------------------------------------------------------------------
// DNS: every address a host resolves to is checked (resolve.ts). Deno's own
// resolver first; if this runtime cannot use it, DNS-over-HTTPS. If neither
// answers, the lookup throws and the URL is refused — never waved through.
// ---------------------------------------------------------------------------

let resolverLogged = false;
function logResolver(name: string) {
  if (!resolverLogged) console.log(JSON.stringify({ event: 'link-preview-resolver', resolver: name }));
  resolverLogged = true;
}

async function resolveWithDeno(hostname: string, signal: AbortSignal): Promise<string[] | null> {
  if (typeof Deno.resolveDns !== 'function') return null;
  const settled = await Promise.allSettled([
    Deno.resolveDns(hostname, 'A', { signal }),
    Deno.resolveDns(hostname, 'AAAA', { signal }),
  ]);
  const addresses: string[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') addresses.push(...result.value);
    // NotFound for one record type is normal (no AAAA). Anything else means
    // the answer may be incomplete, so this resolver's result is not trusted.
    else if (!(result.reason instanceof Deno.errors.NotFound)) return null;
  }
  logResolver('deno');
  return addresses;
}

async function resolveWithDoh(hostname: string, signal: AbortSignal): Promise<string[]> {
  const addresses: string[] = [];
  for (const type of ['A', 'AAAA'] as const) {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
      { headers: { accept: 'application/dns-json' }, signal },
    );
    if (!res.ok) throw new Error(`DoH HTTP ${res.status}`);
    const body = await res.json();
    if (body?.Status === 3) continue; // NXDOMAIN
    if (body?.Status !== 0) throw new Error(`DoH status ${body?.Status}`);
    for (const answer of Array.isArray(body.Answer) ? body.Answer : []) {
      if ((answer?.type === 1 || answer?.type === 28) && typeof answer.data === 'string') {
        addresses.push(answer.data);
      }
    }
  }
  logResolver('doh');
  return addresses;
}

const deps: ResolveDeps = {
  fetch: (url, init) => fetch(url, init),
  resolveDns: async (hostname, signal) => {
    let addresses: string[] | null = null;
    try {
      addresses = await resolveWithDeno(hostname, signal);
    } catch {
      addresses = null;
    }
    return addresses ?? (await resolveWithDoh(hostname, signal));
  },
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') {
    return json(405, { ok: false, reason: 'method_not_allowed', message: 'Use POST.' });
  }

  // Who is asking — before the body is even read.
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get('Authorization') ?? '')?.[1];
  if (!token) return json(401, { ok: false, reason: 'unauthorized', message: 'Sign in first.' });
  let caller: Caller;
  try {
    caller = await callerRole(token);
  } catch {
    caller = 'error';
  }
  if (caller === 'no_user') return json(401, { ok: false, reason: 'unauthorized', message: 'Sign in first.' });
  if (caller === 'not_admin') {
    return json(403, { ok: false, reason: 'forbidden', message: 'Only the site owner can fetch link details.' });
  }
  if (caller === 'error') {
    return json(503, { ok: false, reason: 'auth_check_failed', message: 'Could not confirm who is asking. Try again.' });
  }

  const length = Number(req.headers.get('content-length') ?? '0');
  if (length > 16_384) return json(413, { ok: false, reason: 'bad_request', message: 'Request too large.' });
  let url = '';
  try {
    const body = await req.json();
    url = typeof body?.url === 'string' ? body.url : '';
  } catch {
    // handled below
  }
  if (!url) {
    return json(400, { ok: false, reason: 'bad_request', message: 'Send JSON: { "url": "https://…" }.' });
  }

  const result = await resolveLinkPreview(url, deps);
  console.log(
    JSON.stringify({
      event: 'link-preview',
      ok: result.ok,
      reason: result.ok ? undefined : result.reason,
      sources: result.ok ? result.sources : undefined,
    }),
  );
  // Resolution failures are normal and answered 200 with { ok: false, reason };
  // the editor falls back to manual entry. Only auth and request errors are 4xx.
  return json(200, result);
});
