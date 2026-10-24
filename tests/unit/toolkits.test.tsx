/**
 * Toolkits (docs/prd/finance-restructure §1 E, §3, §4): the admin form, whose Publish waits for every field
 * and both attestations and shows the database's own refusal; the public page's cards; and the module
 * page's "Toolkit" line. Supabase is mocked at the client module: nothing here reaches a network.
 */
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeQueryResult } from './helpers/renderWithProviders';

const { fromMock, invokeMock } = vi.hoisted(() => ({ fromMock: vi.fn(), invokeMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));
vi.mock('@/components/layouts/PageLayout', () => ({ PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/hooks/queries/useFinance', () => ({
  useFinanceSectionBySlug: () => ({ data: { title: 'Financial Analytics' }, isLoading: false }),
  useFinanceModuleBySlug: () => ({
    data: { id: 'm7', slug: 't4-m07', title: 'Driver-Based Forecasting and Business Model Mapping', thesis: null, sort_order: 7, framing_content: null, module_meta: null },
    isLoading: false,
  }),
  useEssaysByModuleId: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));

import { ToolkitForm } from '@/components/toolkits/ToolkitForm';
import ToolkitsPage, { TOOLKITS_EMPTY } from '@/pages/ToolkitsPage';
import FinanceModulePage from '@/pages/FinanceModulePage';
import { CHECK_LABELS, moduleLabel, toolkitErrors, type ModuleRef, type Toolkit } from '@/hooks/queries/useToolkits';

const MODULE: ModuleRef = { id: 'm7', slug: 't4-m07', title: 'Driver-Based Forecasting and Business Model Mapping', track_slug: 'analytics', sort_order: 7 };

const toolkit: Toolkit = {
  id: 't1',
  slug: 'driver-tree',
  title: 'Driver tree',
  purpose: 'Rebuild revenue from volume and price, one driver per row.',
  module_id: 'm7',
  format: 'xlsx',
  status: 'published',
  checks: { no_client_data: true, verified_model: true },
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-24T00:00:00Z',
  finance_modules: MODULE,
  toolkit_versions: [
    { id: 'v2', toolkit_id: 't1', version: '1.2', changelog: null, file_key: 'toolkits/driver-tree/1.2/driver-tree-v1.2.xlsx', size_bytes: 10, sha256: 'b'.repeat(64), published_at: '2026-10-24T03:00:00Z' },
    { id: 'v1', toolkit_id: 't1', version: '1.0', changelog: null, file_key: 'toolkits/driver-tree/1.0/driver-tree-v1.0.xlsx', size_bytes: 10, sha256: 'a'.repeat(64), published_at: '2026-10-01T03:00:00Z' },
  ],
};

const wrap = (ui: ReactNode, route = '/') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

const xlsx = () => new File(['x'], 'Driver Tree.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

async function fillNewToolkit() {
  await userEvent.type(screen.getByLabelText('Title'), 'Driver tree');
  await userEvent.type(screen.getByLabelText('Purpose'), 'Rebuild revenue from volume and price.');
  await userEvent.selectOptions(screen.getByLabelText('Linked module'), 'm7');
  await userEvent.type(screen.getByLabelText('Version'), '1.0');
  await userEvent.upload(screen.getByLabelText('File'), xlsx());
}

beforeEach(() => {
  fromMock.mockReset();
  invokeMock.mockReset();
});

describe('the Toolkits admin form', () => {
  it('names the module by track and title, and slugs the title until edited', async () => {
    wrap(<ToolkitForm toolkit={null} modules={[MODULE]} takenSlugs={[]} onDone={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'T4 · Driver-Based Forecasting and Business Model Mapping' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Title'), 'Driver Tree, Coal');
    expect(screen.getByLabelText('Slug')).toHaveValue('driver-tree-coal');
  });

  it('keeps Publish disabled until every field passes and BOTH boxes are ticked', async () => {
    wrap(<ToolkitForm toolkit={null} modules={[MODULE]} takenSlugs={[]} onDone={vi.fn()} />);
    const publish = screen.getByRole('button', { name: 'Publish' });
    expect(publish).toBeDisabled();
    await fillNewToolkit();
    expect(publish).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: CHECK_LABELS.no_client_data }));
    expect(publish).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: CHECK_LABELS.verified_model }));
    expect(publish).toBeEnabled();
    await userEvent.click(screen.getByRole('checkbox', { name: CHECK_LABELS.no_client_data }));
    expect(publish).toBeDisabled();
  });

  it("shows the database's refusal when the server's gate says no", async () => {
    fromMock.mockImplementation(() =>
      makeQueryResult(null, { code: '23514', message: 'new row for relation "toolkits" violates check constraint "toolkits_publish_checks"' }),
    );
    wrap(<ToolkitForm toolkit={null} modules={[MODULE]} takenSlugs={[]} onDone={vi.fn()} />);
    await fillNewToolkit();
    await userEvent.click(screen.getByRole('checkbox', { name: CHECK_LABELS.no_client_data }));
    await userEvent.click(screen.getByRole('checkbox', { name: CHECK_LABELS.verified_model }));
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The server refused to publish: both checks must be ticked.');
    // Refused before any upload was asked for.
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('a new version keeps the slug, starts unticked, and refuses a version number already published', async () => {
    wrap(<ToolkitForm toolkit={toolkit} modules={[MODULE]} takenSlugs={['driver-tree']} onDone={vi.fn()} />);
    expect(screen.getByLabelText('Slug')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: CHECK_LABELS.no_client_data })).not.toBeChecked();
    expect(screen.getByText(/Published: 1.2, 1.0/)).toBeInTheDocument();
    const draft = { id: 't1', title: 'Driver tree', slug: 'driver-tree', purpose: 'x', module_id: 'm7', version: '1.2', changelog: '', file: xlsx(), checks: { no_client_data: true, verified_model: true } };
    expect(toolkitErrors(draft, { takenSlugs: [], takenVersions: ['1.2', '1.0'] }).version).toMatch(/already published/);
    expect(toolkitErrors({ ...draft, version: '1.3' }, { takenSlugs: [], takenVersions: ['1.2', '1.0'] })).toEqual({});
  });
});

describe('/finance/toolkits', () => {
  it('draws a card per published toolkit: purpose, format, version, date, module, and a Download that names the file', async () => {
    fromMock.mockImplementation(() => makeQueryResult([toolkit]));
    wrap(<ToolkitsPage />);
    const card = (await screen.findByRole('heading', { name: 'Driver tree' })).closest('article')!;
    expect(within(card).getByText('xlsx · v1.2 · updated 24 Oct 2026')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: moduleLabel(MODULE) })).toHaveAttribute('href', '/finance/analytics/t4-m07');
    expect(within(card).getByRole('button', { name: /Download driver-tree-v1.2.xlsx/ })).toBeInTheDocument();
    expect(within(card).getByText('Previous versions')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Download driver-tree-v1.0.xlsx' })).toBeInTheDocument();
  });

  it('asks for the version a button names, so an older link still opens that version', async () => {
    fromMock.mockImplementation(() => makeQueryResult([toolkit]));
    invokeMock.mockResolvedValue({ data: { ok: false }, error: null });
    wrap(<ToolkitsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Download driver-tree-v1.0.xlsx' }));
    expect(invokeMock).toHaveBeenCalledWith('toolkit-file', { body: { action: 'read', slug: 'driver-tree', version: '1.0' } });
  });

  it('says so when nothing is published, and leaves out a toolkit with no file yet', async () => {
    fromMock.mockImplementation(() => makeQueryResult([{ ...toolkit, toolkit_versions: [] }]));
    wrap(<ToolkitsPage />);
    expect(await screen.findByText(TOOLKITS_EMPTY)).toBeInTheDocument();
  });
});

describe('the module page', () => {
  it('shows a Toolkit line under the header for each published toolkit from the module', async () => {
    fromMock.mockImplementation(() => makeQueryResult([toolkit]));
    wrap(<FinanceModulePage />, '/finance/analytics/t4-m07');
    const link = await screen.findByRole('link', { name: 'Driver tree' });
    expect(link).toHaveAttribute('href', '/finance/toolkits#toolkit-driver-tree');
    expect(link.closest('p')).toHaveTextContent('Toolkit: Driver tree · v1.2');
  });

  it('shows nothing when the module has no toolkit', async () => {
    fromMock.mockImplementation(() => makeQueryResult([]));
    wrap(<FinanceModulePage />, '/finance/analytics/t4-m07');
    await screen.findByRole('heading', { name: 'Lessons' });
    expect(screen.queryByText(/^Toolkit:/)).toBeNull();
  });
});
