/**
 * toolkit-file — short-lived signed URLs for the Toolkits page's files in
 * Cloudflare R2 (docs/prd/finance-restructure §1 E, §4 Toolkits). The bucket
 * is private (dg-books-public, prefix toolkits/); this function hands out
 * URLs, never bytes.
 *
 *   read   { slug, version? }  anyone the rows' RLS lets see the toolkit
 *          (published, or anything for the admin): a GET URL for one hour
 *          with Content-Disposition attachment, for the asked version or the
 *          latest. 404 when RLS hides the toolkit or the version.
 *   upload { slug, version, filename, contentType, size }  admin: a PUT URL
 *          for ten minutes and the key to store on the version row. The key
 *          is new for every version; a key that already holds an object is
 *          refused (409), so no upload overwrites a published file.
 *
 * Authorisation as book-file (config.toml): verify_jwt = true, and every check
 * again here from the caller's own token. Rows are read through PostgREST WITH
 * THAT TOKEN, so RLS decides what a reader may download; the admin check reads
 * the caller's own public.user_roles row. No service-role client. The R2
 * credentials are the Edge Function secrets book-file already uses
 * (R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY), never
 * logged; without all four every action answers 503 not_configured.
 */

import { r2Configured, r2FromEnv, signR2 } from '../_shared/r2.ts';
import {
  READ_TTL_SECONDS,
  WRITE_TTL_SECONDS,
  XLSX_TYPE,
  attachment,
  isJwt,
  objectKey,
  parseRequest,
  pickVersion,
  type VersionRow,
} from './rules.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

/** The project's public key, on `apikey` only; see link-preview/index.ts. */
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

const R2 = r2FromEnv((name) => Deno.env.get(name));

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Headers that make PostgREST and Auth act as the caller: their JWT, or anon. */
const asCaller = (token: string | undefined): Record<string, string> =>
  token && isJwt(token) ? { apikey: API_KEY, Authorization: `Bearer ${token}` } : { apikey: API_KEY };

type Caller = 'admin' | 'not_admin' | 'no_user' | 'error';

async function callerRole(token: string | undefined): Promise<Caller> {
  if (!token || !isJwt(token)) return 'no_user';
  const headers = asCaller(token);
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

/** The versions of the toolkit RLS lets this caller see, or null when it sees no such toolkit. */
async function findVersions(token: string | undefined, slug: string): Promise<VersionRow[] | null | 'error'> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/toolkits?select=slug,toolkit_versions(version,file_key,published_at)&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { headers: { ...asCaller(token), Accept: 'application/json' } },
  );
  if (!res.ok) {
    await res.body?.cancel();
    return 'error';
  }
  const rows = await res.json().catch(() => null);
  const row = Array.isArray(rows) ? (rows[0] as { toolkit_versions?: VersionRow[] } | undefined) : undefined;
  return row ? row.toolkit_versions ?? [] : null;
}

const log = (fields: Record<string, unknown>) => console.log(JSON.stringify({ event: 'toolkit-file', ...fields }));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, reason: 'method_not_allowed', message: 'Use POST.' });
  if (!r2Configured(R2)) return json(503, { ok: false, reason: 'not_configured', message: 'Toolkit files are not set up yet.' });

  if (Number(req.headers.get('content-length') ?? '0') > 4096) {
    return json(413, { ok: false, reason: 'bad_request', message: 'Request too large.' });
  }
  const parsed = parseRequest(await req.json().catch(() => null));
  if (!parsed.ok) return json(400, { ok: false, reason: 'bad_request', message: parsed.message });
  const r = parsed.req;
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get('Authorization') ?? '')?.[1];

  try {
    if (r.action === 'read') {
      const versions = await findVersions(token, r.slug);
      if (versions === 'error') return json(503, { ok: false, reason: 'lookup_failed', message: 'Could not look the toolkit up. Try again.' });
      const v = versions ? pickVersion(versions, r.version) : null;
      if (!v) return json(404, { ok: false, reason: 'not_found' });
      const url = await signR2(R2, 'GET', v.file_key, READ_TTL_SECONDS, {
        'response-content-type': XLSX_TYPE,
        'response-content-disposition': attachment(v.file_key),
      });
      log({ action: 'read', latest: r.version === null });
      return json(200, { ok: true, url, version: v.version, filename: v.file_key.split('/').pop(), expiresIn: READ_TTL_SECONDS });
    }

    const caller = await callerRole(token);
    if (caller === 'no_user') return json(401, { ok: false, reason: 'unauthorized', message: 'Sign in first.' });
    if (caller === 'not_admin') return json(403, { ok: false, reason: 'forbidden', message: 'Only the site owner can upload toolkits.' });
    if (caller === 'error') return json(503, { ok: false, reason: 'auth_check_failed', message: 'Could not confirm who is asking. Try again.' });

    const key = objectKey(r.slug, r.version);
    const head = await fetch(await signR2(R2, 'HEAD', key, 60), { method: 'HEAD' });
    await head.body?.cancel();
    if (head.ok) return json(409, { ok: false, reason: 'exists', message: `Version ${r.version} already has a file; publish a new version.` });
    if (head.status !== 404) return json(502, { ok: false, reason: 'storage_failed', message: 'Could not check the bucket. Try again.' });
    const url = await signR2(R2, 'PUT', key, WRITE_TTL_SECONDS);
    log({ action: 'upload', size: r.size });
    return json(200, { ok: true, key, url, contentType: XLSX_TYPE, expiresIn: WRITE_TTL_SECONDS });
  } catch (e) {
    log({ action: r.action, error: e instanceof Error ? e.name : 'unknown' });
    return json(500, { ok: false, reason: 'internal', message: 'Something went wrong. Try again.' });
  }
});
