/**
 * The dump's trust decision, pure and testable.
 *
 * The backup workflow's whole point is refusing to certify a dump that
 * "succeeded" with almost nothing in it — an anon-key dump RLS-hides the
 * drafts and would otherwise upload as a good artifact. These functions are
 * the rules; scripts/dump-content.mjs applies them.
 *
 *   - A table below its floor, or one that errored, marks the dump suspicious.
 *   - The integrity block proves the authored bodies are actually present.
 */

export const TABLES = [
  { name: 'essays', min: 100 },
  { name: 'essay_revisions', min: 0 },
  { name: 'sections', min: 1 },
  { name: 'categories', min: 1 },
  { name: 'finance_sections', min: 1 },
  { name: 'finance_modules', min: 10 },
  { name: 'fsli_pages', min: 1 },
  { name: 'fsli_sections', min: 0 },
  { name: 'finance_models', min: 0 },
  { name: 'books_uploads', min: 0 },
  { name: 'finance_settings', min: 0 },
];

/**
 * Assess one fetched table against its floor.
 * @returns {{ rows: number, belowFloor: boolean, entry: object }} `entry` is
 *   the manifest record for the table.
 */
export function assessTable(name, min, rowCount, bytes) {
  const belowFloor = rowCount < min;
  return {
    rows: rowCount,
    belowFloor,
    entry: {
      rows: rowCount,
      bytes,
      ...(belowFloor ? { below_expected_floor: true } : {}),
    },
  };
}

/** An errored table is always suspicious; the manifest records why. */
export function assessTableError(message) {
  return { entry: { error: message } };
}

/**
 * The integrity block: the thing the backup exists for. Counted off the
 * dumped essays.json, so a dump of empty rows cannot pass as complete.
 */
export function buildIntegrity(essays) {
  const withBody = essays.filter(e => (e.content && e.content.length > 0) || e.content_json);
  const withPresentation = essays.filter(e => e.presentation);
  return {
    essays_total: essays.length,
    essays_with_body: withBody.length,
    essays_with_presentation: withPresentation.length,
    published: essays.filter(e => e.published).length,
  };
}
