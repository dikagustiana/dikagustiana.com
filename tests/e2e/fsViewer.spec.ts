import { test, expect, type Page, type Route } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * The audited statements viewer, end to end, on the production bundle: the old
 * /accounting/fsli lands on PHE FY2024, the tabs, the tie-out badge, and no
 * sideways scroll at 375px (PRD §A7), which only a real layout can measure.
 *
 * As in fsli.spec.ts, a REST handler registered after the shared mock answers
 * from the seed below, filtering on eq() the way PostgREST does. The labels
 * are the longest the PHE statements print; the figures are dummies.
 */

const PERIOD = {
  id: 'p-phe',
  company_id: 'phe',
  period_key: 'fy2024',
  period_end: '2024-12-31',
  comparative_end: '2023-12-31',
  currency: 'USD',
  unit: 'thousands',
  auditor: 'KAP Test',
  auditor_report_no: '001/TEST',
  auditor_opinion: 'unmodified',
  source_file: 'data/fs/phe/fy2024/source.pdf',
  status: 'published',
  fs_company: { id: 'phe', legal_name: 'PT Test dan entitas anaknya', short_name: 'PHE' },
};

const line = (statement: string, sort_order: number, line_type: string, label_id: string, label_en: string, over: Record<string, unknown> = {}) => ({
  id: `l-${statement}-${sort_order}`,
  period_id: 'p-phe',
  statement,
  parent_id: null,
  sort_order,
  line_type,
  indent: 0,
  label_id,
  label_en,
  notes_ref: null,
  value_cy: null,
  value_py: null,
  source_page: statement === 'sofp' ? 11 : 14,
  line_key: null,
  fsli_slug: null,
  printed_diff_cy: null,
  printed_diff_py: null,
  printed_diff_note: null,
  ...over,
});

const FS_LINE = [
  line('sofp', 10, 'header', 'ASET', 'ASSETS'),
  line('sofp', 20, 'item', 'Uang muka dan biaya dibayar di muka - bagian tidak lancar', 'Advances and prepayments - non-current portion', {
    notes_ref: '3k,15', value_cy: 17905149, value_py: -16130290,
  }),
  line('sofp', 30, 'header', 'Pos yang tidak akan di reklasifikasikan ke laba rugi:', 'Item that will not be reclassified to profit or loss:'),
  line('sofp', 40, 'item', 'Kepentingan nonpengendali (“KNP”)', 'Non-controlling interest (“NCI”)', { indent: 1, value_cy: -3649862, value_py: -3649862 }),
  line('sofp', 50, 'total', 'JUMLAH LIABILITAS DAN EKUITAS', 'TOTAL LIABILITIES AND EQUITY', { value_cy: 30434955, value_py: 30888916 }),
  line('pl_oci', 10, 'item', 'PENDAPATAN USAHA', 'REVENUES', { notes_ref: '3p,35', value_cy: 14330340, value_py: 14568384 }),
  line('pl_oci', 20, 'subtotal', 'Jumlah penghasilan komprehensif tahun berjalan yang dapat diatribusikan', 'Total comprehensive income attributable', { value_cy: -9330714, value_py: -8917865 }),
];

const FS_CHECK = ['FOOT:sofp:total:cy', 'SOFP-BAL:cy', 'PL-GP:cy'].map((rule_id) => ({
  period_id: 'p-phe', rule_id, statement: 'sofp', description: rule_id, expected: 1, actual: 1, diff: 0, passed: true,
  run_at: '2026-10-11T16:38:41Z',
}));

const TABLES: Record<string, Record<string, unknown>[]> = {
  fs_period: [PERIOD],
  fs_line: FS_LINE,
  fs_check: FS_CHECK,
  fs_soce_cell: [{ period_id: 'p-phe', source_page: 16 }],
};

function rowsFor(url: string): Record<string, unknown>[] {
  const u = new URL(url);
  const table = u.pathname.split('/rest/v1/')[1]?.split('?')[0] ?? '';
  let rows = TABLES[table] ?? [];
  for (const [key, raw] of u.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op === 'eq') rows = rows.filter((r) => String(r[key]) === value);
  }
  return rows;
}

async function seed(p: Page) {
  await p.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await p.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await mockSupabase(p);
  await p.route('**/rest/v1/fs_*', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rowsFor(route.request().url())) }),
  );
}

test.beforeEach(async ({ page }) => {
  await seed(page);
});

test('the old address lands on PHE FY2024 with its tie-out', async ({ page: p }) => {
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto('/accounting/fsli');
  await expect(p).toHaveURL(/\/accounting\/fsli\/phe\/fy2024$/);
  await expect(p.getByRole('heading', { level: 1, name: 'Laporan Posisi Keuangan Konsolidasian' })).toBeVisible();
  await expect(p.getByText('Ties to audited FS — 3 checks passed · p.11–16')).toBeVisible();
  await expect(p.getByRole('row', { name: /Uang muka/ })).toContainText('(16,130,290)');

  await p.getByRole('tab', { name: 'Laba Rugi & OCI' }).click();
  await expect(p).toHaveURL(/\?statement=pl_oci$/);
  await expect(p.getByRole('row', { name: /PENDAPATAN USAHA/ })).toContainText('14,330,340');
  await p.getByRole('tab', { name: 'Arus Kas' }).click();
  await expect(p.getByRole('tabpanel')).toHaveText('Not yet shown on this page.');
});

for (const statement of ['', '?statement=pl_oci']) {
  test(`no sideways scroll at 375px${statement && ' (profit or loss)'}`, async ({ page: p }) => {
    await p.setViewportSize({ width: 375, height: 812 });
    await p.goto(`/accounting/fsli/phe/fy2024${statement}`);
    await expect(p.getByRole('table', { name: /Consolidated Statement/ })).toBeVisible();
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    // Notes and the English label fold under a tap.
    const row = p.getByRole('row', { name: /Uang muka|PENDAPATAN USAHA/ });
    const detail = row.locator('[id$="-detail"]');
    await expect(detail).toBeHidden();
    await row.getByRole('button').click();
    await expect(detail).toBeVisible();
    await expect(detail).toContainText(/Advances and prepayments|REVENUES/);
    await expect(detail).toContainText(/Notes (3k,15|3p,35)/);
  });
}
