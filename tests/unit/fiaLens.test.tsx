/**
 * Finance in Action v3.1, Commit 6: the Connections lens on the model page
 * (brief §5.5) and edits (§5.6). Every mark comes from the dependency graph;
 * edits recalculate through the engine and never leave the page.
 */
import fs from 'node:fs';
import path from 'node:path';
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
import { COPY } from '@/lib/finance-in-action/copy';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { runScenario } from '@/lib/finance-in-action/model/scenario';
import { chainThrough, sinkRowRef } from '@/lib/finance-in-action/model/chainPath';
import { treeLayout } from '@/lib/finance-in-action/model/treeLayout';
import { decoration } from '@/lib/finance-in-action/view/decorate';

const pkg = () => previewRegistry().company('XCOA')!.pkg!;
const at = (query = '') =>
  renderFiaPage(<FiaModelRoute />, { path: '/finance/finance-in-action/:modelSlug', url: `/finance/finance-in-action/xcoa${query}` });

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult(null));
});

describe('scenarios', () => {
  it('recalculate an assumption edit through the engine, and reset to the package', () => {
    const wb = new Workbook(pkg());
    const base = wb.values();
    const key = wb.keyOf('assumptions!price', '26Q2E')!;
    const { changed } = runScenario(wb, base, new Map([[key, 650]]));
    expect(changed.map((c) => wb.rowRefOf(c.key))).toEqual(expect.arrayContaining(['assumptions!price', 'model!revenue', 'model!owners_profit']));
    expect(runScenario(wb, base, new Map()).changed).toEqual([]);
  });

  it('refuse to edit anything but an assumption', () => {
    const wb = new Workbook(pkg());
    expect(() => runScenario(wb, wb.values(), new Map([[wb.keyOf('model!revenue', '26Q2E')!, 1]]))).toThrow(/not an assumption/);
  });
});

describe('the chain and the tree', () => {
  it('ends the tree at profit to owners and lays every edge left to right', () => {
    const wb = new Workbook(pkg());
    expect(sinkRowRef(wb)).toBe('model!owners_profit');
    const layout = treeLayout(pkg().driverTree);
    for (const e of pkg().driverTree.edges) expect(layout.at.get(e.from)!.col).toBeLessThan(layout.at.get(e.to)!.col);
  });

  it('runs from the source filing, through the cell, to profit to owners in the same period', () => {
    const wb = new Workbook(pkg());
    const key = wb.keyOf('model!gross_profit', '25Q4')!;
    const chain = chainThrough(wb, key);
    expect(wb.cell(chain[0])!.kind).toBe('sourced');
    expect(chain).toContain(key);
    const last = wb.address(chain[chain.length - 1])!;
    expect(wb.rowRefOf(chain[chain.length - 1])).toBe('model!owners_profit');
    expect(last.periodIndex).toBe(wb.periodIndex('25Q4'));
  });
});

describe('decorations', () => {
  const base = { change: undefined, edited: false, flashing: false, flashToken: 0, row: { unit: 'Rp bn' } };
  it('carry a glyph and words as well as a tint (constraint 13)', () => {
    expect(decoration({ ...base, mark: 'precedent' })).toMatchObject({ glyph: '▲', className: expect.stringContaining('bg-fia-precedent'), label: 'feeds the selection' });
    expect(decoration({ ...base, mark: 'dependent' })).toMatchObject({ glyph: '▼', className: expect.stringContaining('bg-fia-dependent'), label: 'fed by the selection' });
    expect(decoration({ ...base, mark: null })).toBeNull();
  });

  it('show a change as a delta, an edit as an outline, and flash once per edit', () => {
    const d = decoration({ ...base, mark: null, change: { key: 'k', before: 10, after: 4, delta: -6 }, edited: true, flashing: true, flashToken: 3 });
    expect(d?.className).toContain('bg-fia-changed');
    expect(d?.className).toContain('outline-fia-edited');
    expect(d?.className).toContain('fia-flash-1');
    expect(d?.note).toBe('(6,00)');
    expect(d?.label).toBe('changed by your edit, (6,00), edited by you');
  });
});

describe('the lens on the model page', () => {
  it('turns the driver row into the drawn tree, with its edges and the direction caption', async () => {
    const user = userEvent.setup();
    at();
    const section = (await screen.findByRole('heading', { level: 2, name: COPY.howItMakesMoney })).closest('section')!;
    expect(within(section).queryByRole('region', { name: /Driver tree/ })).toBeNull();
    await user.click(screen.getByRole('switch'));
    const tree = within(section).getByRole('region', { name: /Driver tree/ });
    expect(tree.querySelectorAll('svg path[marker-end]')).toHaveLength(pkg().driverTree.edges.length);
    expect(section).toHaveTextContent(COPY.directionReported('tonne'));
    expect(screen.getByText(COPY.connectionsOn)).toBeInTheDocument();
  });

  it('writes the forecast caption for a forecast quarter', async () => {
    const user = userEvent.setup();
    at('?connections=on');
    const section = (await screen.findByRole('heading', { level: 2, name: COPY.howItMakesMoney })).closest('section')!;
    await user.selectOptions(within(section).getByLabelText('Quarter'), '26Q1E');
    expect(section).toHaveTextContent(COPY.directionForecast);
  });

  it('marks one level each way in the tree, the waterfall and the grid, and the full chain on request', async () => {
    const user = userEvent.setup();
    at('?connections=on');
    const section = (await screen.findByRole('heading', { level: 2, name: COPY.howItMakesMoney })).closest('section')!;
    const tree = within(section).getByRole('region', { name: /Driver tree/ });
    await user.click(within(tree).getByRole('button', { name: /^Gross profit:/ }));
    expect(within(tree).getByRole('button', { name: /^Revenue: .*feeds the selection/ })).toBeInTheDocument();
    expect(within(tree).getByRole('button', { name: /^Cost of revenue: .*feeds the selection/ })).toBeInTheDocument();
    expect(within(tree).getByRole('button', { name: /^Gross margin: .*fed by the selection/ })).toBeInTheDocument();
    expect(within(tree).getByRole('button', { name: /^Tonnes sold: / })).not.toHaveAccessibleName(/feeds|fed by/);

    const chart = screen.getByRole('region', { name: /Unit economics chart, Q4 25/ });
    expect(within(chart).getByRole('button', { name: /^Revenue: .*feeds the selection/ })).toBeInTheDocument();
    expect(within(chart).getByRole('button', { name: /^Operating profit: .*fed by the selection/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Revenue, Q4 25: 2\.100, Formula, feeds the selection/ })).toBeInTheDocument();

    await user.click(within(section).getByRole('button', { name: COPY.showFullChain }));
    expect(within(tree).getByRole('button', { name: /^Profit to owners: .*fed by the selection/ })).toBeInTheDocument();
    // In a reported quarter revenue is read out of the statements, so volume does not feed it...
    expect(within(tree).getByRole('button', { name: /^Tonnes sold: / })).not.toHaveAccessibleName(/feeds/);
    // ...in a forecast quarter the arrows run forward, from operation to money.
    await user.selectOptions(within(section).getByLabelText('Quarter'), '26Q1E');
    await user.click(within(tree).getByRole('button', { name: /^Gross profit:/ }));
    expect(within(tree).getByRole('button', { name: /^Tonnes sold: .*feeds the selection/ })).toBeInTheDocument();
  });

  it('shows the chain in the inspector as a breadcrumb from the filing to profit to owners', async () => {
    const user = userEvent.setup();
    at('?connections=on');
    await user.click(await screen.findByRole('button', { name: /^Gross profit, Q4 25/ }));
    const crumbs = within(screen.getByRole('navigation', { name: 'Chain through the selection' })).getAllByRole('button');
    expect(crumbs[0]).toHaveTextContent(/^SYNTHETIC interim financial statements Q4 25: /);
    expect(crumbs[crumbs.length - 1]).toHaveTextContent('Profit attributable to owners');
    await user.click(crumbs[crumbs.length - 1]);
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toHaveTextContent('Profit attributable to owners, Q4 25');
  });
});

describe('editing an assumption', () => {
  async function editPrice(user: ReturnType<typeof userEvent.setup>, text: string) {
    await user.click(await screen.findByRole('tab', { name: 'Assumptions' }));
    const cell = screen.getByRole('button', { name: /^Realised price per tonne, Q2 26E: 720, Assumption/ });
    cell.focus();
    await user.keyboard('{Enter}');
    const input = screen.getByRole('textbox', { name: /Realised price per tonne, new value/ });
    await user.clear(input);
    await user.type(input, `${text}{Enter}`);
  }

  it('recalculates, marks the edit and its effects with deltas, and lists what changed', async () => {
    const user = userEvent.setup();
    at();
    expect(screen.queryByRole('button', { name: COPY.reset })).toBeNull();
    await editPrice(user, '650');
    expect(screen.getByRole('button', { name: /^Realised price per tonne, Q2 26E: 650, Assumption, .*edited by you/ })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Model' }));
    expect(screen.getByRole('button', { name: /^Revenue, Q2 26E: 1\.820, Formula, changed by your edit, \(196\)/ })).toBeInTheDocument();
    const changed = screen.getByRole('region', { name: COPY.whatChanged });
    expect(changed).toHaveTextContent('Your edit: Realised price per tonne, Q2 26E: 720 → 650');
    expect(within(changed).getByRole('button', { name: 'Revenue, Q2 26E' }).closest('tr')).toHaveTextContent('(196)(70,0)');
    expect(screen.getAllByRole('button', { name: COPY.reset }).length).toBeGreaterThan(0);
  });

  it('shows the delta on the tree node and the waterfall bar', async () => {
    const user = userEvent.setup();
    at();
    await editPrice(user, '650');
    const drivers = (screen.getByRole('heading', { level: 2, name: COPY.howItMakesMoney })).closest('section')!;
    await user.selectOptions(within(drivers).getByLabelText('Quarter'), '26Q2E');
    expect(within(drivers).getByRole('button', { name: /^Revenue: 1\.820, changed by your edit, \(196\)/ })).toBeInTheDocument();
    const ue = (screen.getByRole('heading', { level: 2, name: /Unit economics/ })).closest('section')!;
    await user.selectOptions(within(ue).getByLabelText('Period'), '26Q2E');
    const bar = within(ue).getByRole('button', { name: /^Revenue: 650,0 Rp thousand per tonne, changed by your edit/ });
    expect(bar.closest('li')).toHaveTextContent('(70,0)');
  });

  it('resets to the published model', async () => {
    const user = userEvent.setup();
    at();
    await editPrice(user, '650');
    await user.click(screen.getAllByRole('button', { name: COPY.reset })[0]);
    expect(screen.getByRole('button', { name: /^Realised price per tonne, Q2 26E: 720, Assumption$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: COPY.reset })).toBeNull();
    expect(screen.queryByRole('region', { name: COPY.whatChanged })).toBeNull();
  });

  it('refuses what is not a number, and opens no editor on a formula', async () => {
    const user = userEvent.setup();
    at();
    await editPrice(user, 'abc');
    expect(screen.getByRole('alert')).toHaveTextContent('Type a number');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('tab', { name: 'Model' }));
    const formula = screen.getByRole('button', { name: /^Revenue, Q2 26E/ });
    formula.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('textbox', { name: /new value/ })).toBeNull();
  });
});

describe('motion', () => {
  it('flashes only inside prefers-reduced-motion: no-preference, and nothing else in the section moves', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../src/index.css'), 'utf8');
    const block = css.slice(css.indexOf('Finance in Action (brief v3.1)'));
    const media = block.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(media).toBeGreaterThan(-1);
    expect(block.indexOf('.fia-flash-0')).toBeGreaterThan(media);
    expect(block.slice(0, media)).not.toMatch(/animation:/);
    const dirs = ['../../src/components/finance-in-action/viewer', '../../src/pages/finance-in-action'];
    const files = dirs.flatMap((d) => {
      const walk = (p: string): string[] =>
        fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))) : [p];
      return walk(path.resolve(__dirname, d));
    });
    const code = (f: string) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const f of files) expect(code(f), f).not.toMatch(/\b(transition|animate-[a-z])/);
  });
});
