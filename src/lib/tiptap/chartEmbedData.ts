/**
 * The chartEmbed node's one field, apart from the node itself, so the reading
 * page and serialize.ts can use it without importing TipTap (the essay
 * chunk must not pull the editor in; GATE_LEDGER row 5).
 */

export const CHART_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A slug as ds_chart allows it, or '' for anything else. */
export function normalizeChartSlug(value: unknown): string {
  const s = typeof value === 'string' ? value.trim() : '';
  return CHART_SLUG.test(s) ? s : '';
}
