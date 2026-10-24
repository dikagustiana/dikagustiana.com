/**
 * Which essays cite which books (docs/prd/library-phase-2 §3, "Cited by"): the pure part of
 * scripts/books/rebuild-citations.ts, tested in tests/unit/libraryScripts.test.ts.
 *
 * An essay's references are the strings in presentation.references (a string, or { label }) and the note
 * text of every footnote in content_json (<sup data-type="footnote">, attrs.text). A reference names a book
 * when, both folded to plain lower-case words, it contains the book's whole title and, where the book has an
 * author, the author's surname. A title of one short word (under 8 letters) is not enough on its own: such a
 * book needs an author to be matched at all.
 */
import { surname } from '../../src/lib/spines';

/** Lower case, accents off, anything but letters and digits a single space. */
export const fold = (s: string) =>
  ` ${s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

export interface CitableBook {
  id: string;
  title: string | null;
  author: string | null;
}

export interface CitingEssay {
  id: string;
  presentation: unknown;
  content_json: unknown;
}

/** Every reference text an essay carries. */
export function referenceTexts(e: Pick<CitingEssay, 'presentation' | 'content_json'>): string[] {
  const out: string[] = [];
  const refs = (e.presentation as { references?: unknown } | null)?.references;
  if (Array.isArray(refs)) {
    for (const r of refs) {
      if (typeof r === 'string') out.push(r);
      else if (r && typeof (r as { label?: unknown }).label === 'string') out.push((r as { label: string }).label);
    }
  }
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; attrs?: { text?: unknown }; content?: unknown };
    if (n.type === 'footnote' && typeof n.attrs?.text === 'string') out.push(n.attrs.text);
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(e.content_json);
  return out;
}

/** Whether one reference names the book. */
export function names(reference: string, book: CitableBook): boolean {
  const title = fold(book.title ?? '');
  if (title.trim().length === 0) return false;
  const ref = fold(reference);
  if (!ref.includes(title)) return false;
  const last = book.author ? fold(surname(book.author)) : '';
  if (last.trim()) return ref.includes(last);
  const words = title.trim().split(' ');
  return words.length > 1 || words[0].length >= 8;
}

/** The (book, essay) pairs, each once. */
export function citations(books: CitableBook[], essays: CitingEssay[]): { book_id: string; essay_id: string }[] {
  const pairs: { book_id: string; essay_id: string }[] = [];
  for (const e of essays) {
    const refs = referenceTexts(e);
    if (!refs.length) continue;
    for (const b of books) if (refs.some((r) => names(r, b))) pairs.push({ book_id: b.id, essay_id: e.id });
  }
  return pairs;
}
