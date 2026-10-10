/**
 * Cleans the owner's PSAK 338 workbook before it enters the repository, on the owner's instruction of
 * 10 October 2026 (docs/sweep-2026-10/DECISIONS.md, D15–D16): the names of real companies are removed,
 * and so is the file's metadata, because the workbook is served as a download (D11).
 *
 *   node --experimental-strip-types scripts/consolidation/sanitize-workbook.ts <original.xlsx> [out.xlsx]
 *
 * The original stays with the owner, outside the repository; the output defaults to
 * docs/consolidation/source/pt-dummy-psak-338.xlsx, which `npm run build:workbook` reads.
 *
 * The work is done on the file's XML, not by re-saving it through a spreadsheet library, which would
 * drop Excel's cached values. What changes:
 * - metadata: the author fields in docProps/core.xml; the OneDrive path and the co-authoring revision
 *   pointer in xl/workbook.xml; every cell comment, threaded comment, comment drawing and the comment
 *   author list (xl/persons); every defined name except a sheet's own Print_Area and Print_Titles (the
 *   73,000 legacy names carry other people's file paths);
 * - names: the cells in CELL_EDITS, by address. They are applied only to the exact original
 *   (ORIGINAL_SHA256), so a different workbook is refused rather than edited in the wrong place, and
 *   the names themselves are never written into the repository.
 * No number, formula or cached value is touched. The output is byte-for-byte reproducible.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

export const ORIGINAL_SHA256 = '8fae6f0e71b6407b7ce2b5f77cd2069a051ab9bc5f75155bdfc5d8ad1323da5c';

/** null deletes the cell's value (its formatting stays, as with Delete in Excel); a string replaces it. */
export const CELL_EDITS: Record<string, string | null> = {
  "'-BS-RP Disclosure 2023'!D141": null,
  "'-BS-RP Disclosure 2023'!D144": null,
  "'-BS-RP Disclosure 2023'!D145": null,
  "'-BS-RP Disclosure 2023'!D146": null,
  "'-BS-RP Disclosure 2023'!D147": null,
  "'-BS-RP Disclosure 2023'!D148": null,
  "'-BS-RP Disclosure 2023'!D149": null,
  "'-BS-RP Disclosure 2023'!D150": null,
  "'-BS-RP Disclosure 2023'!D151": null,
  "'-BS-RP Disclosure 2023'!D155": null,
  "'-BS-RP Disclosure 2023'!D182": null,
  "'-BS-RP Disclosure 2023'!D185": null,
  "'-BS-RP Disclosure 2023'!D186": null,
  "'-BS-RP Disclosure 2023'!D187": null,
  "'-BS-RP Disclosure 2023'!D188": null,
  "'-BS-RP Disclosure 2023'!D189": null,
  "'-BS-RP Disclosure 2023'!D190": null,
  "'-BS-RP Disclosure 2023'!D191": null,
  "'-BS-RP Disclosure 2023'!D192": null,
  "'BS RP Disclosure 2024'!D140": null,
  "'WP Investment'!C14": null,
  "'WP Investment'!R14": null,
  "'WP Investment'!AI14": null,
  "'WP Investment'!AY14": null,
  "'WP Investment'!AI15": null,
  "'WP Investment'!AY15": null,
  "'Adjustment Consol'!H40": 'Account Receivable',
  "'Elimination 23'!F107": 'Related Party AP',
  "'Elimination 23'!F109": 'Account Receivable',
  "'Elimination 23'!F112": 'Account Receivable',
  "'WP Investment'!C6": '#STRESs from PT Dummy - S  [SNTRess]',
};

// ── zip, with node:zlib only ────────────────────────────────────────────────────────────────────

interface Entry { name: string; data: Buffer }

export function readZip(buf: Buffer): Entry[] {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries: Entry[] = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + csize);
    if (method !== 0 && method !== 8) throw new Error(`${name}: compression method ${method}`);
    entries.push({ name, data: method === 8 ? inflateRawSync(raw) : Buffer.from(raw) });
    p += 46 + nlen + xlen + clen;
  }
  return entries;
}

export function writeZip(entries: Entry[]): Buffer {
  const DOS_DATE = (1 << 5) | 1; // 1980-01-01, so the bytes do not depend on when the script ran
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const comp = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6);
    head.writeUInt16LE(8, 8); head.writeUInt16LE(0, 10); head.writeUInt16LE(DOS_DATE, 12);
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(comp.length, 18); head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26); head.writeUInt16LE(0, 28);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10); dir.writeUInt16LE(0, 12); dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(comp.length, 20); dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28); dir.writeUInt32LE(offset, 42);
    locals.push(head, nameBuf, comp);
    central.push(dir, nameBuf);
    offset += head.length + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

// ── the workbook ────────────────────────────────────────────────────────────────────────────────

const xmlUnescape = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "'Sheet name'!A1" or "Sheet!A1" → [sheet, cell]. */
function splitAddress(address: string): [string, string] {
  const m = /^(?:'((?:[^']|'')+)'|([^!]+))!([A-Z]+\d+)$/.exec(address);
  if (!m) throw new Error(`bad address ${address}`);
  return [(m[1] ?? m[2]).replace(/''/g, "'"), m[3]];
}

export interface SanitizeResult { output: Buffer; log: string[] }

export function sanitizeWorkbook(input: Buffer): SanitizeResult {
  const inputSha = createHash('sha256').update(input).digest('hex');
  if (inputSha !== ORIGINAL_SHA256) {
    throw new Error(
      `sanitize-workbook: input sha256 ${inputSha} is not the original this script's cell list was made for ` +
        `(${ORIGINAL_SHA256}). A new workbook needs its own review of company names and a new CELL_EDITS list.`,
    );
  }
  const log: string[] = [];
  const parts = new Map(readZip(input).map((e) => [e.name, e.data]));
  const text = (name: string) => {
    const b = parts.get(name);
    if (!b) throw new Error(`missing part ${name}`);
    return b.toString('utf8');
  };
  const put = (name: string, s: string) => parts.set(name, Buffer.from(s, 'utf8'));
  const drop = (name: string) => { if (parts.delete(name)) log.push(`removed part ${name}`); };

  // docProps/core.xml: who wrote and last saved the file
  put('docProps/core.xml', text('docProps/core.xml')
    .replace(/<dc:creator>[\s\S]*?<\/dc:creator>/, '')
    .replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, ''));
  log.push('docProps/core.xml: creator and lastModifiedBy removed');

  // xl/workbook.xml: the OneDrive path, the co-authoring pointer, the legacy defined names
  let wb = text('xl/workbook.xml');
  wb = wb.replace(/<mc:AlternateContent\b[\s\S]*?<\/mc:AlternateContent>/g, (block) => (block.includes('absPath') ? '' : block));
  wb = wb.replace(/<xr:revisionPtr\b[^>]*\/>/, '');
  let keptNames = 0;
  let droppedNames = 0;
  wb = wb.replace(/<definedNames>([\s\S]*?)<\/definedNames>/, (_all, inner: string) => {
    const kept = (inner.match(/<definedName\b[^>]*>[\s\S]*?<\/definedName>/g) ?? []).filter((d) => {
      const keep = /name="_xlnm\.(Print_Area|Print_Titles)"/.test(d) && /localSheetId="\d+"/.test(d) &&
        !/\[|file:|#REF!/.test(d);
      if (keep) keptNames++; else droppedNames++;
      return keep;
    });
    return kept.length ? `<definedNames>${kept.join('')}</definedNames>` : '';
  });
  put('xl/workbook.xml', wb);
  log.push(`xl/workbook.xml: OneDrive path and revision pointer removed; ${droppedNames} defined names removed, ${keptNames} print ranges kept`);

  // sheet name → part
  const wbRels = text('xl/_rels/workbook.xml.rels');
  const relTarget = new Map<string, string>();
  for (const m of wbRels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) relTarget.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }
  const sheetPart = new Map<string, string>();
  for (const m of wb.matchAll(/<sheet\b[^>]*\/>/g)) {
    const name = xmlUnescape(/name="([^"]*)"/.exec(m[0])![1]);
    const rid = /r:id="([^"]+)"/.exec(m[0])![1];
    sheetPart.set(name, relTarget.get(rid)!);
  }

  // comments: parts, relationships, the sheets' legacyDrawing, the author list
  const commentTypes = /\/(comments|threadedComment|vmlDrawing)"/;
  for (const [, part] of sheetPart) {
    const relsName = part.replace(/worksheets\/(sheet\d+\.xml)$/, 'worksheets/_rels/$1.rels');
    if (!parts.has(relsName)) continue;
    const rels = text(relsName);
    const removedIds: string[] = [];
    const kept = (rels.match(/<Relationship\b[^>]*\/>/g) ?? []).filter((r) => {
      if (!commentTypes.test(r)) return true;
      removedIds.push(/Id="([^"]+)"/.exec(r)![1]);
      drop(`xl/${/Target="\.\.\/([^"]+)"/.exec(r)![1]}`);
      return false;
    });
    if (!removedIds.length) continue;
    if (kept.length) put(relsName, rels.replace(/<Relationship\b[^>]*\/>/g, '').replace('</Relationships>', `${kept.join('')}</Relationships>`));
    else drop(relsName);
    let sheet = text(part);
    for (const id of removedIds) sheet = sheet.replace(new RegExp(`<legacyDrawing r:id="${id}"/>`), '');
    put(part, sheet);
  }
  drop('xl/persons/person.xml');
  put('xl/_rels/workbook.xml.rels', wbRels.replace(/<Relationship\b[^>]*Target="persons\/person\.xml"[^>]*\/>/, ''));
  put('[Content_Types].xml', text('[Content_Types].xml').replace(/<Override PartName="\/([^"]+)"[^>]*\/>/g, (o, p: string) => (parts.has(p) ? o : '')));

  // names: the listed cells
  const sstXml = text('xl/sharedStrings.xml');
  const sis = sstXml.match(/<si>[\s\S]*?<\/si>/g) ?? [];
  const strings = sis.map((si) => xmlUnescape((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join('')));
  const editsBySheet = new Map<string, Map<string, string | null>>();
  for (const [address, value] of Object.entries(CELL_EDITS)) {
    const [sheet, cell] = splitAddress(address);
    if (!sheetPart.has(sheet)) throw new Error(`no sheet ${sheet}`);
    if (!editsBySheet.has(sheet)) editsBySheet.set(sheet, new Map());
    editsBySheet.get(sheet)!.set(cell, value);
  }
  const newStrings: string[] = [];
  const refsBefore = new Map<number, number>();
  for (const [sheet, part] of sheetPart) {
    const edits = editsBySheet.get(sheet);
    const done = new Set<string>();
    const xml = text(part).replace(/<c r="([A-Z]+\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g, (whole, ref: string, attrs: string, _t, inner?: string) => {
      const isShared = / t="s"/.test(attrs);
      const v = inner ? /<v>(\d+)<\/v>/.exec(inner)?.[1] : undefined;
      if (isShared && v !== undefined) refsBefore.set(+v, (refsBefore.get(+v) ?? 0) + 1);
      if (!edits?.has(ref)) return whole;
      if (!isShared || v === undefined || /<f[\s>]/.test(inner ?? '')) throw new Error(`${sheet}!${ref} is not a constant text cell`);
      done.add(ref);
      const value = edits.get(ref);
      if (value === null) return `<c r="${ref}"${attrs.replace(/ t="s"/, '')}/>`;
      newStrings.push(value);
      return `<c r="${ref}"${attrs}><v>${strings.length + newStrings.length - 1}</v></c>`;
    });
    for (const ref of edits?.keys() ?? []) if (!done.has(ref)) throw new Error(`${sheet}!${ref} not found`);
    put(part, xml);
  }
  // A string no cell points at any more is emptied, so no removed name survives in the table.
  const refsAfter = new Map<number, number>();
  let total = 0;
  for (const [, part] of sheetPart) {
    for (const m of text(part).matchAll(/<c r="[A-Z]+\d+"[^>]*? t="s"[^>]*>\s*<v>(\d+)<\/v>/g)) {
      refsAfter.set(+m[1], (refsAfter.get(+m[1]) ?? 0) + 1);
      total++;
    }
  }
  let emptied = 0;
  const outSis = sis.map((si, i) => {
    if ((refsBefore.get(i) ?? 0) > 0 && !refsAfter.has(i)) { emptied++; return '<si><t></t></si>'; }
    return si;
  });
  for (const s of newStrings) outSis.push(`<si><t>${xmlEscape(s)}</t></si>`);
  put('xl/sharedStrings.xml', sstXml
    .replace(/<sst\b[^>]*>/, (open) => open.replace(/count="\d+"/, `count="${total}"`).replace(/uniqueCount="\d+"/, `uniqueCount="${outSis.length}"`))
    .replace(/(<sst\b[^>]*>)[\s\S]*(<\/sst>)/, (_a, open: string, close: string) => `${open}${outSis.join('')}${close}`));
  log.push(`cells: ${Object.values(CELL_EDITS).filter((v) => v === null).length} values deleted, ${newStrings.length} replaced; ${emptied} unused strings emptied`);

  // What must not survive.
  const leftovers: string[] = [];
  for (const [name, data] of parts) {
    if (!/\.(xml|rels|vml)$/.test(name)) continue;
    const s = data.toString('utf8');
    if (/absPath|docs\.live\.net|<dc:creator>|<cp:lastModifiedBy>|file:\/\/\//.test(s)) leftovers.push(`${name}: metadata`);
    if (/^xl\/(comments|threadedComments|persons)/.test(name)) leftovers.push(`${name}: comment part`);
  }
  for (const s of (parts.get('xl/sharedStrings.xml')!.toString('utf8').match(/<t[^>]*>[^<]*<\/t>/g) ?? [])) {
    if (/\bPT\.?\s+(?!Dummy|DUMMY)/.test(xmlUnescape(s.replace(/<[^>]+>/g, '')))) leftovers.push('xl/sharedStrings.xml: a PT that is not a Dummy');
  }
  if (leftovers.length) throw new Error(`sanitize-workbook: left in the output: ${leftovers.join('; ')}`);

  const order = readZip(input).map((e) => e.name).filter((n) => parts.has(n));
  return { output: writeZip(order.map((name) => ({ name, data: parts.get(name)! }))), log };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inPath, outPath = 'docs/consolidation/source/pt-dummy-psak-338.xlsx'] = process.argv.slice(2);
  if (!inPath) {
    console.error('usage: node --experimental-strip-types scripts/consolidation/sanitize-workbook.ts <original.xlsx> [out.xlsx]');
    process.exit(1);
  }
  const { output, log } = sanitizeWorkbook(readFileSync(inPath));
  writeFileSync(outPath, output);
  for (const line of log) console.log(`sanitize-workbook: ${line}`);
  console.log(`sanitize-workbook: wrote ${outPath} (${output.length} bytes, sha256 ${createHash('sha256').update(output).digest('hex')})`);
}
