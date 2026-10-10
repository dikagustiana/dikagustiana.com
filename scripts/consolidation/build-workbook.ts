/**
 * Writes the working paper the viewer reads (PRD site sweep 2026-10, R4.1–R4.2):
 *
 *   node --experimental-strip-types scripts/consolidation/build-workbook.ts   (npm run build:workbook)
 *
 * Reads docs/consolidation/source/pt-dummy-psak-338.xlsx and writes
 * public/consolidation/pt-dummy-psak-338.workbook.json and docs/consolidation/build-report.md, both
 * committed and deterministic for the source.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { OUTPUT_PATH, REPORT_PATH, SOURCE_PATH, buildWorkbook, loadSource } from './workbook.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bytes = fs.readFileSync(path.join(ROOT, SOURCE_PATH));
const sha256 = createHash('sha256').update(bytes).digest('hex');
const { json, report, book } = buildWorkbook(await loadSource(bytes), { sha256, bytes: bytes.length });

const written: string[] = [];
for (const [file, text] of [[OUTPUT_PATH, json], [REPORT_PATH, report]]) {
  const target = path.join(ROOT, file);
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === text) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  written.push(file);
}
const c = book.counts;
console.log(`build-workbook: ${c.sheets} sheets · ${c.cells} cells · ${c.formulas} formulas · ${c.errors} errors · ${Buffer.byteLength(json)} bytes · ${written.length ? `written ${written.join(', ')}` : 'unchanged'}`);
