/**
 * A free book's extracted text in the private R2 bucket (docs/prd/library-phase-2 §4, Extraction; the owner's
 * decision of 2026-10-25 to keep the text beside the book in Cloudflare, not in Postgres). Written by
 * scripts/books/extract-paragraphs.ts, read by the book-ask edge function (the chapter a question is about)
 * and, through URLs that function signs, by the reader's text view.
 *
 *   text/<book id>/index.json   the book's chapters: each one's first and last ¶ and pages
 *   text/<book id>/ch-<n>.json  one chapter's paragraphs, ¶n numbered through the whole book
 *
 * Keyed by the book's id, which never changes (a slug does, when a book is removed). No Deno or Node API here:
 * the function, the script and the tests import it as it is.
 */

export const TEXT_VERSION = 1;

export interface TextParagraph {
  para: number;
  page: number;
  text: string;
}

export interface TextChapterEntry {
  chapter: number;
  first_para: number;
  last_para: number;
  first_page: number;
  last_page: number;
}

export interface TextIndex {
  version: number;
  book_id: string;
  page_count: number;
  paragraphs: number;
  chapters: TextChapterEntry[];
}

export interface TextChapter {
  version: number;
  book_id: string;
  chapter: number;
  paragraphs: TextParagraph[];
}

export const textIndexKey = (bookId: string) => `text/${bookId}/index.json`;
export const textChapterKey = (bookId: string, chapter: number) => `text/${bookId}/ch-${chapter}.json`;

/** The files for a book: its index and one file per chapter, from numbered paragraphs. */
export function textFiles(
  bookId: string,
  pageCount: number,
  paragraphs: { chapter: number; para: number; page: number; text: string }[],
): { index: TextIndex; chapters: TextChapter[] } {
  const byChapter = new Map<number, TextParagraph[]>();
  for (const p of [...paragraphs].sort((a, b) => a.para - b.para)) {
    const list = byChapter.get(p.chapter) ?? [];
    list.push({ para: p.para, page: p.page, text: p.text });
    byChapter.set(p.chapter, list);
  }
  const chapters = [...byChapter.entries()]
    .sort(([a], [b]) => a - b)
    .map(([chapter, paras]) => ({ version: TEXT_VERSION, book_id: bookId, chapter, paragraphs: paras }));
  return {
    index: {
      version: TEXT_VERSION,
      book_id: bookId,
      page_count: pageCount,
      paragraphs: paragraphs.length,
      chapters: chapters.map((c) => ({
        chapter: c.chapter,
        first_para: c.paragraphs[0].para,
        last_para: c.paragraphs[c.paragraphs.length - 1].para,
        first_page: c.paragraphs[0].page,
        last_page: Math.max(...c.paragraphs.map((p) => p.page)),
      })),
    },
    chapters,
  };
}

/** The chapter a page is in: the last chapter starting on or before it; the first chapter for an earlier page. */
export function chapterAtPage(index: Pick<TextIndex, 'chapters'>, page: number): number | null {
  if (!index.chapters.length) return null;
  let found = index.chapters[0].chapter;
  for (const c of index.chapters) if (c.first_page <= page) found = c.chapter;
  return found;
}

/** A chapter file read back, or null when it is not one (a wrong book, a damaged file). */
export function readChapter(json: unknown, bookId: string, chapter: number): TextParagraph[] | null {
  const c = json as Partial<TextChapter> | null;
  if (!c || c.book_id !== bookId || c.chapter !== chapter || !Array.isArray(c.paragraphs)) return null;
  return c.paragraphs.filter((p) => Number.isInteger(p?.para) && Number.isInteger(p?.page) && typeof p?.text === 'string');
}

/** An index file read back, or null. */
export function readIndex(json: unknown, bookId: string): TextIndex | null {
  const i = json as Partial<TextIndex> | null;
  if (!i || i.book_id !== bookId || !Array.isArray(i.chapters)) return null;
  return i as TextIndex;
}
