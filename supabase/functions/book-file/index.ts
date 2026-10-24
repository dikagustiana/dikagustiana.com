/**
 * book-file — short-lived signed URLs for the Books page's files in
 * Cloudflare R2 (docs/books/R2-RUNBOOK.md; docs/DECISIONS.md, "Books on R2:
 * signed URLs, no public bucket"). The bucket is private; this function is
 * the only thing that can name an object in it, and it hands out URLs, never
 * bytes.
 *
 *   read   { slug, as: "inline" | "download" }  anyone the row's RLS lets see
 *          the book: a GET URL for one hour, with the type and the file name
 *          the reader or the download needs. 404 when RLS hides the row.
 *   upload { slug, filename, contentType, size } admin: a PUT URL for ten
 *          minutes and the key to store on the row.
 *   remove { key } admin: deletes one files/… object.
 *
 * Authorisation, as link-preview (config.toml): verify_jwt = true, and every
 * check again here from the caller's own token. The row is read through
 * PostgREST WITH THAT TOKEN, so RLS decides what a reader may open (published
 * and live, or anything for the admin); the admin check reads the caller's own
 * public.user_roles row. No service-role or secret-key client exists in this
 * function. The R2 credentials are Edge Function secrets (R2_ACCOUNT_ID,
 * R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY), never logged; without
 * all four every action answers 503 not_configured.
 */

import { presign } from './sigv4.ts';
import {
  READ_TTL_SECONDS,
  WRITE_TTL_SECONDS,
  contentDisposition,
  contentTypeOf,
  downloadName,
  isJwt,
  objectKey,
  parseRequest,
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

const R2 = {
  account: Deno.env.get('R2_ACCOUNT_ID') ?? '',
  bucket: Deno.env.get('R2_BUCKET') ?? '',
  keyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
  secret: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
};
const configured = () => !!(R2.account && R2.bucket && R2.keyId && R2.secret);

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

const sign = (method: 'GET' | 'PUT' | 'DELETE', key: string, expires: number, query?: Record<string, string>) =>
  presign({
    method,
    host: `${R2.account}.r2.cloudflarestorage.com`,
    path: `/${R2.bucket}/${key}`,
    region: 'auto',
    service: 's3',
    accessKeyId: R2.keyId,
    secretAccessKey: R2.secret,
    expires,
    now: new Date(),
    query,
  });

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

interface BookRow {
  slug: string;
  title: string | null;
  filepath: string | null;
  file_store: 'supabase' | 'r2';
}

/** The free, live book RLS lets this caller see, or null. */
async function findBook(token: string | undefined, slug: string): Promise<BookRow | null | 'error'> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/books_uploads?select=slug,title,filepath,file_store&slug=eq.${encodeURIComponent(slug)}&access=eq.free&deleted_at=is.null&limit=1`,
    { headers: { ...asCaller(token), Accept: 'application/json' } },
  );
  if (!res.ok) {
    await res.body?.cancel();
    return 'error';
  }
  const rows = await res.json().catch(() => null);
  const row = Array.isArray(rows) ? (rows[0] as BookRow | undefined) : undefined;
  return row && row.filepath ? row : null;
}

const log = (fields: Record<string, unknown>) => console.log(JSON.stringify({ event: 'book-file', ...fields }));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, reason: 'method_not_allowed', message: 'Use POST.' });
  if (!configured()) return json(503, { ok: false, reason: 'not_configured', message: 'Book files are not set up yet.' });

  if (Number(req.headers.get('content-length') ?? '0') > 4096) {
    return json(413, { ok: false, reason: 'bad_request', message: 'Request too large.' });
  }
  const parsed = parseRequest(await req.json().catch(() => null));
  if (!parsed.ok) return json(400, { ok: false, reason: 'bad_request', message: parsed.message });
  const r = parsed.req;
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get('Authorization') ?? '')?.[1];

  try {
    if (r.action === 'read') {
      const book = await findBook(token, r.slug);
      if (book === 'error') return json(503, { ok: false, reason: 'lookup_failed', message: 'Could not look the book up. Try again.' });
      if (!book) return json(404, { ok: false, reason: 'not_found' });
      const key = book.filepath!;
      const name = downloadName(book.title, book.slug, key);
      const type = contentTypeOf(key);
      let url: string;
      if (book.file_store === 'r2') {
        url = await sign('GET', key, READ_TTL_SECONDS, {
          'response-content-type': type,
          'response-content-disposition': contentDisposition(r.as, name),
        });
      } else {
        // Files uploaded before R2 stay in the public `books` bucket.
        const base = `${SUPABASE_URL}/storage/v1/object/public/books/${key.split('/').map(encodeURIComponent).join('/')}`;
        url = r.as === 'download' ? `${base}?download=${encodeURIComponent(name)}` : base;
      }
      log({ action: 'read', as: r.as, store: book.file_store });
      return json(200, { ok: true, url, contentType: type, filename: name, expiresIn: READ_TTL_SECONDS });
    }

    const caller = await callerRole(token);
    if (caller === 'no_user') return json(401, { ok: false, reason: 'unauthorized', message: 'Sign in first.' });
    if (caller === 'not_admin') return json(403, { ok: false, reason: 'forbidden', message: 'Only the site owner can change book files.' });
    if (caller === 'error') return json(503, { ok: false, reason: 'auth_check_failed', message: 'Could not confirm who is asking. Try again.' });

    if (r.action === 'upload') {
      const key = objectKey(r.slug, r.filename, Date.now());
      const url = await sign('PUT', key, WRITE_TTL_SECONDS);
      log({ action: 'upload', size: r.size });
      return json(200, { ok: true, key, url, contentType: r.contentType, expiresIn: WRITE_TTL_SECONDS });
    }

    const res = await fetch(await sign('DELETE', r.key, 60), { method: 'DELETE' });
    await res.body?.cancel();
    log({ action: 'remove', status: res.status });
    if (!res.ok && res.status !== 404) return json(502, { ok: false, reason: 'storage_failed', message: 'The file could not be removed.' });
    return json(200, { ok: true });
  } catch (e) {
    log({ action: r.action, error: e instanceof Error ? e.name : 'unknown' });
    return json(500, { ok: false, reason: 'internal', message: 'Something went wrong. Try again.' });
  }
});
