/**
 * Fetching the published working paper (PRD site sweep 2026-10, R4.7): once, when its section nears the
 * viewport. A response that is not the workbook this viewer reads is a failure, not an empty grid.
 */
import type { PublishedWorkbook } from './types';

/**
 * The published workbook, fetched only when the section nears the viewport and never part of a bundle:
 * public/ serves it at this path (Vite does not let a module import a file from public/). The owner's .xlsx
 * is no longer linked or imported anywhere, so the build no longer emits it (site cleanup 2026-10, A3, X7).
 */
export const WORKBOOK_JSON_URL = '/consolidation/pt-dummy-psak-338.workbook.json';

export async function loadWorkbook(url: string = WORKBOOK_JSON_URL, signal?: AbortSignal): Promise<PublishedWorkbook> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`The workbook could not be fetched: HTTP ${res.status}.`);
  const book = (await res.json()) as Partial<PublishedWorkbook>;
  if (book?.format !== 'workbook-json/1' || !Array.isArray(book.sheets) || !book.sheets.length || !Array.isArray(book.styles)) {
    throw new Error('The workbook file is not in the format this viewer reads.');
  }
  return book as PublishedWorkbook;
}
