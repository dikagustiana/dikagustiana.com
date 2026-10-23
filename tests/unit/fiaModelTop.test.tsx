/**
 * Chain view, commit 4 (PROMPT-site §3.2–3.3, PRD D-M1): the model page's
 * company rail, its key-figure cards and "The model" in one card with Reset,
 * Full screen and Download. Every key figure is worked from package rows,
 * each role read from unitEconomics or the driver tree's root; a role the
 * model does not carry says "Not in this model". SYNTHETIC fixtures only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeQueryResult } from './helpers/renderWithProviders';
import { renderFiaPage } from './helpers/renderFiaPage';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));

import FiaModelRoute from '@/pages/finance-in-action/FiaModelRoute';
import { RAIL_LABEL } from '@/components/finance-in-action/viewer/model/CompanyRail';
import { KEY_FIGURES_LABEL } from '@/components/finance-in-action/viewer/model/KeyFigures';
import { EXIT_FULL_SCREEN, FULL_SCREEN } from '@/components/finance-in-action/viewer/model/ModelCard';
import { COPY } from '@/lib/finance-in-action/copy';
import { KEY_FIGURE_WORDS, keyFigures } from '@/lib/finance-in-action/keyFigures';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { unitEconomicsAt } from '@/lib/finance-in-action/unitEconomics';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';

const at = (ticker: string) =>
  renderFiaPage(<FiaModelRoute />, { path: '/finance/finance-in-action/:modelSlug', url: `/finance/finance-in-action/${ticker}` });
const reg = previewRegistry();
const pkg = (t: string) => reg.company(t)!.pkg!;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const figuresOf = (p: ModelPackage) => {
  const wb = new Workbook(p);
  const values = wb.values();
  return { wb, values, set: keyFigures(wb, values) };
};

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('the company rail', () => {
  it('lists the sub-industry first, then the rest of the stage, marks the current company and links only modelled ones', async () => {
    at('scem');
    const rail = await screen.findByRole('navigation', { name: RAIL_LABEL });
    const items = within(rail).getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(items.slice(0, 2).map((t) => t.slice(0, 4))).toEqual(['SCEM', 'XCEM']);
    expect(items.slice(2).map((t) => t.slice(0, 4)).sort()).toEqual(['INTP', 'SMGR']);
    const current = rail.querySelector('[aria-current="page"]')!;
    expect(current).toHaveTextContent('SCEM');
    expect(current.tagName).not.toBe('A');
    expect(within(rail).getByRole('link', { name: /XCEM/ })).toHaveAttribute('href', '/finance/finance-in-action/xcem');
    expect(within(rail).queryByRole('link', { name: /INTP/ })).toBeNull();
    // Status as a glyph plus a word.
    expect(within(rail).getAllByText('Not started')).toHaveLength(2);
  });
});

describe('the key-figure cards', () => {
  it('read every role from unitEconomics and the driver tree, in the latest reported quarter with detail', () => {
    const { wb, values, set } = figuresOf(pkg('SCOA'));
    expect(set.periodId).toBe('25Q4');
    const ue = unitEconomicsAt(wb, values, '25Q4');
    const bar = (id: string) => ue.bars.find((b) => b.line.id === id)!.perUnit!;
    const [volume, revenue, cost, profit, owners] = set.figures;
    expect(volume.value).toBe(values.get(wb.keyOf('model!vol_sold', '25Q4')!));
    expect(volume.unit).toBe('Mt');
    expect(volume.yearOnYear).toBeCloseTo((volume.value as number) / (values.get(wb.keyOf('model!vol_sold', '24Q4')!) as number) - 1);
    expect(volume.yearAgoLabel).toBe('Q4 24');
    expect(revenue.value).toBe(bar('revenue'));
    expect(cost.value).toBeCloseTo(['contractor', 'fuel', 'freight', 'royalty', 'other'].reduce((s, id) => s + bar(id), 0));
    expect(profit.title).toBe('Operating profit per tonne');
    expect(profit.value).toBe(bar('operating_profit'));
    expect(revenue.unit).toBe(`${ue.scale.label} per tonne`);
    expect(owners.value).toBe(values.get(wb.keyOf('model!owners_profit', '25Q4')!));
    for (const f of set.figures) expect(f.state).toBe('ok');
  });

  it('say "Not in this model" for a role the model does not carry, and hold no number', () => {
    const p = clone(pkg('SCOA'));
    p.driverTree = { nodes: [], edges: [] };
    p.unitEconomics.lines = p.unitEconomics.lines.filter((l) => l.role !== 'cost' && l.role !== 'unsplit');
    const { set } = figuresOf(p);
    const byRole = Object.fromEntries(set.figures.map((f) => [f.role, f]));
    expect(byRole.owners.state).toBe('not-in-model');
    expect(byRole.cost.state).toBe('not-in-model');
    expect(byRole.owners.value).toBeNull();
    expect(byRole.cost.value).toBeNull();
    expect(byRole.revenue.state).toBe('ok');
    expect(KEY_FIGURE_WORDS['not-in-model']).toBe('Not in this model');
  });

  it('show the words, not a number, on the page when there are no volumes', async () => {
    at('xcem');
    const cards = await screen.findByRole('region', { name: KEY_FIGURES_LABEL });
    for (const role of ['volume', 'revenue', 'cost', 'profit']) {
      const card = cards.querySelector(`[data-key-figure="${role}"]`)!;
      expect(card, role).toHaveTextContent(KEY_FIGURE_WORDS['no-volume']);
    }
    expect(cards.querySelector('[data-key-figure="owners"]')).not.toHaveTextContent(KEY_FIGURE_WORDS['no-volume']);
  });

  it('state each card’s unit and period, and the year-on-year change in words', async () => {
    at('scoa');
    const cards = await screen.findByRole('region', { name: KEY_FIGURES_LABEL });
    const volume = cards.querySelector('[data-key-figure="volume"]')!;
    expect(volume).toHaveTextContent('Mt');
    expect(volume).toHaveTextContent('Q4 25');
    expect(volume).toHaveTextContent(/year on year/);
    expect(within(cards).getAllByRole('listitem')).toHaveLength(5);
  });
});

describe('"The model" card', () => {
  it('holds the tabs, the legend and Download, with Reset only after an edit', async () => {
    at('scoa');
    const card = (await screen.findAllByRole('heading', { name: COPY.theModel }))[0].closest('section')!;
    expect(within(card).getByRole('tablist', { name: 'Sheets' })).toBeInTheDocument();
    expect(within(card).getByRole('list', { name: 'Cell legend' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: COPY.download })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: COPY.download })).toHaveLength(1);
    expect(within(card).queryByRole('button', { name: COPY.reset })).toBeNull();
  });

  it('fills the screen as a dialog, keeps focus inside it, and Escape returns focus to the button', async () => {
    at('scoa');
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: FULL_SCREEN });
    await user.click(button);
    const dialog = screen.getByRole('dialog', { name: COPY.theModel });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: EXIT_FULL_SCREEN })).toHaveFocus();
    // Tab from the last control wraps to the first; Shift+Tab from the first to the last.
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    );
    focusables[focusables.length - 1].focus();
    await user.tab();
    expect(document.activeElement).toBe(focusables[0]);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: FULL_SCREEN })).toHaveFocus();
  });
});
