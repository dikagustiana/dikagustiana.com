/**
 * The link card's stored record, in one place.
 *
 * A card is a snapshot: whatever the author typed, plus whatever the
 * link-preview function resolved when the author pasted the URL (see
 * linkCard.ts and docs/DECISIONS.md). Every field is a plain string, and all of
 * them travel inside the single `data-link-card` JSON attribute. The sanitizer
 * already allows that attribute, so adding a field here needs no allowlist
 * change.
 *
 * The four places of the content contract read the field list from here
 * rather than spelling it out. serialize.ts used to write exactly three fields
 * into its blob by hand, so any other field would have been dropped the moment
 * an essay was published or a revision restored, while the editor still showed
 * it.
 */

// Relative, not '@/…': serialize.ts imports this module, and its runtime
// imports stay alias-free so a plain Node script can load it.
import { fullDate } from '../formatDate';
import { parseAttrJson } from './attrJson';

/** Every stored field, in blob order. */
export const LINK_CARD_FIELDS = [
  'url',
  'title',
  'description',
  'author',
  'authorUrl',
  'siteName',
  /** Calendar date the source was published, `YYYY-MM-DD`. */
  'publishedAt',
  /** ISO timestamp of the fetch that produced the snapshot; '' when typed by hand. */
  'resolvedAt',
] as const;

export type LinkCardField = (typeof LINK_CARD_FIELDS)[number];

/** A complete card: every field present, '' when unknown. */
export type LinkCardRecord = Record<LinkCardField, string>;

/** What callers hand in: a URL and whatever else is known. */
export type LinkCardData = { url: string } & Partial<
  Record<Exclude<LinkCardField, 'url'>, string | null>
>;

/** Coerce node attrs or a parsed blob into a complete record. */
export function normalizeLinkCard(raw: unknown): LinkCardRecord {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const card = {} as LinkCardRecord;
  for (const field of LINK_CARD_FIELDS) {
    const value = source[field];
    card[field] = value == null ? '' : String(value);
  }
  return card;
}

/** Hostname without `www.`, or the raw string when it will not parse. */
export function linkCardHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** The text a card shows. One derivation for the editor, the page and the stored HTML. */
export function linkCardDisplay(card: LinkCardRecord) {
  const publishedAt = card.publishedAt.trim();
  return {
    source: card.siteName.trim() || linkCardHost(card.url),
    title: card.title.trim() || card.url,
    description: card.description.trim(),
    author: card.author.trim(),
    // fullDate: UTC and always with its year, so stored HTML cannot change
    // with the viewer's zone or the calendar year.
    date: publishedAt ? fullDate(publishedAt) : '',
  };
}

/**
 * The visible text inside the card's `<a>` in stored HTML, as pieces:
 * "Title — Author · Source · Date". It reads as a line where raw HTML is shown
 * (crawlers, the innerHTML previews), and each piece carries a class that
 * `linkCardFromElement` can read back when the blob is missing.
 */
export function linkCardMarkup(card: LinkCardRecord): { className?: string; text: string }[] {
  const view = linkCardDisplay(card);
  const meta = [
    view.author && { className: 'link-card__author', text: view.author },
    { className: 'link-card__source', text: view.source },
    view.date && { className: 'link-card__date', text: view.date },
  ].filter((piece): piece is { className: string; text: string } => Boolean(piece));

  const pieces: { className?: string; text: string }[] = [
    { className: 'link-card__title', text: view.title },
    { text: ' — ' },
  ];
  meta.forEach((piece, i) => {
    if (i > 0) pieces.push({ text: ' · ' });
    pieces.push(piece);
  });
  return pieces;
}

/**
 * Read a card back from its `<a data-type="link-card">`: the blob when there
 * is one, otherwise whatever the markup shows (hand-written HTML, or content
 * that lost its blob). Used by the node's parseHTML and by ArticleBody.
 */
export function linkCardFromElement(el: Element): LinkCardRecord {
  const href = el.getAttribute('href') ?? '';
  const stored = parseAttrJson<Record<string, unknown>>(el.getAttribute('data-link-card'));
  if (stored) return normalizeLinkCard({ url: href, ...stored });

  const text = (piece: string) => el.querySelector(`.link-card__${piece}`)?.textContent ?? '';
  return normalizeLinkCard({
    url: href,
    title: text('title') || el.textContent || '',
    description: text('description'),
    author: text('author'),
    siteName: text('source'),
  });
}
