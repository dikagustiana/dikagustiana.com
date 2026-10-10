/**
 * Writes the working paper the viewer reads (PRD site sweep 2026-10, R4.1–R4.2):
 *
 *   node --experimental-strip-types scripts/consolidation/build-workbook.ts   (npm run build:workbook)
 *
 * Reads docs/consolidation/source/pt-dummy-psak-338.xlsx and writes
 * public/consolidation/pt-dummy-psak-338.workbook.json, committed and deterministic for the source.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { OUTPUT_PATH, SOURCE_PATH, buildWorkbook, loadSource } from './workbook.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bytes = fs.readFileSync(path.join(ROOT, SOURCE_PATH));
const sha256 = createHash('sha256').update(bytes).digest('hex');
const { json, book } = buildWorkbook(await loadSource(bytes), { sha256, bytes: bytes.length });

const target = path.join(ROOT, OUTPUT_PATH);
const same = fs.existsSync(target) && fs.readFileSync(target, 'utf8') === json;
if (!same) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, json);
}
const c = book.counts;
console.log(`build-workbook: ${c.sheets} sheets · ${c.cells} cells · ${c.formulas} formulas · ${c.errors} errors · ${Buffer.byteLength(json)} bytes · ${same ? 'unchanged' : 'written'}`);
