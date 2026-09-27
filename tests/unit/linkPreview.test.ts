/**
 * The link-preview edge function's resolver, offline.
 *
 * supabase/functions/link-preview/resolve.ts takes its network and DNS as
 * arguments, so the SSRF policy is exercised here with a fake of both: no
 * request leaves the machine, and every refusal is checked to happen BEFORE
 * the refused address is contacted. The deployed function is tested against
 * the real network separately (docs/GATE_LEDGER.md, gates E/F).
 */

import { describe, it, expect } from 'vitest';
import {
  resolveLinkPreview,
  isPublicAddress,
  parseIPv6,
  toCalendarDate,
  oembedHtmlText,
  MAX_REDIRECTS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_BYTES,
  type ResolveDeps,
} from '../../supabase/functions/link-preview/resolve';

type Route = (init: RequestInit) => Response | Promise<Response>;

/** A fake network: routes by exact URL, a DNS table, and a log of every fetch and lookup. */
function net(routes: Record<string, Route>, dns: Record<string, string[]>, extra: Partial<ResolveDeps> = {}) {
  const fetched: string[] = [];
  const looked: string[] = [];
  const deps: ResolveDeps = {
    resolveDns: async host => {
      looked.push(host);
      if (host in dns) return dns[host];
      throw new Error('NXDOMAIN');
    },
    fetch: async (url, init) => {
      fetched.push(url);
      const route = routes[url];
      if (!route) return new Response('missing', { status: 404, headers: { 'content-type': 'text/html' } });
      return route(init);
    },
    now: () => new Date('2026-09-27T08:00:00.000Z'),
    timeoutMs: 150,
    ...extra,
  };
  return { deps, fetched, looked };
}

const page = (body: string, type = 'text/html; charset=utf-8'): Route => () =>
  new Response(body, { status: 200, headers: { 'content-type': type } });
const jsonRoute = (value: unknown, type = 'application/json'): Route => () =>
  new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': type } });
const redirect = (to: string, status = 302): Route => () =>
  new Response(null, { status, headers: { location: to } });

const PUBLIC = ['93.184.216.34'];

describe('SSRF policy: refused before anything is contacted', () => {
  it('http:// is rejected without a lookup or a fetch', async () => {
    const { deps, fetched, looked } = net({}, { 'example.com': PUBLIC });
    const r = await resolveLinkPreview('http://example.com/post', deps);
    expect(r).toMatchObject({ ok: false, reason: 'scheme_not_allowed' });
    expect(fetched).toEqual([]);
    expect(looked).toEqual([]);
  });

  it.each(['ftp://example.com/x', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,hi'])(
    '%s is rejected',
    async input => {
      const { deps, fetched } = net({}, {});
      const r = await resolveLinkPreview(input, deps);
      expect(r.ok).toBe(false);
      expect(fetched).toEqual([]);
    },
  );

  it.each([
    ['the cloud metadata address', 'https://169.254.169.254/latest/meta-data/'],
    ['loopback', 'https://127.0.0.1/'],
    ['loopback, decimal spelling', 'https://2130706433/'],
    ['loopback, hex spelling', 'https://0x7f.0.0.1/'],
    ['private 10/8', 'https://10.1.2.3/'],
    ['private 172.16/12', 'https://172.20.0.1/'],
    ['private 192.168/16', 'https://192.168.1.1/'],
    ['IPv6 loopback', 'https://[::1]/'],
    ['IPv4-mapped loopback', 'https://[::ffff:127.0.0.1]/'],
    ['IPv6 unique-local fc00::/7', 'https://[fd12:3456::1]/'],
    ['IPv6 link-local', 'https://[fe80::1]/'],
  ])('%s is blocked', async (_name, input) => {
    const { deps, fetched } = net({}, {});
    const r = await resolveLinkPreview(input, deps);
    expect(r).toMatchObject({ ok: false, reason: 'blocked_address' });
    expect(fetched).toEqual([]);
  });

  it('a host name that resolves to a private address is blocked, unfetched', async () => {
    const { deps, fetched, looked } = net({}, { 'intranet.example.com': ['10.0.0.5'] });
    const r = await resolveLinkPreview('https://intranet.example.com/', deps);
    expect(r).toMatchObject({ ok: false, reason: 'blocked_address' });
    expect(looked).toEqual(['intranet.example.com']);
    expect(fetched).toEqual([]);
  });

  it('ONE private address among public ones is enough to block', async () => {
    const { deps, fetched } = net({}, { 'mixed.example.com': ['93.184.216.34', '::1'] });
    const r = await resolveLinkPreview('https://mixed.example.com/', deps);
    expect(r).toMatchObject({ ok: false, reason: 'blocked_address' });
    expect(fetched).toEqual([]);
  });

  it.each([
    ['a non-443 port', 'https://example.com:8443/', 'port_not_allowed'],
    ['credentials in the URL', 'https://user:pass@example.com/', 'credentials_not_allowed'],
    ['a single-label host', 'https://intranet/', 'host_not_allowed'],
    ['localhost', 'https://localhost/', 'host_not_allowed'],
    ['a .internal name', 'https://metadata.google.internal/', 'host_not_allowed'],
    ['not a URL at all', 'not a url', 'invalid_url'],
  ])('%s is rejected', async (_name, input, reason) => {
    const { deps, fetched } = net({}, {});
    const r = await resolveLinkPreview(input, deps);
    expect(r).toMatchObject({ ok: false, reason });
    expect(fetched).toEqual([]);
  });
});

describe('SSRF policy: redirects are re-checked at every hop', () => {
  it('a public host redirecting to a private address is refused, and the private address is never fetched', async () => {
    const { deps, fetched } = net(
      { 'https://public.example.com/go': redirect('https://127.0.0.1/admin') },
      { 'public.example.com': PUBLIC },
    );
    const r = await resolveLinkPreview('https://public.example.com/go', deps);
    expect(r).toMatchObject({ ok: false, reason: 'blocked_address' });
    expect(fetched).toEqual(['https://public.example.com/go']);
  });

  it('…and so is a redirect to a NAME that resolves privately', async () => {
    const { deps, fetched } = net(
      { 'https://public.example.com/go': redirect('https://sneaky.example.net/') },
      { 'public.example.com': PUBLIC, 'sneaky.example.net': ['169.254.169.254'] },
    );
    const r = await resolveLinkPreview('https://public.example.com/go', deps);
    expect(r).toMatchObject({ ok: false, reason: 'blocked_address' });
    expect(fetched).toEqual(['https://public.example.com/go']);
  });

  it('…and a downgrade to http://', async () => {
    const { deps, fetched } = net(
      { 'https://public.example.com/go': redirect('http://public.example.com/plain', 301) },
      { 'public.example.com': PUBLIC },
    );
    const r = await resolveLinkPreview('https://public.example.com/go', deps);
    expect(r).toMatchObject({ ok: false, reason: 'scheme_not_allowed' });
    expect(fetched).toHaveLength(1);
  });

  it(`follows exactly ${MAX_REDIRECTS} redirects, and refuses a fourth`, async () => {
    const hosts = { 'a.example.com': PUBLIC };
    const chain = (n: number): Record<string, Route> => {
      const routes: Record<string, Route> = {};
      for (let i = 0; i < n; i++) routes[`https://a.example.com/${i}`] = redirect(`https://a.example.com/${i + 1}`);
      routes[`https://a.example.com/${n}`] = page('<html><head><title>Arrived</title></head></html>');
      return routes;
    };
    const three = net(chain(3), hosts);
    const ok = await resolveLinkPreview('https://a.example.com/0', three.deps);
    expect(ok).toMatchObject({ ok: true, finalUrl: 'https://a.example.com/3' });
    expect(three.fetched).toHaveLength(4);

    const four = net(chain(4), hosts);
    const refused = await resolveLinkPreview('https://a.example.com/0', four.deps);
    expect(refused).toMatchObject({ ok: false, reason: 'too_many_redirects' });
    expect(four.fetched).toHaveLength(4);
  });
});

describe('slow and oversized responses end cleanly', () => {
  const hosts = { 'slow.example.com': PUBLIC };

  it('a server that never answers times out at the budget', async () => {
    const { deps } = net(
      {
        'https://slow.example.com/': init =>
          new Promise((_, reject) =>
            init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
          ),
      },
      hosts,
    );
    const started = Date.now();
    const r = await resolveLinkPreview('https://slow.example.com/', deps);
    expect(r).toMatchObject({ ok: false, reason: 'timeout' });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('a body that starts and never finishes times out too', async () => {
    const { deps } = net(
      {
        'https://slow.example.com/': init =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode('<html><head><title>Half'));
                init.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
              },
            }),
            { status: 200, headers: { 'content-type': 'text/html' } },
          ),
      },
      hosts,
    );
    const r = await resolveLinkPreview('https://slow.example.com/', deps);
    expect(r).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('a DNS lookup that hangs is inside the same budget', async () => {
    const { deps } = net({}, {}, { resolveDns: () => new Promise(() => {}) });
    const r = await resolveLinkPreview('https://slow.example.com/', deps);
    expect(r).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('an endless page is read to the cap, cancelled, and its <head> still used', async () => {
    let enqueued = 0;
    let cancelled = false;
    const chunk = new TextEncoder().encode('x'.repeat(64 * 1024));
    const { deps } = net(
      {
        'https://big.example.com/': () =>
          new Response(
            new ReadableStream({
              start(controller) {
                const head = new TextEncoder().encode('<html><head><title>Huge page</title></head><body>');
                enqueued += head.byteLength;
                controller.enqueue(head);
              },
              pull(controller) {
                enqueued += chunk.byteLength;
                controller.enqueue(chunk);
              },
              cancel() {
                cancelled = true;
              },
            }),
            { status: 200, headers: { 'content-type': 'text/html' } },
          ),
      },
      { 'big.example.com': PUBLIC },
      { timeoutMs: 5000 },
    );
    const r = await resolveLinkPreview('https://big.example.com/', deps);
    expect(r).toMatchObject({ ok: true, data: { title: 'Huge page' } });
    expect(cancelled).toBe(true);
    // Read to the cap, plus at most a couple of chunks the stream queued ahead.
    expect(enqueued).toBeLessThan(DEFAULT_MAX_BYTES + 4 * chunk.byteLength);
  });

  it('an oversized oEmbed JSON is refused and the page metadata used instead', async () => {
    const huge = { title: 'x'.repeat(DEFAULT_MAX_BYTES + 10) };
    const { deps } = net(
      {
        'https://site.example.com/p': page(
          '<html><head><link rel="alternate" type="application/json+oembed" href="https://site.example.com/oembed">' +
            '<meta property="og:title" content="From the page"></head></html>',
        ),
        'https://site.example.com/oembed': jsonRoute(huge),
      },
      { 'site.example.com': PUBLIC },
      { timeoutMs: 5000 },
    );
    const r = await resolveLinkPreview('https://site.example.com/p', deps);
    expect(r).toMatchObject({ ok: true, data: { title: 'From the page' }, sources: ['meta'] });
  });

  it('a PDF or an image is not parsed', async () => {
    for (const type of ['application/pdf', 'image/png', 'application/octet-stream']) {
      const { deps } = net({ 'https://f.example.com/x': page('%PDF-1.7', type) }, { 'f.example.com': PUBLIC });
      const r = await resolveLinkPreview('https://f.example.com/x', deps);
      expect(r, type).toMatchObject({ ok: false, reason: 'unsupported_content_type' });
    }
  });

  it('the limits are the ones the design states', () => {
    expect(MAX_REDIRECTS).toBe(3);
    expect(DEFAULT_TIMEOUT_MS).toBe(5000);
    expect(DEFAULT_MAX_BYTES).toBe(512 * 1024);
  });
});

// A real X oEmbed response, verbatim in shape (captured 2026-09-27 from
// publish.x.com), including the markup this function must never pass on.
const X_OEMBED = {
  url: 'https://x.com/jack/status/20',
  author_name: 'jack',
  author_url: 'https://x.com/jack',
  html:
    '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">just setting up my twttr</p>&mdash; jack (@jack) ' +
    '<a href="https://x.com/jack/status/20?ref_src=twsrc%5Etfw">March 21, 2006</a></blockquote>\n' +
    '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>\n',
  width: 550,
  height: null,
  type: 'rich',
  provider_name: 'X',
  provider_url: 'https://x.com',
  version: '1.0',
};

describe('resolution order and metadata-only output', () => {
  it('oEmbed discovered on the page wins, and the provider HTML is discarded', async () => {
    const { deps, fetched } = net(
      {
        'https://x.com/jack/status/20': page(
          '<html><head><link rel="alternate" type="application/json+oembed" ' +
            'href="https://publish.x.com/oembed?url=https%3A%2F%2Fx.com%2Fjack%2Fstatus%2F20">' +
            '<meta property="og:title" content="jack (@jack) on X"><meta property="og:site_name" content="X (formerly Twitter)">' +
            // X describes the post with its own words: a description that
            // only repeats the title must not survive.
            '<meta property="og:description" content="just setting up my twttr">' +
            '</head></html>',
        ),
        'https://publish.x.com/oembed?url=https%3A%2F%2Fx.com%2Fjack%2Fstatus%2F20': jsonRoute(X_OEMBED),
      },
      { 'x.com': ['104.244.42.1'], 'publish.x.com': ['104.244.42.2'] },
    );
    const r = await resolveLinkPreview('https://x.com/jack/status/20', deps);
    expect(r).toEqual({
      ok: true,
      finalUrl: 'https://x.com/jack/status/20',
      sources: ['oembed-discovery', 'meta'],
      data: {
        title: 'just setting up my twttr',
        description: '',
        author: 'jack',
        authorUrl: 'https://x.com/jack',
        siteName: 'X',
        publishedAt: '2006-03-21',
        resolvedAt: '2026-09-27T08:00:00.000Z',
      },
    });
    const wire = JSON.stringify(r);
    for (const markup of ['<blockquote', '<script', 'widgets.js', 'twitter-tweet', '<a ', '<p ']) {
      expect(wire, markup).not.toContain(markup);
    }
    expect(fetched).toHaveLength(2);
  });

  it('with no discovery link (a login wall), the known X endpoint is used', async () => {
    const endpoint =
      'https://publish.x.com/oembed?url=https%3A%2F%2Fx.com%2Fjack%2Fstatus%2F20&omit_script=1&dnt=true';
    const { deps } = net(
      {
        'https://x.com/jack/status/20': () => new Response('denied', { status: 403, headers: { 'content-type': 'text/html' } }),
        [endpoint]: jsonRoute(X_OEMBED),
      },
      { 'x.com': ['104.244.42.1'], 'publish.x.com': ['104.244.42.2'] },
    );
    const r = await resolveLinkPreview('https://x.com/jack/status/20', deps);
    expect(r).toMatchObject({ ok: true, sources: ['provider:x'], data: { author: 'jack', title: 'just setting up my twttr' } });
  });

  it('a Substack-shaped page: Open Graph, <meta name=author>, and the date only JSON-LD carries', async () => {
    const html =
      '<html><head>' +
      '<meta data-rh="true" property="og:title" content="Where’s the “intelligence explosion”?"/>' +
      '<meta data-rh="true" property="og:description" content="Ramez Naam gives a skeptic’s take on Recursive Self-Improvement."/>' +
      '<meta data-rh="true" property="article:modified_time" content="2026-09-27T07:23:44.565Z"/>' +
      '<meta name="author" content="Ramez Naam" />' +
      '<title data-rh="true">Where’s the “intelligence explosion”? - by Ramez Naam</title>' +
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle",' +
      '"datePublished":"2026-09-27T07:20:08+00:00","author":[{"@type":"Person","name":"Ramez Naam","url":"https://substack.com/@rameznaam"}],' +
      '"publisher":{"@type":"Organization","name":"Noahpinion"}}</script>' +
      '</head><body></body></html>';
    const { deps } = net({ 'https://www.noahpinion.blog/p/x': page(html) }, { 'www.noahpinion.blog': PUBLIC });
    const r = await resolveLinkPreview('https://www.noahpinion.blog/p/x', deps);
    expect(r).toMatchObject({
      ok: true,
      data: {
        title: 'Where’s the “intelligence explosion”?',
        description: 'Ramez Naam gives a skeptic’s take on Recursive Self-Improvement.',
        author: 'Ramez Naam',
        authorUrl: 'https://substack.com/@rameznaam',
        siteName: 'Noahpinion',
        publishedAt: '2026-09-27',
      },
    });
  });

  it('a news page: a URL-valued article:author is not a name, and a byline that repeats the site is dropped', async () => {
    const html =
      '<html><head><meta property="og:site_name" content="BBC News"/>' +
      '<meta property="og:title" content="Men held under Explosives Act as major incident declared"/>' +
      '<meta property="article:author" content="https://www.facebook.com/bbcnews"/>' +
      '<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-09-27T07:41:40.140Z",' +
      '"author":{"@type":"NewsMediaOrganization","name":"BBC News"}}</script></head></html>';
    const { deps } = net({ 'https://www.bbc.co.uk/news/a': page(html) }, { 'www.bbc.co.uk': PUBLIC });
    const r = await resolveLinkPreview('https://www.bbc.co.uk/news/a', deps);
    expect(r).toMatchObject({ ok: true, data: { author: '', siteName: 'BBC News', publishedAt: '2026-09-27' } });
  });

  it('a page with only a <title> still yields a card; a page with nothing is a plain failure', async () => {
    const hosts = { 't.example.com': PUBLIC };
    const titled = net({ 'https://t.example.com/': page('<html><head><title> Just &amp; a title </title></head></html>') }, hosts);
    expect(await resolveLinkPreview('https://t.example.com/', titled.deps)).toMatchObject({
      ok: true,
      data: { title: 'Just & a title' },
      sources: ['meta', 'title'],
    });
    const bare = net({ 'https://t.example.com/': page('<html><body>no head</body></html>') }, hosts);
    expect(await resolveLinkPreview('https://t.example.com/', bare.deps)).toMatchObject({ ok: false, reason: 'no_metadata' });
  });

  it('entities decode exactly once, and markup in page metadata comes back as text', async () => {
    const { deps } = net(
      {
        'https://e.example.com/': page(
          '<html><head><meta property="og:title" content="AT&amp;T &amp; &#8220;quotes&#8221; a &lt;b&gt; c">' +
            '<meta property="og:description" content="Tom &amp;amp; Jerry"></head></html>',
        ),
      },
      { 'e.example.com': PUBLIC },
    );
    const r = await resolveLinkPreview('https://e.example.com/', deps);
    expect(r).toMatchObject({ ok: true, data: { title: 'AT&T & “quotes” a <b> c', description: 'Tom &amp; Jerry' } });
  });

  it('a failed fetch is a structured failure the editor can show, never a throw', async () => {
    const { deps } = net(
      { 'https://down.example.com/': () => Promise.reject(new TypeError('connection reset')) },
      { 'down.example.com': PUBLIC },
    );
    const r = await resolveLinkPreview('https://down.example.com/', deps);
    expect(r).toMatchObject({ ok: false, reason: 'fetch_failed' });
    expect(typeof (r as { message: string }).message).toBe('string');
  });
});

describe('address classification', () => {
  it.each(['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4001:82a::200e'])('%s is public', a => {
    expect(isPublicAddress(a)).toBe(true);
  });
  it.each([
    '0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255',
    '192.0.2.1', '192.168.0.1', '198.18.0.1', '203.0.113.9', '224.0.0.1', '255.255.255.255',
    '::', '::1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '64:ff9b::a00:1', 'fc00::1', 'fdff::1',
    'fe80::1', 'ff02::1', '2001:db8::1', '2001::1', '2002:7f00:1::', 'not-an-ip',
  ])('%s is not public', a => {
    expect(isPublicAddress(a)).toBe(false);
  });
  it('parses the IPv6 spellings it must understand', () => {
    expect(parseIPv6('[::1]')).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseIPv6('::ffff:127.0.0.1')).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 1]);
    expect(parseIPv6('fe80::1%eth0')).toEqual([0xfe80, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseIPv6('1:2:3:4:5:6:7::8')).toBeNull();
    expect(parseIPv6(':::')).toBeNull();
  });
});

describe('text helpers', () => {
  it("reads X's blockquote as the post and its date, dropping the markup", () => {
    expect(oembedHtmlText(X_OEMBED.html)).toEqual({ text: 'just setting up my twttr', date: '2006-03-21' });
  });
  it('keeps the calendar date as written', () => {
    expect(toCalendarDate('2026-09-27T23:30:00-05:00')).toBe('2026-09-27');
    expect(toCalendarDate('March 21, 2006')).toBe('2006-03-21');
    expect(toCalendarDate('21 Mar 2006')).toBe('2006-03-21');
    expect(toCalendarDate('yesterday')).toBe('');
  });
});
