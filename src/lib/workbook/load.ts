/**
 * Fetching the published working paper (PRD site sweep 2026-10, R4.7): once, when its section nears the
 * viewport. A response that is not the workbook this viewer reads is a failure, not an empty grid.
 */
import { WORKBOOK_JSON_URL } from './method';
import type { PublishedWorkbook } from './types';

export async function loadWorkbook(url: string = WORKBOOK_JSON_URL, signal?: AbortSignal): Promise<PublishedWorkbook> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`The workbook could not be fetched: HTTP ${res.status}.`);
  const book = (await res.json()) as Partial<PublishedWorkbook>;
  if (book?.format !== 'workbook-json/1' || !Array.isArray(book.sheets) || !book.sheets.length || !Array.isArray(book.styles)) {
    throw new Error('The workbook file is not in the format this viewer reads.');
  }
  return book as PublishedWorkbook;
}
