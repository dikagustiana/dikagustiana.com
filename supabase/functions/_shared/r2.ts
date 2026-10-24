/**
 * Cloudflare R2 for the edge functions that sign URLs into the private bucket
 * (book-file, toolkit-file): AWS Signature Version 4, query-string form (a
 * presigned URL), on WebCrypto alone, so it runs unchanged in Deno (the edge
 * functions) and in Node (the unit tests, tests/unit/bookFile.test.ts, which
 * check it against AWS's own published example). R2 speaks the S3 API at
 * https://<account>.r2.cloudflarestorage.com with region "auto".
 *
 * Moved here from book-file/sigv4.ts (docs/prd/finance-restructure §4,
 * Storage). Nothing in this file reads the environment: each function passes
 * its own `Deno.env.get` to r2FromEnv, so the tests import it as they are.
 *
 * Only `host` is signed and the payload is UNSIGNED-PAYLOAD: the URL is the
 * whole credential, short-lived, for one method on one object.
 */

export interface PresignInput {
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD';
  host: string;
  /** The object's path, unencoded, starting with "/" (path style: /<bucket>/<key>). */
  path: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Seconds, 1 to 604800. */
  expires: number;
  now: Date;
  /** Extra signed query parameters, e.g. response-content-disposition. */
  query?: Record<string, string>;
}

const enc = new TextEncoder();

/** RFC 3986 encoding, as SigV4 wants it: everything but A–Z a–z 0–9 - _ . ~ */
export function uriEncode(s: string, keepSlash = false): string {
  let out = '';
  for (const byte of enc.encode(s)) {
    const c = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-_.~]/.test(c) || (keepSlash && c === '/')) out += c;
    else out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(data));
}

/** 20130524T000000Z */
export const amzDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export async function presign(p: PresignInput): Promise<string> {
  const stamp = amzDate(p.now);
  const day = stamp.slice(0, 8);
  const scope = `${day}/${p.region}/${p.service}/aws4_request`;
  const params: Record<string, string> = {
    ...(p.query ?? {}),
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${p.accessKeyId}/${scope}`,
    'X-Amz-Date': stamp,
    'X-Amz-Expires': String(p.expires),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(params)
    .map((k) => [uriEncode(k), uriEncode(params[k])] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const canonicalPath = uriEncode(p.path, true);
  const canonicalRequest = [p.method, canonicalPath, canonicalQuery, `host:${p.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', stamp, scope, await sha256Hex(canonicalRequest)].join('\n');

  let key = await hmac(enc.encode(`AWS4${p.secretAccessKey}`), day);
  key = await hmac(key, p.region);
  key = await hmac(key, p.service);
  key = await hmac(key, 'aws4_request');
  const signature = hex(await hmac(key, stringToSign));

  return `https://${p.host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** The four Edge Function secrets every R2 caller needs. */
export interface R2Config {
  account: string;
  bucket: string;
  keyId: string;
  secret: string;
}

export const r2FromEnv = (get: (name: string) => string | undefined): R2Config => ({
  account: get('R2_ACCOUNT_ID') ?? '',
  bucket: get('R2_BUCKET') ?? '',
  keyId: get('R2_ACCESS_KEY_ID') ?? '',
  secret: get('R2_SECRET_ACCESS_KEY') ?? '',
});

export const r2Configured = (r2: R2Config) => !!(r2.account && r2.bucket && r2.keyId && r2.secret);

/** A presigned URL for one method on one object of the bucket, signed now. */
export const signR2 = (
  r2: R2Config,
  method: PresignInput['method'],
  key: string,
  expires: number,
  query?: Record<string, string>,
  now: Date = new Date(),
) =>
  presign({
    method,
    host: `${r2.account}.r2.cloudflarestorage.com`,
    path: `/${r2.bucket}/${key}`,
    region: 'auto',
    service: 's3',
    accessKeyId: r2.keyId,
    secretAccessKey: r2.secret,
    expires,
    now,
    query,
  });
