/**
 * link-preview: the resolver. Pure logic, with no Deno globals and no imports.
 *
 * It resolves a pasted URL to PLAIN-TEXT metadata (title, description, author,
 * source, date) for the editor's link card. It never returns markup. The
 * network and DNS are passed in (`ResolveDeps`), so the whole SSRF policy is
 * testable offline (tests/unit/linkPreview.test.ts). index.ts wires in the
 * real `fetch` and `Deno.resolveDns`.
 *
 * SSRF policy. The URL comes from a human, and a server that fetches
 * arbitrary URLs can be steered at its own network:
 *   - https: only, port 443 only, no credentials in the URL, no single-label
 *     or local-only host names.
 *   - Every host is resolved (A and AAAA), and ANY non-public address rejects
 *     it: private, loopback, link-local (including 169.254.169.254, the cloud
 *     metadata address), CGNAT, multicast, reserved, documentation, ULA, and
 *     IPv6 forms that tunnel to IPv4. IPv6 is allowlisted to global unicast.
 *   - Redirects are followed by hand, at most 3, and every hop is re-checked
 *     from scratch. A public host redirecting to a private one is the classic
 *     bypass, and it is refused.
 *   - 5 s per fetch (covering DNS, every hop and the body), a 512 KiB body
 *     cap, and only text/html pages and JSON oEmbed responses are parsed.
 *   - Residual: `fetch` resolves the host again after the check (a DNS
 *     rebinding window). HTTPS closes most of it: the certificate must be
 *     valid for the host name, which an internal service will not present
 *     for an attacker's domain.
 *
 * Resolution order (first non-empty value wins, field by field):
 *   1. oEmbed discovered on the page (<link rel="alternate"
 *      type="application/json+oembed">);
 *   2. a known provider's oEmbed endpoint (X, YouTube);
 *   3. the page's own metadata: Open Graph, Twitter card, <meta name>, and
 *      JSON-LD (dates and bylines often live only there);
 *   4. <title>.
 * An oEmbed `html` field (X's blockquote-plus-script) is read for its plain
 * text and then discarded. Provider HTML never leaves this function.
 */

export interface ResolveDeps {
  /** Resolve a host name to its IP addresses (A and AAAA). Throw when it cannot be resolved. */
  resolveDns: (hostname: string, signal: AbortSignal) => Promise<string[]>;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  now?: () => Date;
  /** Per-fetch budget in ms (default 5000). Tests shorten it. */
  timeoutMs?: number;
  /** Body cap in bytes (default 512 KiB). */
  maxBytes?: number;
}

export interface LinkPreviewData {
  title: string;
  description: string;
  author: string;
  authorUrl: string;
  siteName: string;
  /** Calendar date, YYYY-MM-DD, or ''. */
  publishedAt: string;
  /** ISO timestamp of this resolution. */
  resolvedAt: string;
}

export type FailureReason =
  | 'invalid_url'
  | 'scheme_not_allowed'
  | 'port_not_allowed'
  | 'credentials_not_allowed'
  | 'host_not_allowed'
  | 'blocked_address'
  | 'dns_failed'
  | 'timeout'
  | 'too_many_redirects'
  | 'http_status'
  | 'unsupported_content_type'
  | 'too_large'
  | 'fetch_failed'
  | 'no_metadata';

export type LinkPreviewResult =
  | { ok: true; data: LinkPreviewData; finalUrl: string; sources: string[] }
  | { ok: false; reason: FailureReason; message: string };

export const MAX_REDIRECTS = 3;
export const DEFAULT_TIMEOUT_MS = 5000;
export const DEFAULT_MAX_BYTES = 512 * 1024;
const MAX_URL_LENGTH = 2048;
const USER_AGENT = 'Mozilla/5.0 (compatible; dikagustiana-link-preview/1.0; +https://dikagustiana.com)';

type Failure = Extract<LinkPreviewResult, { ok: false }>;
const fail = (reason: FailureReason, message: string): Failure => ({ ok: false, reason, message });

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

/** Strict dotted-quad IPv4 → four octets, or null. */
export function parseIPv4(input: string): number[] | null {
  const parts = input.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    octets.push(n);
  }
  return octets;
}

/** IPv6 (brackets, zone id, `::` and an IPv4 tail accepted) → eight 16-bit groups, or null. */
export function parseIPv6(input: string): number[] | null {
  let s = input.trim();
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  const zone = s.indexOf('%');
  if (zone >= 0) s = s.slice(0, zone);
  if (!s.includes(':')) return null;

  // An embedded IPv4 tail (::ffff:1.2.3.4) becomes two groups.
  const lastColon = s.lastIndexOf(':');
  const tail = s.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    s = `${s.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = s.split('::');
  if (halves.length > 2) return null;
  const parse = (part: string) => (part === '' ? [] : part.split(':'));
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out.length === 8 ? out : null;
}

/**
 * Public IPv4 = not in any IANA special-purpose block that is local, private,
 * reserved or otherwise unroutable on the internet.
 */
function isPublicIPv4([a, b, c]: number[]): boolean {
  if (a === 0) return false; // 0.0.0.0/8 "this network"
  if (a === 10) return false; // 10/8 private
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64/10 CGNAT
  if (a === 127) return false; // 127/8 loopback
  if (a === 169 && b === 254) return false; // 169.254/16 link-local, incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16/12 private
  if (a === 192 && b === 0 && c === 0) return false; // 192.0.0/24 IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return false; // 192.0.2/24 TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return false; // 192.88.99/24 6to4 relay (deprecated)
  if (a === 192 && b === 168) return false; // 192.168/16 private
  if (a === 198 && (b === 18 || b === 19)) return false; // 198.18/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // 198.51.100/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // 203.0.113/24 TEST-NET-3
  if (a >= 224) return false; // 224/4 multicast, 240/4 reserved, 255.255.255.255
  return true;
}

/**
 * Public IPv6 = global unicast (2000::/3) minus the blocks inside it that are
 * not ordinary internet hosts, plus NAT64 when the IPv4 it embeds is public.
 * Everything else (::1, ::, fc00::/7 ULA, fe80::/10, ff00::/8, IPv4-mapped
 * forms with a non-public IPv4 inside, …) is refused.
 */
function isPublicIPv6(g: number[]): boolean {
  // ::ffff:a.b.c.d (IPv4-mapped): judge the IPv4 inside.
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0xffff) {
    return isPublicIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
  }
  // 64:ff9b::/96 (well-known NAT64): judge the IPv4 inside.
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0) {
    return isPublicIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
  }
  if ((g[0] & 0xe000) !== 0x2000) return false; // outside 2000::/3
  if (g[0] === 0x2001 && g[1] === 0x0000) return false; // 2001::/32 Teredo (tunnels to IPv4)
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // 2001:db8::/32 documentation
  if (g[0] === 0x2001 && (g[1] & 0xffe0) === 0x0020) return false; // 2001:20::/28 ORCHIDv2
  if (g[0] === 0x2001 && (g[1] & 0xfff0) === 0x0010) return false; // 2001:10::/28 ORCHID
  if (g[0] === 0x2002) return false; // 2002::/16 6to4 (tunnels to IPv4)
  if (g[0] === 0x3fff && (g[1] & 0xf000) === 0) return false; // 3fff::/20 documentation
  return true;
}

/** True only for an address a public website could legitimately live at. */
export function isPublicAddress(address: string): boolean {
  const v4 = parseIPv4(address);
  if (v4) return isPublicIPv4(v4);
  const v6 = parseIPv6(address);
  if (v6) return isPublicIPv6(v6);
  return false; // unparseable: refuse
}

// ---------------------------------------------------------------------------
// URL policy
// ---------------------------------------------------------------------------

const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa', '.lan'];

/** Everything about a URL that can be judged without the network. */
export function checkUrlShape(input: string | URL): { ok: true; url: URL } | Failure {
  let url: URL;
  try {
    const text = typeof input === 'string' ? input.trim() : input.href;
    if (!text || text.length > MAX_URL_LENGTH) return fail('invalid_url', 'That is not a URL this can fetch.');
    url = typeof input === 'string' ? new URL(text) : input;
  } catch {
    return fail('invalid_url', 'That is not a URL this can fetch.');
  }
  if (url.protocol !== 'https:') {
    return fail('scheme_not_allowed', 'Only https:// links can be fetched.');
  }
  if (url.port !== '' && url.port !== '443') {
    return fail('port_not_allowed', 'Only the standard https port (443) can be fetched.');
  }
  if (url.username || url.password) {
    return fail('credentials_not_allowed', 'Links with a username or password in them are not fetched.');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const isLiteral = parseIPv4(host) !== null || parseIPv6(host) !== null;
  if (!isLiteral) {
    if (!host.includes('.') || host === 'localhost' || LOCAL_SUFFIXES.some(s => host.endsWith(s))) {
      return fail('host_not_allowed', 'That host is not on the public internet.');
    }
  }
  return { ok: true, url };
}

function withSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error('aborted'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new Error('aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      value => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      error => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/** Shape, then DNS: every address the host resolves to must be public. */
export async function checkTarget(
  input: string | URL,
  deps: ResolveDeps,
  signal: AbortSignal,
): Promise<{ ok: true; url: URL } | Failure> {
  const shape = checkUrlShape(input);
  if (!shape.ok) return shape;
  const host = shape.url.hostname.replace(/^\[|\]$/g, '');
  if (parseIPv4(host) || parseIPv6(host)) {
    return isPublicAddress(host)
      ? shape
      : fail('blocked_address', 'That address is not on the public internet.');
  }
  let addresses: string[];
  try {
    addresses = await withSignal(deps.resolveDns(host, signal), signal);
  } catch (error) {
    if (signal.aborted) throw error;
    return fail('dns_failed', 'That host name could not be resolved.');
  }
  if (addresses.length === 0) return fail('dns_failed', 'That host name could not be resolved.');
  if (!addresses.every(isPublicAddress)) {
    return fail('blocked_address', 'That host resolves to an address that is not on the public internet.');
  }
  return shape;
}

// ---------------------------------------------------------------------------
// Guarded fetch
// ---------------------------------------------------------------------------

type Expect = 'html' | 'json';

interface Fetched {
  ok: true;
  text: string;
  truncated: boolean;
  finalUrl: URL;
}

function mediaType(res: Response): string {
  return (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
}

function acceptable(type: string, expect: Expect): boolean {
  if (expect === 'html') return type === 'text/html';
  return type === 'application/json' || type === 'application/json+oembed';
}

function charsetOf(res: Response): string {
  const m = /charset\s*=\s*"?([\w-]+)/i.exec(res.headers.get('content-type') ?? '');
  return m ? m[1] : 'utf-8';
}

async function readCapped(res: Response, maxBytes: number): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!res.body) return { bytes: new Uint8Array(0), truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.byteLength > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - total));
      total = maxBytes;
      truncated = true;
      // Stop reading and drop the rest of the connection.
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, truncated };
}

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/**
 * GET a URL under the full policy: re-checked on every hop, at most
 * MAX_REDIRECTS redirects, one time budget for the whole exchange, capped body.
 */
export async function guardedFetch(start: string | URL, expect: Expect, deps: ResolveDeps): Promise<Fetched | Failure> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = deps.maxBytes ?? DEFAULT_MAX_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const { signal } = controller;
  try {
    let current: string | URL = start;
    for (let hop = 0; ; hop++) {
      const target = await checkTarget(current, deps, signal);
      if (!target.ok) return target;

      const res = await deps.fetch(target.url.href, {
        method: 'GET',
        redirect: 'manual',
        signal,
        headers: {
          accept: expect === 'html' ? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' : 'application/json',
          'user-agent': USER_AGENT,
        },
      });

      if (REDIRECTS.has(res.status)) {
        await res.body?.cancel().catch(() => {});
        const location = res.headers.get('location');
        if (!location) return fail('http_status', `The server answered ${res.status} without saying where to go.`);
        if (hop >= MAX_REDIRECTS) {
          return fail('too_many_redirects', `The link redirected more than ${MAX_REDIRECTS} times.`);
        }
        try {
          current = new URL(location, target.url);
        } catch {
          return fail('invalid_url', 'The link redirected to an address that is not a URL.');
        }
        continue;
      }

      if (res.status < 200 || res.status > 299) {
        await res.body?.cancel().catch(() => {});
        return fail('http_status', `The page answered HTTP ${res.status}.`);
      }
      const type = mediaType(res);
      if (!acceptable(type, expect)) {
        await res.body?.cancel().catch(() => {});
        return fail('unsupported_content_type', `The link is ${type || 'not a web page'}, not ${expect === 'html' ? 'a web page' : 'JSON'}.`);
      }
      const { bytes, truncated } = await readCapped(res, maxBytes);
      // A truncated page still has its <head>; truncated JSON is unusable.
      if (truncated && expect === 'json') return fail('too_large', 'The response was larger than this will read.');
      let decoder: TextDecoder;
      try {
        decoder = new TextDecoder(charsetOf(res));
      } catch {
        decoder = new TextDecoder('utf-8');
      }
      return { ok: true, text: decoder.decode(bytes), truncated, finalUrl: target.url };
    }
  } catch {
    if (signal.aborted) return fail('timeout', `The link did not answer within ${Math.round(timeoutMs / 1000)} seconds.`);
    return fail('fetch_failed', 'The link could not be fetched.');
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–',
  hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', middot: '·', bull: '•',
  laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™', times: '×', eacute: 'é',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** Markup → one line of plain text: tags removed, entities decoded, whitespace and control characters collapsed. */
export function plainText(html: string, max = 500): string {
  const text = noControls(decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ')))
    .replace(/\s+/g, ' ')
    .trim();
  return clip(text, max);
}

/** Already-decoded text → one clean line (no tag stripping, no second decode). */
function cleanText(text: string, max: number): string {
  return clip(noControls(text).replace(/\s+/g, ' ').trim(), max);
}

/** C0 control characters and DEL become spaces (no regex: both linters flag control ranges). */
function noControls(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    out += code < 0x20 || code === 0x7f ? ' ' : ch;
  }
  return out;
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function httpUrl(value: unknown, base?: URL): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = base ? new URL(value.trim(), base) : new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.href.length <= MAX_URL_LENGTH ? url.href : '';
  } catch {
    return '';
  }
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** A date in any common shape → YYYY-MM-DD, keeping the calendar date as written; '' when unreadable. */
export function toCalendarDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // "March 21, 2006" (X's oEmbed) and "21 March 2006".
  const mdy = /^([A-Za-z]+)\.? (\d{1,2}),? (\d{4})$/.exec(text);
  const dmy = /^(\d{1,2}) ([A-Za-z]+)\.? (\d{4})$/.exec(text);
  const parts = mdy ? { month: mdy[1], day: mdy[2], year: mdy[3] } : dmy ? { month: dmy[2], day: dmy[1], year: dmy[3] } : null;
  if (parts) {
    const m = MONTHS.findIndex(name => name.startsWith(parts.month.toLowerCase()) && parts.month.length >= 3);
    const d = Number(parts.day);
    if (m >= 0 && d >= 1 && d <= 31) return `${parts.year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// HTML metadata
// ---------------------------------------------------------------------------

function attributes(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const body = tag.replace(/^<\s*[a-z0-9-]+/i, '').replace(/\/?>$/, '');
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (let m = re.exec(body); m; m = re.exec(body)) {
    const name = m[1].toLowerCase();
    if (!attrs.has(name)) attrs.set(name, decodeEntities(m[2] ?? m[3] ?? m[4] ?? ''));
  }
  return attrs;
}

/** One start tag, allowing '>' inside quoted attribute values. */
const TAG = (name: string) => new RegExp(`<${name}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi');

export interface PageMetadata {
  /** First value per key; keys are the meta's property/name/itemprop, lower-cased. */
  meta: Map<string, string>;
  oembedUrl: string;
  authorLink: string;
  title: string;
  jsonLd: unknown[];
}

export function parseHtmlMetadata(html: string, base: URL): PageMetadata {
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd >= 0 ? html.slice(0, headEnd) : html;

  const meta = new Map<string, string>();
  for (const tag of head.match(TAG('meta')) ?? []) {
    const a = attributes(tag);
    const key = (a.get('property') || a.get('name') || a.get('itemprop') || '').toLowerCase();
    const content = a.get('content');
    if (key && content && !meta.has(key)) meta.set(key, content);
  }

  let oembedUrl = '';
  let authorLink = '';
  for (const tag of head.match(TAG('link')) ?? []) {
    const a = attributes(tag);
    const rel = (a.get('rel') ?? '').toLowerCase().split(/\s+/);
    const type = (a.get('type') ?? '').toLowerCase();
    if (!oembedUrl && rel.includes('alternate') && type === 'application/json+oembed') oembedUrl = httpUrl(a.get('href'), base);
    if (!authorLink && rel.includes('author')) authorLink = httpUrl(a.get('href'), base);
  }

  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const title = titleMatch ? plainText(titleMatch[1], 300) : '';

  // JSON-LD may sit in <body>, so the whole (capped) document is searched.
  const jsonLd: unknown[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[1].length > 200_000) continue;
    try {
      const parsed: unknown = JSON.parse(m[1]);
      const stack: unknown[] = [parsed];
      while (stack.length && jsonLd.length < 50) {
        const item = stack.pop();
        if (Array.isArray(item)) stack.push(...item);
        else if (item && typeof item === 'object') {
          jsonLd.push(item);
          const graph = (item as Record<string, unknown>)['@graph'];
          if (Array.isArray(graph)) stack.push(...graph);
        }
      }
    } catch {
      // A malformed block is someone else's bug; skip it.
    }
  }

  return { meta, oembedUrl, authorLink, title, jsonLd };
}

function field(obj: unknown, key: string): unknown {
  return obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined;
}

function typeOf(obj: unknown): string[] {
  const t = field(obj, '@type');
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string');
}

/** The first Person (else any) author in JSON-LD: { name, url, person }. */
function jsonLdAuthor(items: unknown[]): { name: string; url: string; person: boolean } {
  let fallback = { name: '', url: '', person: false };
  for (const item of items) {
    const raw = field(item, 'author');
    for (const a of Array.isArray(raw) ? raw : raw ? [raw] : []) {
      const name = typeof a === 'string' ? a : field(a, 'name');
      if (typeof name !== 'string' || !name.trim() || /^https?:\/\//i.test(name)) continue;
      const person = typeOf(a).includes('Person');
      const found = { name: plainText(name, 200), url: httpUrl(field(a, 'url')), person };
      if (person) return found;
      if (!fallback.name) fallback = found;
    }
  }
  return fallback;
}

function firstJsonLd(items: unknown[], key: string): string {
  for (const item of items) {
    const value = field(item, key);
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function publisherName(items: unknown[]): string {
  for (const item of items) {
    const name = field(field(item, 'publisher'), 'name');
    if (typeof name === 'string' && name.trim()) return plainText(name, 100);
  }
  return '';
}

function fromPage(page: PageMetadata): Partial<LinkPreviewData> {
  const m = (key: string) => page.meta.get(key) ?? '';
  const ld = jsonLdAuthor(page.jsonLd);
  const metaAuthor = [m('author'), m('article:author')].find(v => v && !/^https?:\/\//i.test(v)) ?? '';
  // Meta values arrive decoded (attributes()); JSON-LD strings are raw text.
  return {
    title: cleanText(m('og:title') || m('twitter:title'), 300) || plainText(firstJsonLd(page.jsonLd, 'headline'), 300),
    description: cleanText(m('og:description') || m('twitter:description') || m('description'), 500),
    author: ld.person ? ld.name : cleanText(metaAuthor, 200) || ld.name,
    authorUrl: (ld.person ? ld.url : '') || page.authorLink,
    siteName: cleanText(m('og:site_name') || m('application-name'), 100) || publisherName(page.jsonLd),
    publishedAt: toCalendarDate(
      m('article:published_time') || m('og:article:published_time') || m('datepublished') || firstJsonLd(page.jsonLd, 'datePublished'),
    ),
  };
}

// ---------------------------------------------------------------------------
// oEmbed
// ---------------------------------------------------------------------------

/**
 * Plain text out of an oEmbed `html` field; the markup itself is discarded.
 * X sends `<blockquote><p>post text</p>&mdash; name (@handle) <a …>Month D,
 * YYYY</a></blockquote><script …>`: the <p> is the post, the last link its date.
 */
export function oembedHtmlText(html: string): { text: string; date: string } {
  const noScript = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<(iframe|style)\b[\s\S]*?<\/\1>/gi, '');
  const quote = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i.exec(noScript);
  if (quote) {
    const para = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(quote[1]);
    const links = [...quote[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)];
    const lastLink = links.length ? plainText(links[links.length - 1][1], 60) : '';
    return { text: plainText(para ? para[1] : quote[1], 1000), date: toCalendarDate(lastLink) };
  }
  return { text: plainText(noScript, 1000), date: '' };
}

function fromOEmbed(json: unknown): Partial<LinkPreviewData> {
  if (!json || typeof json !== 'object') return {};
  const o = json as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === 'string' ? cleanText(decodeEntities(v), max) : '');
  const title = text(o.title, 300);
  const post = typeof o.html === 'string' ? oembedHtmlText(o.html) : { text: '', date: '' };
  return {
    // A post has no title; its words are the headline.
    title: title || clip(post.text, 300),
    description: title ? clip(post.text, 500) : post.text.length > 300 ? clip(post.text, 500) : '',
    author: text(o.author_name, 200),
    authorUrl: httpUrl(o.author_url),
    siteName: text(o.provider_name, 100),
    publishedAt: post.date,
  };
}

/** Providers whose pages are not the place to look, with their public oEmbed endpoints. */
export function providerEndpoint(url: URL): { name: string; endpoint: string } | null {
  const host = url.hostname.toLowerCase().replace(/^www\.|^mobile\.|^m\./, '');
  const encoded = encodeURIComponent(url.href);
  if ((host === 'x.com' || host === 'twitter.com') && /^\/[^/]+\/status(es)?\/\d+/.test(url.pathname)) {
    return { name: 'x', endpoint: `https://publish.x.com/oembed?url=${encoded}&omit_script=1&dnt=true` };
  }
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') {
    return { name: 'youtube', endpoint: `https://www.youtube.com/oembed?format=json&url=${encoded}` };
  }
  return null;
}

async function fetchOEmbed(endpoint: string, deps: ResolveDeps): Promise<Partial<LinkPreviewData> | null> {
  const res = await guardedFetch(endpoint, 'json', deps);
  if (!res.ok) return null;
  try {
    return fromOEmbed(JSON.parse(res.text));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The whole resolution
// ---------------------------------------------------------------------------

const FIELDS = ['title', 'description', 'author', 'authorUrl', 'siteName', 'publishedAt'] as const;

export async function resolveLinkPreview(input: string, deps: ResolveDeps): Promise<LinkPreviewResult> {
  const shape = checkUrlShape(input);
  if (!shape.ok) return shape;
  const url = shape.url;

  const layers: Partial<LinkPreviewData>[] = [];
  const sources: string[] = [];
  let finalUrl = url;
  let pageFailure: Failure | null = null;
  let page: PageMetadata | null = null;

  const fetched = await guardedFetch(url, 'html', deps);
  if (fetched.ok) {
    finalUrl = fetched.finalUrl;
    page = parseHtmlMetadata(fetched.text, fetched.finalUrl);
  } else {
    pageFailure = fetched;
    // A URL the policy refuses is refused outright; there is nothing to fall back to.
    if (['invalid_url', 'scheme_not_allowed', 'port_not_allowed', 'credentials_not_allowed', 'host_not_allowed', 'blocked_address'].includes(fetched.reason)) {
      return fetched;
    }
  }

  // 1. oEmbed discovered on the page.
  if (page?.oembedUrl) {
    const o = await fetchOEmbed(page.oembedUrl, deps);
    if (o) {
      layers.push(o);
      sources.push('oembed-discovery');
    }
  }
  // 2. A known provider's endpoint, when discovery found nothing.
  const provider = providerEndpoint(url);
  if (provider && !sources.length) {
    const o = await fetchOEmbed(provider.endpoint, deps);
    if (o) {
      layers.push(o);
      sources.push(`provider:${provider.name}`);
    }
  }
  // 3 and 4. The page's own metadata, then its <title>.
  if (page) {
    layers.push(fromPage(page));
    sources.push('meta');
    if (page.title) {
      layers.push({ title: page.title });
      sources.push('title');
    }
  }

  const data: LinkPreviewData = {
    title: '',
    description: '',
    author: '',
    authorUrl: '',
    siteName: '',
    publishedAt: '',
    resolvedAt: (deps.now?.() ?? new Date()).toISOString(),
  };
  for (const key of FIELDS) {
    data[key] = layers.map(layer => layer[key] ?? '').find(value => value.trim()) ?? '';
  }
  // A byline that only repeats the publication says nothing, and neither does
  // a description that repeats the title (X's page describes a post with the
  // post's own words, which are already its title).
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  if (data.author && same(data.author, data.siteName)) {
    data.author = '';
    data.authorUrl = '';
  }
  if (data.description && same(data.description, data.title)) data.description = '';

  if (!data.title && !data.description) {
    return pageFailure ?? fail('no_metadata', 'The page carries no title or description to show.');
  }
  return { ok: true, data, finalUrl: finalUrl.href, sources };
}
