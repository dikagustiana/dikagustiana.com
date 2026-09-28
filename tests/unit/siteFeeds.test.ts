/**
 * sitemap.xml and rss.xml (scripts/lib/siteFeeds.mjs), built from the pages
 * the prerender writes. The escaping, the dates and the order are held here;
 * the build itself reads both files back and counts them.
 */
import { describe, it, expect } from 'vitest';
import { FEED_SIZE, buildFeed, buildSitemap, dayOf, feedItems, publishedAt } from '../../scripts/lib/siteFeeds.mjs';

const ORIGIN = 'https://dikagustiana.com';
const page = (n: number, over: Record<string, unknown> = {}) => ({
  url: `${ORIGIN}/essays/essay-${String(n).padStart(2, '0')}`,
  title: `Essay ${n}`,
  deck: `Deck ${n}.`,
  published: `2026-08-${String(n).padStart(2, '0')}`,
  updated: `2026-09-${String(n).padStart(2, '0')}T08:00:00.123456+00:00`,
  ...over,
});
const parse = (source: string) => {
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  return doc;
};
const text = (doc: Document, selector: string) => [...doc.querySelectorAll(selector)].map(n => n.textContent);

describe('sitemap.xml', () => {
  it('lists the home page first, then every written page with its last change as a date', () => {
    const doc = parse(buildSitemap([page(3), page(1), page(2)], { origin: ORIGIN }));
    expect(text(doc, 'url > loc')).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/essays/essay-01`,
      `${ORIGIN}/essays/essay-02`,
      `${ORIGIN}/essays/essay-03`,
    ]);
    // The home page changes when its newest essay does.
    expect(text(doc, 'url > lastmod')).toEqual(['2026-09-03', '2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('dates a change by its UTC day', () => {
    expect(dayOf('2026-09-28T23:30:00+00:00')).toBe('2026-09-28');
    expect(dayOf('2026-09-29T06:30:00+07:00')).toBe('2026-09-28');
  });
});

describe('rss.xml', () => {
  it('is RSS 2.0 with the channel the brief names', () => {
    const doc = parse(buildFeed([page(1)], { origin: ORIGIN, description: 'Finance, accounting, and green transition economics.' }));
    expect(doc.documentElement.getAttribute('version')).toBe('2.0');
    expect(text(doc, 'channel > title')).toEqual(['Dika Gustiana']);
    expect(text(doc, 'channel > link')).toEqual([`${ORIGIN}/`]);
    expect(text(doc, 'channel > description')).toEqual(['Finance, accounting, and green transition economics.']);
    expect(text(doc, 'channel > language')).toEqual(['en-GB']);
  });

  it('carries the 20 most recently published, newest first, each a permalink', () => {
    const pages = Array.from({ length: 25 }, (_, i) => page(i + 1));
    const doc = parse(buildFeed(pages, { origin: ORIGIN, description: 'd' }));
    const links = text(doc, 'item > link');
    expect(links).toHaveLength(FEED_SIZE);
    expect(links[0]).toBe(`${ORIGIN}/essays/essay-25`);
    expect(links.at(-1)).toBe(`${ORIGIN}/essays/essay-06`);
    const guids = [...doc.querySelectorAll('item > guid')];
    expect(guids.map(g => g.textContent)).toEqual(links);
    expect(guids.every(g => g.getAttribute('isPermaLink') === 'true')).toBe(true);
  });

  it('dates items in RFC 822, from a bare day or a timestamptz', () => {
    const doc = parse(
      buildFeed([page(1, { published: '2026-09-25' }), page(2, { published: '2026-08-01T04:28:30.066345+00:00' })], {
        origin: ORIGIN,
        description: 'd',
      }),
    );
    expect(text(doc, 'item > pubDate')).toEqual(['Fri, 25 Sep 2026 00:00:00 GMT', 'Sat, 01 Aug 2026 04:28:30 GMT']);
    expect(publishedAt('2026-09-25')).toBe(Date.parse('2026-09-25T00:00:00Z') / 1000);
  });

  it('escapes a hostile title and deck, so the feed stays XML', () => {
    const hostile = 'The “Idea Guy” — He’s Back… & <Receipts> "quoted" \'single\'';
    const source = buildFeed([page(1, { title: hostile, deck: hostile })], { origin: ORIGIN, description: 'a & b' });
    expect(source).not.toMatch(/<Receipts>/);
    const doc = parse(source);
    expect(text(doc, 'item > title')).toEqual([hostile]);
    expect(text(doc, 'item > description')).toEqual([hostile]);
    expect(text(doc, 'channel > description')).toEqual(['a & b']);
  });

  it('drops a page with no usable publication date rather than inventing one', () => {
    expect(feedItems([page(1, { published: null }), page(2)]).map(p => p.url)).toEqual([`${ORIGIN}/essays/essay-02`]);
  });
});
