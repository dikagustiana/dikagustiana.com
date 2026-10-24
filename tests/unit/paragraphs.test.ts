// @vitest-environment node
/**
 * The paragraph splitter (scripts/books/paragraphs.ts; docs/prd/library-phase-2 §4, Tests) on the two sample
 * PDFs in tests/fixtures/books (made by makeFixtures.ts): one with a text layer and bookmarks, read into
 * numbered paragraphs by chapter; one scanned, flagged and not read. Then the line-gap heuristic itself, the
 * chapter rules, the cut of a run-on paragraph, and an EPUB read by its spine.
 */
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  MAX_PARA,
  SECTION_PAGES,
  chapterOf,
  chapterStarts,
  cut,
  extractEpub,
  extractPdf,
  isScanned,
  splitParagraphs,
  type TextLine,
} from '../../scripts/books/paragraphs';
import { CHAPTERS } from '../fixtures/books/ledgersText';

const fixture = (name: string) => new Uint8Array(fs.readFileSync(path.join(__dirname, '../fixtures/books', name)));

describe('a PDF with a text layer', () => {
  it('reads into numbered paragraphs, chapter by bookmark, page numbers dropped, page breaks mended', async () => {
    const out = await extractPdf(fixture('text.pdf'));
    expect(out.scanned).toBe(false);
    expect(out.pageCount).toBe(4);
    // Every heading and paragraph of the book, once, in order.
    const expected = CHAPTERS.flatMap((c) => [c.title, ...c.paragraphs]);
    expect(out.paragraphs.map((p) => p.text)).toEqual(expected);
    expect(out.paragraphs.map((p) => p.para)).toEqual(expected.map((_, i) => i + 1));
    expect(out.paragraphs.map((p) => p.chapter)).toEqual(CHAPTERS.flatMap((c, i) => Array(c.paragraphs.length + 1).fill(i + 1)));
    // The last paragraph of chapter one runs over onto page 2 and is one paragraph, starting on page 1.
    const last = out.paragraphs.find((p) => p.text.startsWith('A ledger kept this way'))!;
    expect(last.text.endsWith('the picture of the business.')).toBe(true);
    expect(last.page).toBe(1);
    expect(out.paragraphs.find((p) => p.text.startsWith('Before a figure'))!.page).toBe(3);
    expect(out.paragraphs.some((p) => /^\d+$/.test(p.text))).toBe(false);
  });
});

describe('a scanned PDF', () => {
  it('is flagged, with no paragraphs, and never read further', async () => {
    const out = await extractPdf(fixture('scanned.pdf'));
    expect(out).toEqual({ pageCount: 2, scanned: true, paragraphs: [] });
    expect(isScanned(39 * 10, 10)).toBe(true);
    expect(isScanned(41 * 10, 10)).toBe(false);
  });
});

describe('the line-gap heuristic', () => {
  const line = (page: number, y: number, text: string, over: Partial<TextLine> = {}): TextLine => ({ page, x: 72, y, w: 400, h: 11, text, ...over });

  it('starts a paragraph at a wide gap, mends a hyphenated word, and drops running heads', () => {
    const pages: TextLine[] = [];
    for (let p = 1; p <= 3; p++) {
      pages.push(line(p, 760, 'A SHORT BOOK OF LEDGERS', { w: 200 }));
      pages.push(line(p, 700, `Page ${p} opens a paragraph that runs on and on with a hyphen-`));
      pages.push(line(p, 686, 'ated word and a full stop at the end of it all.'));
      pages.push(line(p, 650, 'After a wide gap a second paragraph starts without any indent.', { w: 300 }));
      pages.push(line(p, 40, String(p), { w: 6 }));
    }
    expect(splitParagraphs(pages)).toEqual([1, 2, 3].flatMap((p) => [
      { page: p, text: `Page ${p} opens a paragraph that runs on and on with a hyphenated word and a full stop at the end of it all.` },
      { page: p, text: 'After a wide gap a second paragraph starts without any indent.' },
    ]));
  });

  it('runs a paragraph on over a page break, and starts one after a short closing line', () => {
    const out = splitParagraphs([
      line(1, 700, 'A paragraph that is still going at the foot of the page and'),
      line(2, 720, 'ends here at last.', { w: 120 }),
      line(2, 706, 'The next one starts flush after a short closing line.'),
    ]);
    expect(out).toEqual([
      { page: 1, text: 'A paragraph that is still going at the foot of the page and ends here at last.' },
      { page: 2, text: 'The next one starts flush after a short closing line.' },
    ]);
  });
});

describe('chapters and long paragraphs', () => {
  it('uses bookmarks for chapters, front matter as chapter 0, else sections of 20 pages', () => {
    expect(chapterStarts([5, 2, 2, 99], 40)).toEqual([2, 5]);
    expect(chapterOf(1, [2, 5])).toBe(0);
    expect(chapterOf(4, [2, 5])).toBe(1);
    expect(chapterOf(40, [2, 5])).toBe(2);
    expect(chapterStarts([], 45)).toEqual([1, 1 + SECTION_PAGES, 1 + 2 * SECTION_PAGES]);
  });

  it('cuts a run-on paragraph at sentence ends into pieces under the limit', () => {
    const run = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} says a little more than the last one did.`).join(' ');
    const pieces = cut(run);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.every((p) => p.length <= MAX_PARA && /\.$/.test(p))).toBe(true);
    expect(pieces.join(' ')).toBe(run);
    expect(cut('Short.')).toEqual(['Short.']);
  });
});

describe('an EPUB', () => {
  it('reads each spine item with text as a chapter, its blocks as paragraphs, pages estimated', async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip');
    zip.file('META-INF/container.xml', '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
    zip.file(
      'OEBPS/content.opf',
      '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><manifest><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="text/one.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/two%20b.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="cover"/><itemref idref="c1"/><itemref idref="c2"/></spine></package>',
    );
    const page = (body: string) => `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title></head><body>${body}</body></html>`;
    zip.file('OEBPS/cover.xhtml', page('<img src="c.jpg" alt=""/>'));
    zip.file('OEBPS/text/one.xhtml', page('<h1>One</h1><p>First   paragraph.</p><ul><li><p>An item, read once.</p></li></ul>'));
    zip.file('OEBPS/text/two b.xhtml', page('<h2>Two</h2><blockquote>A quotation.</blockquote>'));
    const out = await extractEpub(await zip.generateAsync({ type: 'uint8array' }));
    expect(out.scanned).toBe(false);
    expect(out.pageCount).toBe(1);
    expect(out.paragraphs).toEqual([
      { chapter: 1, para: 1, page: 1, text: 'One' },
      { chapter: 1, para: 2, page: 1, text: 'First paragraph.' },
      { chapter: 1, para: 3, page: 1, text: 'An item, read once.' },
      { chapter: 2, para: 4, page: 1, text: 'Two' },
      { chapter: 2, para: 5, page: 1, text: 'A quotation.' },
    ]);
  });
});
