/**
 * A free book's text as numbered paragraphs (docs/prd/library-phase-2 §4, Extraction), for
 * scripts/books/extract-paragraphs.ts; tested in tests/unit/paragraphs.test.ts on the sample books in
 * tests/fixtures/books.
 *
 * PDF: pdf.js (the reader's own version, pdfjs-dist) reads each page's text layer; items on one baseline make a
 * line; lines make paragraphs by the line-gap heuristic below. Chapters are the PDF's top-level bookmarks
 * (outline): a paragraph belongs to the last chapter that starts on or before its page, and front matter
 * before the first bookmark is chapter 0. A PDF without bookmarks is cut into sections of 20 pages, so that a
 * question's context stays a chapter's size. A PDF with (almost) no text is a scan: it is flagged, never
 * OCR'd.
 *
 * EPUB: the book is a zip; its OPF spine lists the chapters in order, and each chapter's block elements
 * (p, h1–h6, li, blockquote) are its paragraphs. (epub.js, which the reader uses, needs a browser; reading
 * the zip directly gives the same spine.) An EPUB has no pages: a paragraph's page is estimated at 1,800
 * characters a page, and so is the page count.
 *
 * Paragraphs are numbered 1…n through the whole book, so that [¶12] names one paragraph wherever it is.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface TextLine {
  /** 1-based page. */
  page: number;
  x: number;
  /** Baseline, from the bottom of the page (PDF space): a lower line has a smaller y. */
  y: number;
  w: number;
  /** Font size. */
  h: number;
  text: string;
}

export interface Paragraph {
  chapter: number;
  para: number;
  page: number;
  text: string;
}

export interface Extraction {
  pageCount: number;
  /** No usable text layer: a scanned book, left for OCR that is out of scope. */
  scanned: boolean;
  paragraphs: Paragraph[];
}

/** Fewer characters than this a page, on average, is a scan (a page number or two survive OCR-less scans). */
export const SCAN_CHARS_PER_PAGE = 40;
/** A PDF with no bookmarks is cut into sections of this many pages. */
export const SECTION_PAGES = 20;
/** A paragraph longer than this is a failed split; it is cut at sentence ends into pieces under MAX_PARA. */
export const MAX_PARA = 2400;
export const EPUB_CHARS_PER_PAGE = 1800;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const isScanned = (chars: number, pages: number) => pages > 0 && chars / pages < SCAN_CHARS_PER_PAGE;

const PAGE_NUMBER = /^\s*(\d{1,4}|[ivxlcdm]{1,7})\s*$/i;
const TERMINAL = /[.!?:;"'”’)\]]\s*$/;

interface Item {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/** One page's text items as lines, top to bottom, each line's items left to right. */
export function linesFromItems(page: number, items: Item[]): TextLine[] {
  const parts = items
    .filter((i) => i.str && i.str.trim())
    .map((i) => ({ x: i.transform[4], y: i.transform[5], w: i.width, h: i.height || Math.hypot(i.transform[2], i.transform[3]) || 10, str: i.str }));
  parts.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: (TextLine & { parts: typeof parts })[] = [];
  for (const p of parts) {
    const line = lines.find((l) => Math.abs(l.y - p.y) < Math.max(2, 0.4 * Math.min(l.h, p.h)));
    if (line) line.parts.push(p);
    else lines.push({ page, x: p.x, y: p.y, w: 0, h: p.h, text: '', parts: [p] });
  }
  return lines
    .map((l) => {
      l.parts.sort((a, b) => a.x - b.x);
      let text = '';
      let end = -Infinity;
      for (const p of l.parts) {
        const gap = p.x - end;
        if (text && gap > 0.15 * p.h && !/\s$/.test(text) && !/^\s/.test(p.str)) text += ' ';
        text += p.str;
        end = p.x + p.w;
      }
      const x = l.parts[0].x;
      return { page, x, y: l.y, w: end - x, h: Math.max(...l.parts.map((p) => p.h)), text: text.replace(/\s+/g, ' ').trim() };
    })
    .sort((a, b) => b.y - a.y);
}

/** Joins a line onto a paragraph: a word broken by a hyphen at the line's end is mended. */
const join = (para: string, line: string) => (/[a-z]-$/.test(para) && /^[a-z]/.test(line) ? `${para.slice(0, -1)}${line}` : `${para} ${line}`);

/** Lines that repeat at the head or foot of many pages: a running title, not text. */
function runningLines(lines: TextLine[]): Set<string> {
  const byPage = new Map<number, TextLine[]>();
  for (const l of lines) byPage.set(l.page, [...(byPage.get(l.page) ?? []), l]);
  const pages = byPage.size;
  const seen = new Map<string, number>();
  for (const ls of byPage.values()) {
    const edge = [ls[0], ls[ls.length - 1]].filter(Boolean);
    for (const key of new Set(edge.map((l) => l.text.replace(/\d+/g, '#').trim()))) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => pages >= 3 && n >= Math.max(3, pages * 0.3)).map(([k]) => k));
}

/**
 * Lines (all pages, in reading order) into paragraphs. A new paragraph starts at a gap between lines wider than
 * 1.4× the page's usual leading, at a line indented from the page's left edge, after a short line that ends a
 * sentence, and where the type size changes (a heading is a paragraph of its own). A paragraph runs on over a
 * page break unless the next page's first line is indented or the last line closed it. Page numbers and
 * running heads are dropped.
 */
export function splitParagraphs(all: TextLine[]): { page: number; text: string }[] {
  const running = runningLines(all);
  const lines = all.filter((l) => !PAGE_NUMBER.test(l.text) && !running.has(l.text.replace(/\d+/g, '#').trim()));
  const out: { page: number; text: string }[] = [];
  const pages = [...new Set(lines.map((l) => l.page))];
  let prev: TextLine | null = null;
  let typical = { w: 0 };
  for (const page of pages) {
    const ls = lines.filter((l) => l.page === page);
    const body = ls.filter((l) => l.text.length > 20);
    const left = body.length ? Math.min(...body.map((l) => Math.round(l.x))) : Math.min(...ls.map((l) => l.x));
    const gaps = ls.slice(1).map((l, i) => ls[i].y - l.y).filter((g) => g > 0);
    const leading = median(gaps) || 14;
    typical = { w: median(body.map((l) => l.w)) || typical.w };
    ls.forEach((l, i) => {
      const indented = l.x > left + Math.max(4, 0.8 * l.h);
      let start: boolean;
      if (!prev) start = true;
      else {
        const closed = prev.w < 0.8 * typical.w && TERMINAL.test(prev.text);
        const resized = Math.abs(prev.h - l.h) > 0.2 * Math.max(prev.h, l.h);
        if (i === 0) start = indented || closed || resized;
        else start = indented || closed || resized || prev.y - l.y > leading * 1.4;
      }
      if (start || !out.length) out.push({ page, text: l.text });
      else out[out.length - 1].text = join(out[out.length - 1].text, l.text);
      prev = l;
    });
  }
  return out.flatMap((p) => cut(p.text).map((text) => ({ page: p.page, text })));
}

/** A run-on "paragraph" (a failed split) cut at sentence ends into pieces under MAX_PARA. */
export function cut(text: string): string[] {
  if (text.length <= MAX_PARA) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && cur.length + s.length > MAX_PARA / 2) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.flatMap((p) => (p.length > MAX_PARA ? p.match(new RegExp(`.{1,${MAX_PARA}}`, 'gs')) ?? [p] : [p]));
}

/** The chapter of a page: the number of chapter starts (1-based pages) on or before it; 0 is front matter. */
export function chapterOf(page: number, starts: number[]): number {
  let n = 0;
  for (const s of starts) if (s <= page) n++;
  return n;
}

/** Chapter starts from bookmarks, or every SECTION_PAGES pages when there are none. */
export function chapterStarts(outlinePages: number[], pageCount: number): number[] {
  const marks = [...new Set(outlinePages.filter((p) => p >= 1 && p <= pageCount))].sort((a, b) => a - b);
  if (marks.length) return marks;
  const out: number[] = [];
  for (let p = 1; p <= pageCount; p += SECTION_PAGES) out.push(p);
  return out;
}

export const numbered = (paras: { chapter: number; page: number; text: string }[]): Paragraph[] => paras.map((p, i) => ({ ...p, para: i + 1 }));

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const standardFontDataUrl = `${path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')}/`;

async function outlinePages(doc: PDFDocumentProxy): Promise<number[]> {
  const outline = (await doc.getOutline()) ?? [];
  const pages: number[] = [];
  for (const item of outline) {
    try {
      const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
      if (!dest?.[0]) continue;
      const ref = dest[0];
      const index = typeof ref === 'number' ? ref : await doc.getPageIndex(ref);
      pages.push(index + 1);
    } catch {
      // A bookmark that points nowhere is skipped.
    }
  }
  return pages;
}

export async function extractPdf(bytes: Uint8Array): Promise<Extraction> {
  const doc = await getDocument({ data: bytes.slice(), standardFontDataUrl, isEvalSupported: false, useSystemFonts: false }).promise;
  try {
    const lines: TextLine[] = [];
    let chars = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const ls = linesFromItems(n, content.items as Item[]);
      chars += ls.reduce((c, l) => c + l.text.replace(/\s/g, '').length, 0);
      lines.push(...ls);
      page.cleanup();
    }
    if (isScanned(chars, doc.numPages)) return { pageCount: doc.numPages, scanned: true, paragraphs: [] };
    const starts = chapterStarts(await outlinePages(doc), doc.numPages);
    const paras = splitParagraphs(lines).map((p) => ({ ...p, chapter: chapterOf(p.page, starts) }));
    return { pageCount: doc.numPages, scanned: false, paragraphs: numbered(paras) };
  } finally {
    await doc.destroy();
  }
}

// ---------------------------------------------------------------------------
// EPUB
// ---------------------------------------------------------------------------

const BLOCKS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote';

export async function extractEpub(bytes: Uint8Array): Promise<Extraction> {
  const { default: JSZip } = await import('jszip');
  const { JSDOM } = await import('jsdom');
  const zip = await JSZip.loadAsync(bytes);
  const read = async (p: string) => {
    const f = zip.file(p);
    if (!f) throw new Error(`The EPUB has no ${p}.`);
    return f.async('string');
  };
  const xml = (s: string) => new JSDOM(s, { contentType: 'application/xml' }).window.document;
  const container = xml(await read('META-INF/container.xml'));
  const opfPath = container.querySelector('rootfile')?.getAttribute('full-path');
  if (!opfPath) throw new Error('The EPUB names no package file.');
  const opf = xml(await read(opfPath));
  const base = path.posix.dirname(opfPath);
  const manifest = new Map([...opf.querySelectorAll('manifest > item')].map((i) => [i.getAttribute('id'), i.getAttribute('href')]));
  const spine = [...opf.querySelectorAll('spine > itemref')].map((r) => manifest.get(r.getAttribute('idref'))).filter((h): h is string => !!h);

  const paras: { chapter: number; page: number; text: string }[] = [];
  let chars = 0;
  let chapter = 0;
  for (const href of spine) {
    const file = path.posix.normalize(base === '.' ? decodeURIComponent(href) : `${base}/${decodeURIComponent(href)}`);
    const doc = new JSDOM(await read(file), { contentType: 'application/xhtml+xml' }).window.document;
    // A block inside another block (a <p> in a <li>) is read once, as the outer block.
    const blocks = [...doc.querySelectorAll(BLOCKS)].filter((el) => !el.parentElement?.closest(BLOCKS));
    const texts = blocks.map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!texts.length) continue;
    chapter++;
    for (const t of texts.flatMap(cut)) {
      paras.push({ chapter, page: Math.floor(chars / EPUB_CHARS_PER_PAGE) + 1, text: t });
      chars += t.length;
    }
  }
  const pageCount = Math.max(1, Math.ceil(chars / EPUB_CHARS_PER_PAGE));
  if (!paras.length) return { pageCount, scanned: true, paragraphs: [] };
  return { pageCount, scanned: false, paragraphs: numbered(paras) };
}
