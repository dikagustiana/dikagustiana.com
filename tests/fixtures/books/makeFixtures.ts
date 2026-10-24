/**
 * Writes the library's sample books (docs/prd/library-phase-2 §4, Tests), committed beside this file:
 *
 *   text.pdf     "A Short Book of Ledgers": three chapters with an outline, the body set in Helvetica with a
 *                first-line indent and no space between paragraphs, headings larger, a page number at the foot
 *                of every page, and paragraphs that run over a page break. The prose was written for these
 *                tests (no third-party text).
 *   scanned.pdf  two pages that are only pictures: no text layer, as a scan is.
 *
 *   node --experimental-strip-types tests/fixtures/books/makeFixtures.ts
 *
 * A minimal PDF writer: the standard Helvetica font (no embedding), an outline of chapter bookmarks, and an
 * uncompressed greyscale image for the scan. Deterministic, so the files only change with this script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS } from './ledgersText.ts';

const PAGE_W = 612;
const PAGE_H = 792;
const LEFT = 72;
const TOP = 720;
const BOTTOM = 90;
const BODY = 11;
const LEADING = 14;
const INDENT = 18;
const HEADING = 16;
/** Helvetica's average advance, as a share of the size: enough to wrap a line within the measure. */
const AVG = 0.5;
const MEASURE = PAGE_W - 2 * LEFT;

interface Placed {
  x: number;
  y: number;
  size: number;
  text: string;
}

/** Breaks a paragraph into lines that fit the measure, the first indented. */
function wrap(text: string, size: number, first: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const room = (out.length === 0 ? MEASURE - first : MEASURE) / (size * AVG);
    const next = line ? `${line} ${word}` : word;
    if (next.length > room && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** The book set into pages: each page's lines, and the page each chapter starts on (0-based). */
export function typeset(chapters = CHAPTERS): { pages: Placed[][]; starts: number[] } {
  const pages: Placed[][] = [[]];
  const starts: number[] = [];
  let y = TOP;
  const newPage = () => {
    pages.push([]);
    y = TOP;
  };
  chapters.forEach((ch, ci) => {
    if (ci > 0) newPage();
    starts.push(pages.length - 1);
    pages[pages.length - 1].push({ x: LEFT, y, size: HEADING, text: ch.title });
    y -= HEADING + LEADING;
    for (const p of ch.paragraphs) {
      wrap(p, BODY, INDENT).forEach((line, i) => {
        if (y < BOTTOM) newPage();
        pages[pages.length - 1].push({ x: LEFT + (i === 0 ? INDENT : 0), y, size: BODY, text: line });
        y -= LEADING;
      });
    }
  });
  return { pages, starts };
}

const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
/** WinAnsi for the few characters outside ASCII the prose uses. */
const winAnsi = (s: string) => s.replace(/’/g, '\\222').replace(/—/g, '\\227');

interface PdfPage {
  content: string;
  image?: { w: number; h: number; data: Buffer };
}

function writePdf(pages: PdfPage[], outline: { title: string; page: number }[]): Buffer {
  const objects: (string | Buffer)[] = [];
  const add = (body: string | Buffer) => {
    objects.push(body);
    return objects.length;
  };
  const catalog = add('');
  const pagesObj = add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const pageIds: number[] = [];
  for (const p of pages) {
    let resources = `<< /Font << /F1 ${font} 0 R >> >>`;
    if (p.image) {
      const head = `<< /Type /XObject /Subtype /Image /Width ${p.image.w} /Height ${p.image.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${p.image.data.length} >>\nstream\n`;
      const img = add(Buffer.concat([Buffer.from(head, 'latin1'), p.image.data, Buffer.from('\nendstream', 'latin1')]));
      resources = `<< /XObject << /Im1 ${img} 0 R >> >>`;
    }
    const stream = add(`<< /Length ${Buffer.byteLength(p.content, 'latin1')} >>\nstream\n${p.content}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources ${resources} /Contents ${stream} 0 R >>`));
  }
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let outlines = '';
  if (outline.length) {
    const root = add('');
    const items = outline.map(() => add(''));
    items.forEach((id, i) => {
      const parts = [`/Title (${esc(outline[i].title)})`, `/Parent ${root} 0 R`, `/Dest [${pageIds[outline[i].page]} 0 R /XYZ 0 ${PAGE_H} 0]`];
      if (i > 0) parts.push(`/Prev ${items[i - 1]} 0 R`);
      if (i < items.length - 1) parts.push(`/Next ${items[i + 1]} 0 R`);
      objects[id - 1] = `<< ${parts.join(' ')} >>`;
    });
    objects[root - 1] = `<< /Type /Outlines /First ${items[0]} 0 R /Last ${items[items.length - 1]} 0 R /Count ${items.length} >>`;
    outlines = ` /Outlines ${root} 0 R /PageMode /UseOutlines`;
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R${outlines} >>`;

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let offset = chunks[0].length;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(offset);
    const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), typeof body === 'string' ? Buffer.from(body, 'latin1') : body, Buffer.from('\nendobj\n', 'latin1')]);
    chunks.push(b);
    offset += b.length;
  });
  const xref = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n', ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${offset}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(chunks);
}

export function textPdf(): Buffer {
  const { pages, starts } = typeset();
  const pdfPages = pages.map((lines, i) => {
    const body = lines.map((l) => `BT /F1 ${l.size} Tf ${l.x} ${l.y} Td (${winAnsi(esc(l.text))}) Tj ET`);
    body.push(`BT /F1 9 Tf ${PAGE_W / 2 - 4} 50 Td (${i + 1}) Tj ET`);
    return { content: body.join('\n') };
  });
  return writePdf(pdfPages, CHAPTERS.map((c, i) => ({ title: c.title, page: starts[i] })));
}

export function scannedPdf(): Buffer {
  const w = 64;
  const h = 80;
  const data = Buffer.alloc(w * h);
  // Grey bands, as a scanned page of print looks from far off.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = y % 6 < 2 && x > 6 && x < w - 6 ? 60 : 235;
  const page = { content: `q ${PAGE_W - 80} 0 0 ${PAGE_H - 80} 40 40 cm /Im1 Do Q`, image: { w, h, data } };
  return writePdf([page, page], []);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  fs.writeFileSync(path.join(dir, 'text.pdf'), textPdf());
  fs.writeFileSync(path.join(dir, 'scanned.pdf'), scannedPdf());
  console.log('wrote text.pdf and scanned.pdf');
}
