/**
 * The audited financial statements viewer (PRD §A7, Plan 1.6):
 * /accounting/fsli/:company/:period, the old /accounting/fsli redirect, the
 * tabs, the tie-out badge, search, the admin's publish button, and every row
 * of PHE FY2024's SoFP and P&L as statements.json holds them.
 *
 * Supabase is mocked at the client module with a builder that filters on eq()
 * the way PostgREST does, embedded columns included; nothing here can reach a
 * network. The small fixture's figures are dummies; the last block renders the
 * committed statements.json, which the checker passed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';

const { fromMock, rpcMock, auth } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  auth: { isAdmin: false },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    rpc: (...a: unknown[]) => rpcMock(...a),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: auth.isAdmin, isLoading: false, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/components/layouts/PageLayout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

import FsViewer from '@/pages/FsViewer';
import { FsVerticalStatement } from '@/components/fs/FsVerticalStatement';
import { formatFigure, type FsLine } from '@/lib/fs';

type Row = Record<string, unknown>;

const get = (row: Row, path: string): unknown =>
  path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Row)[k] : undefined), row);

/** A query builder that answers from `rows`, filtering on eq() like PostgREST, embedded paths included. */
function builderFor(rows: Row[], error: unknown = null) {
  let result = rows;
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit', 'in', 'is', 'neq', 'filter']) builder[m] = () => builder;
  builder.eq = (column: string, value: unknown) => {
    result = result.filter((row) => get(row, column) === value);
    return builder;
  };
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(error ? { data: null, error } : { data: result, error: null }).then(resolve, reject);
  return builder;
}

const COMPANY = { id: 'acme', legal_name: 'PT Acme Fixture dan entitas anaknya', short_name: 'ACME' };
const PERIOD = {
  id: 'p-2024',
  company_id: 'acme',
  period_key: 'fy2024',
  period_end: '2024-12-31',
  comparative_end: '2023-12-31',
  currency: 'USD',
  unit: 'thousands',
  auditor: 'KAP Fixture',
  auditor_report_no: '001/FIX',
  auditor_opinion: 'unmodified',
  source_file: 'data/fs/acme/fy2024/source.pdf',
  status: 'published',
  fs_company: COMPANY,
};

let n = 0;
function line(statement: string, sort_order: number, line_type: string, label_id: string, label_en: string, over: Row = {}): Row {
  n += 1;
  return {
    id: `l-${statement}-${sort_order}`,
    period_id: 'p-2024',
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
  };
}

const LINES = [
  line('sofp', 10, 'header', 'ASET', 'ASSETS'),
  line('sofp', 20, 'item', 'Kas dan setara kas', 'Cash and cash equivalents', {
    notes_ref: '3f,6', value_cy: 1200, value_py: 1000, fsli_slug: 'cash-and-cash-equivalents',
  }),
  line('sofp', 30, 'item', 'Piutang lain-lain', 'Other receivables', { indent: 1, notes_ref: '10', value_cy: 0, value_py: 50 }),
  line('sofp', 40, 'total', 'JUMLAH ASET', 'TOTAL ASSETS', { value_cy: 1200, value_py: 1050, source_page: 12 }),
  line('pl_oci', 10, 'item', 'PENDAPATAN USAHA', 'REVENUES', { notes_ref: '35', value_cy: 900, value_py: 800 }),
  line('pl_oci', 20, 'item', 'Beban pokok', 'Cost of revenue', { value_cy: -300, value_py: -250 }),
  line('pl_oci', 30, 'subtotal', 'LABA KOTOR', 'GROSS PROFIT', { value_cy: 600, value_py: 550 }),
];

const check = (rule_id: string, passed: boolean, run_at: string): Row => ({
  rule_id, statement: 'sofp', description: `${rule_id} description`, expected: 1, actual: 1, diff: 0, passed, run_at,
});

let tables: Record<string, Row[]>;

beforeEach(() => {
  n = 0;
  auth.isAdmin = false;
  tables = {
    fs_period: [PERIOD],
    fs_line: LINES,
    fs_soce_cell: [{ period_id: 'p-2024', source_page: 16 }],
    fs_check: [
      // The loader's run, with a failure, then the gate's run: the badge reads the later one.
      check('FOOT:sofp:total_assets:cy', false, '2026-10-11T10:00:00Z'),
      check('FOOT:sofp:total_assets:cy', true, '2026-10-11T16:00:00Z'),
      check('SOFP-BAL:cy', true, '2026-10-11T16:00:00Z'),
      check('PL-GP:cy', true, '2026-10-11T16:00:00Z'),
    ].map((c) => ({ ...c, period_id: 'p-2024' })),
  };
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) => builderFor(tables[table] ?? []));
  rpcMock.mockReset();
});

function Location() {
  const l = useLocation();
  return <div data-testid="location">{l.pathname + l.search}</div>;
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={qc}>
          <Routes>
            <Route path="/accounting/fsli/:company/:period" element={<FsViewer />} />
          </Routes>
          <Location />
        </QueryClientProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const table = () => screen.getByRole('table', { name: /Consolidated Statement/ });
const rowLabels = () => within(table()).getAllByRole('rowheader').map((h) => h.textContent);

describe('the statement of financial position', () => {
  it('prints every row as stored, in order: ID label, English under it, notes, both years', async () => {
    renderAt('/accounting/fsli/acme/fy2024');
    await screen.findByRole('heading', { level: 1, name: 'Laporan Posisi Keuangan Konsolidasian' });
    expect(rowLabels()).toHaveLength(4);
    const cash = within(table()).getByRole('row', { name: /Kas dan setara kas/ });
    expect(within(cash).getByText('Cash and cash equivalents')).toBeInTheDocument();
    expect(within(cash).getAllByRole('cell').map((c) => c.textContent)).toEqual(['3f,6', '1,200', '1,000', 'p.11']);
    // A stored nil prints as the FS's dash; the total carries the double rule.
    const other = within(table()).getByRole('row', { name: /Piutang lain-lain/ });
    expect(within(other).getAllByRole('cell')[1]).toHaveTextContent('-');
    const total = within(table()).getByRole('row', { name: /JUMLAH ASET/ });
    expect(total.querySelector('.border-double')).not.toBeNull();
    expect(within(total).getAllByRole('cell')[3]).toHaveTextContent('p.12');
  });

  it('links a row to its line-item page, and only a row that has one', async () => {
    renderAt('/accounting/fsli/acme/fy2024');
    const link = await screen.findByRole('link', { name: 'Kas dan setara kas' });
    expect(link).toHaveAttribute('href', '/accounting/fsli/cash-and-cash-equivalents');
    expect(within(table()).getAllByRole('link')).toHaveLength(1);
  });

  it('heads the page with the company, the period, the unit and the auditor', async () => {
    renderAt('/accounting/fsli/acme/fy2024');
    await screen.findByRole('heading', { level: 1 });
    const main = screen.getByRole('main');
    expect(main).toHaveTextContent('PT Acme Fixture dan entitas anaknya');
    expect(main).toHaveTextContent('Tanggal 31 Desember 2024 / As of December 31, 2024');
    expect(main).toHaveTextContent('Expressed in thousands of United States dollars, unless otherwise stated');
    expect(main).toHaveTextContent('Audited by KAP Fixture · report 001/FIX · unmodified opinion');
    expect(screen.getByRole('combobox', { name: 'Company' })).toHaveValue('acme');
    expect(within(table()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Line item', 'Notes', '31 Dec 2024', '31 Dec 2023', 'PDF page',
    ]);
  });
});

describe('the tie-out badge', () => {
  it('reads the latest run only, with the pages of every checked row', async () => {
    renderAt('/accounting/fsli/acme/fy2024');
    expect(await screen.findByText('Ties to audited FS — 3 checks passed · p.11–16')).toBeInTheDocument();
  });

  it('says how many checks fail when the latest run has a failure', async () => {
    tables.fs_check = [...tables.fs_check, { ...check('PL-NI:cy', false, '2026-10-11T16:00:00Z'), period_id: 'p-2024' }];
    renderAt('/accounting/fsli/acme/fy2024');
    expect(await screen.findByText('1 check failing, of 4')).toBeInTheDocument();
  });
});

describe('the tabs', () => {
  it('opens profit or loss, puts it in the address, and back', async () => {
    renderAt('/accounting/fsli/acme/fy2024');
    await screen.findByRole('tab', { name: 'Laba Rugi & OCI' });
    fireEvent.click(screen.getByRole('tab', { name: 'Laba Rugi & OCI' }));
    expect(await screen.findByRole('heading', { level: 1, name: /Laporan Laba Rugi/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/accounting/fsli/acme/fy2024?statement=pl_oci');
    expect(rowLabels()).toEqual(['PENDAPATAN USAHAREVENUES', 'Beban pokokCost of revenue', 'LABA KOTORGROSS PROFIT']);
    expect(within(table()).getByRole('row', { name: /Beban pokok/ })).toHaveTextContent('(300)');
    expect(screen.getByRole('main')).toHaveTextContent('Untuk Tahun yang Berakhir pada Tanggal 31 Desember 2024');
    fireEvent.click(screen.getByRole('tab', { name: 'Posisi Keuangan' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/accounting\/fsli\/acme\/fy2024$/);
  });

  it('shows the equity and cash flow tabs as not yet shown, the data loaded or not', async () => {
    for (const [tab, statement] of [['Perubahan Ekuitas', 'soce'], ['Arus Kas', 'cf']]) {
      const { unmount } = renderAt(`/accounting/fsli/acme/fy2024?statement=${statement}`);
      const selected = await screen.findByRole('tab', { selected: true });
      expect(selected).toHaveTextContent(tab);
      expect(screen.getByRole('tabpanel')).toHaveTextContent(/^Not yet shown on this page\.$/);
      unmount();
    }
  });

  it('moves with the arrow keys', async () => {
    renderAt('/accounting/fsli/acme/fy2024');
    const first = await screen.findByRole('tab', { name: 'Posisi Keuangan' });
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Arus Kas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Arus Kas' })).toHaveFocus();
  });
});

describe('search', () => {
  it('keeps the rows whose label or notes match, and says when none does', async () => {
    renderAt('/accounting/fsli/acme/fy2024');
    const box = await screen.findByRole('searchbox', { name: 'Search line items' });
    fireEvent.change(box, { target: { value: 'receivables' } });
    expect(rowLabels()).toEqual(['Piutang lain-lainOther receivables']);
    fireEvent.change(box, { target: { value: '3f,6' } });
    expect(rowLabels()).toEqual(['Kas dan setara kasCash and cash equivalents']);
    fireEvent.change(box, { target: { value: 'goodwill' } });
    expect(screen.getByRole('tabpanel')).toHaveTextContent('No line item matches “goodwill”.');
  });
});

describe('an address with nothing behind it', () => {
  it('is a not-found page, not an empty statement', async () => {
    renderAt('/accounting/fsli/acme/fy2019');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('publishing', () => {
  it('is offered to an admin on a draft, and calls the gate with the period', async () => {
    auth.isAdmin = true;
    tables.fs_period = [{ ...PERIOD, status: 'draft' }];
    rpcMock.mockResolvedValue({ data: [{ run_at: 'x', rules: 3, failed: 0, published: true }], error: null });
    renderAt('/accounting/fsli/acme/fy2024');
    const button = await screen.findByRole('button', { name: 'Publish' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('fs_publish_period', { p_period_id: 'p-2024' }));
  });

  it('is disabled while the latest run has a failure', async () => {
    auth.isAdmin = true;
    tables.fs_period = [{ ...PERIOD, status: 'draft' }];
    tables.fs_check = [{ ...check('SOFP-BAL:cy', false, '2026-10-11T16:00:00Z'), period_id: 'p-2024' }];
    renderAt('/accounting/fsli/acme/fy2024');
    expect(await screen.findByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText(/Publishing is blocked while 1 check fails/)).toBeInTheDocument();
  });

  it('is not offered on a published period, nor to anyone but an admin', async () => {
    auth.isAdmin = true;
    const published = renderAt('/accounting/fsli/acme/fy2024');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
    published.unmount();

    auth.isAdmin = false;
    tables.fs_period = [{ ...PERIOD, status: 'draft' }];
    renderAt('/accounting/fsli/acme/fy2024');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });
});

describe('the route table (App.tsx)', () => {
  it('sends the old /accounting/fsli to PHE FY2024', async () => {
    const { default: App } = await import('@/App');
    tables.fs_period = [{ ...PERIOD, company_id: 'phe', fs_company: { ...COMPANY, id: 'phe', short_name: 'PHE' } }];
    window.history.pushState({}, '', '/accounting/fsli');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/accounting/fsli/phe/fy2024'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Laporan Posisi Keuangan Konsolidasian' })).toBeInTheDocument();
  });
});

// --- PHE FY2024 as committed -------------------------------------------------

const statements = JSON.parse(
  readFileSync(join(__dirname, '../../data/fs/phe/fy2024/statements.json'), 'utf8'),
) as { lines: Array<Row & { statement: string; sort_order: number; label_id: string; label_en: string; notes_ref: string | null; value_cy: number | null; value_py: number | null }> };

function pheLines(statement: string): FsLine[] {
  return statements.lines
    .filter((l) => l.statement === statement)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l) => ({
      id: `${l.statement}-${l.sort_order}`,
      period_id: 'phe',
      statement: l.statement as FsLine['statement'],
      parent_id: null,
      sort_order: l.sort_order,
      line_type: l.line_type as FsLine['line_type'],
      indent: (l.indent as number) ?? 0,
      label_id: l.label_id,
      label_en: l.label_en,
      notes_ref: l.notes_ref ?? null,
      value_cy: l.value_cy ?? null,
      value_py: l.value_py ?? null,
      source_page: l.source_page as number,
      line_key: (l.line_key as string) ?? null,
      fsli_slug: (l.fsli_slug as string) ?? null,
      printed_diff_cy: null,
      printed_diff_py: null,
      printed_diff_note: null,
    }));
}

describe('PHE FY2024, every row of the two statements shown', () => {
  it.each([
    ['sofp', 83, [11, 12, 13]],
    ['pl_oci', 32, [14, 15]],
  ] as const)('%s: %i rows, labels and notes verbatim, figures as printed, nothing added', (statement, count, pages) => {
    const lines = pheLines(statement);
    render(
      <MemoryRouter>
        <FsVerticalStatement lines={lines} periodEnd="2024-12-31" comparativeEnd="2023-12-31" caption={`PHE ${statement}`} />
      </MemoryRouter>,
    );
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(count);
    rows.forEach((row, i) => {
      const l = lines[i];
      const header = within(row).getByRole('rowheader');
      expect(header).toHaveTextContent(l.label_id);
      expect(header).toHaveTextContent(l.label_en);
      const [notes, cy, py, page] = within(row).getAllByRole('cell').map((c) => c.textContent);
      expect(notes).toBe(l.notes_ref ?? '');
      expect(cy).toBe(formatFigure(l.value_cy));
      expect(py).toBe(formatFigure(l.value_py));
      expect(page).toBe(`p.${l.source_page}`);
      expect(pages).toContain(l.source_page);
    });
  });

  it('prints the audited totals the PRD names, to the unit', () => {
    const find = (statement: string, key: string) => pheLines(statement).find((l) => l.line_key === key)!;
    expect(formatFigure(find('sofp', 'total_current_assets').value_cy)).toBe('8,036,328');
    expect(formatFigure(find('sofp', 'total_assets').value_cy)).toBe('30,434,955');
    expect(formatFigure(find('pl_oci', 'total_cost_of_revenue').value_cy)).toBe('(9,330,714)');
    expect(formatFigure(find('pl_oci', 'profit_for_the_year').value_py)).toBe('2,725,538');
  });
});
