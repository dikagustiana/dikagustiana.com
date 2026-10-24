/**
 * Chain view, commit 4 (PROMPT-site §3.2–3.3, PRD D-M1), made sheet first
 * (docs/company-models/sheet-first): the model page's head (stage pills, the
 * company tabs that replace the rail, the company bar), its key-figure cards
 * and "The model" in one card: toolbar with the legend, Reset, the
 * inspector's switch, Full screen and Download; the formula bar and its name
 * box; the grid; and the footer with the sheet tabs, zoom and the status
 * line. Every key figure is worked from package rows, each role read from
 * unitEconomics or the driver tree's root; a role the model does not carry
 * says "Not in this model". SYNTHETIC fixtures only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
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
import { COMPANY_TABS_LABEL } from '@/components/finance-in-action/viewer/model/CompanyTabs';
import { STAGE_PILLS_LABEL } from '@/components/finance-in-action/viewer/StagePills';
import { companyRail } from '@/lib/finance-in-action/companyChain';
import { LIMITS } from '@/lib/finance-in-action/layout';
import { companyFacts, companyFactsText } from '@/lib/finance-in-action/view/companyFacts';
import { KEY_FIGURES_LABEL } from '@/components/finance-in-action/viewer/model/KeyFigures';
import { EXIT_FULL_SCREEN, FULL_SCREEN } from '@/components/finance-in-action/viewer/model/ModelCard';
import { COPY } from '@/lib/finance-in-action/copy';
import { KEY_FIGURE_WORDS, keyFigures } from '@/lib/finance-in-action/keyFigures';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { unitEconomicsAt } from '@/lib/finance-in-action/unitEconomics';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';

const at = (ticker: string, query = '') =>
  renderFiaPage(<FiaModelRoute />, { path: '/finance/finance-in-action/:modelSlug', url: `/finance/finance-in-action/${ticker}${query}` });
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

describe('the company tabs (sheet-first PRD R1.2, K5)', () => {
  it('stand in the rail’s order: the sub-industry first, then the rest of the stage, each group labelled', async () => {
    at('scem');
    const nav = await screen.findByRole('navigation', { name: COMPANY_TABS_LABEL });
    const tickers = within(nav)
      .getAllByRole('listitem')
      .map((li) => within(li).getByText(/^[A-Z]{4}$/).textContent);
    const rail = companyRail(reg, pkg('SCEM'));
    expect(tickers).toEqual([...rail.sameSubIndustry, ...rail.restOfStage].map((c) => c.ticker));
    expect(tickers.slice(0, 2)).toEqual(['SCEM', 'XCEM']);
    expect(tickers.slice(2).sort()).toEqual(['INTP', 'SMGR']);
    expect(within(nav).getByRole('list', { name: reg.subIndustry(pkg('SCEM').meta.subIndustry)!.name })).toBeInTheDocument();
    expect(within(nav).getByRole('list', { name: COPY.elsewhereInStage })).toBeInTheDocument();
  });

  it('mark the current company as the page, link only modelled ones, and say each status in words', async () => {
    at('scem');
    const nav = await screen.findByRole('navigation', { name: COMPANY_TABS_LABEL });
    const current = nav.querySelector('[aria-current="page"]')!;
    expect(current).toHaveTextContent('SCEM');
    expect(current.tagName).not.toBe('A');
    expect(within(nav).getByRole('link', { name: /XCEM/ })).toHaveAttribute('href', '/finance/finance-in-action/xcem');
    expect(within(nav).getByRole('link', { name: /XCEM/ })).toHaveAccessibleName(/Example Cement Co/);
    expect(within(nav).queryByRole('link', { name: /INTP/ })).toBeNull();
    // Status as a glyph plus a word.
    expect(within(nav).getAllByText('Not started')).toHaveLength(2);
  });

  it('keep Connections on from one company to the next', async () => {
    at('scem', '?connections=on');
    const nav = await screen.findByRole('navigation', { name: COMPANY_TABS_LABEL });
    expect(within(nav).getByRole('link', { name: /XCEM/ })).toHaveAttribute('href', '/finance/finance-in-action/xcem?connections=on');
  });
});

describe('the stage pills on a model page (R1.1)', () => {
  it('go to each stage on the index and mark the company’s own stage', async () => {
    at('xcoa');
    const nav = await screen.findByRole('navigation', { name: STAGE_PILLS_LABEL });
    const current = nav.querySelector('[aria-current]')!;
    expect(current).toHaveAttribute('aria-current', 'location');
    expect(current).toHaveTextContent('Geological extraction');
    expect(current).toHaveAttribute('href', '/finance/finance-in-action#stage-stage-extraction');
    expect(within(nav).getAllByRole('link').length).toBeGreaterThan(1);
  });
});

describe('the page order (R3)', () => {
  it('puts the model straight after the key figures, then the sections, with anchors to each in order', async () => {
    at('xcoa');
    const card = (await screen.findAllByRole('heading', { name: COPY.theModel }))[0].closest('section')!;
    const figures = screen.getByRole('region', { name: KEY_FIGURES_LABEL });
    const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(figures, card)).toBe(true);
    const nav = screen.getByRole('navigation', { name: COPY.onThisPage });
    const anchors = within(nav).getAllByRole('link');
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual([
      '#fia-drivers',
      '#fia-unit-economics',
      '#fia-cost-flow',
      '#fia-along-chain',
      '#fia-why',
      '#fia-workpaper',
    ]);
    let last: Node = card;
    for (const a of anchors) {
      const heading = document.getElementById(a.getAttribute('href')!.slice(1))!;
      expect(heading.tagName).toBe('H2');
      expect(heading).toHaveTextContent(a.textContent!);
      expect(follows(last, heading)).toBe(true);
      last = heading;
    }
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

const cardOf = async () => (await screen.findAllByRole('heading', { name: COPY.theModel }))[0].closest('section')!;
const nameBox = () => screen.getByRole('textbox', { name: COPY.nameBox });
const formulaBar = () => screen.getByRole('group', { name: COPY.formulaBar });
const statusLine = () => document.querySelector('[data-fia-status]')!;

describe('"The model" card', () => {
  it('holds the legend, the formula bar, the grid, the tabs under it and Download, with Reset only after an edit, in reading order', async () => {
    at('scoa');
    const card = await cardOf();
    const legend = within(card).getByRole('list', { name: 'Cell legend' });
    const bar = within(card).getByRole('group', { name: COPY.formulaBar });
    const grid = within(card).getByRole('grid');
    const tabs = within(card).getByRole('tablist', { name: 'Sheets' });
    expect(within(card).getByRole('button', { name: COPY.download })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: COPY.download })).toHaveLength(1);
    expect(within(card).queryByRole('button', { name: COPY.reset })).toBeNull();
    const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(legend, bar) && follows(bar, grid) && follows(grid, tabs)).toBe(true);
  });

  it('draws the column letters and row numbers the workbook has', async () => {
    at('xcoa');
    const grid = await screen.findByRole('grid');
    const letters = Array.from(grid.querySelectorAll('thead tr:first-child th')).map((th) => th.querySelector('[data-fia-letter]')?.textContent ?? '');
    expect(letters).toEqual(['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']);
    // The year and the forecasts say so over their columns.
    expect(grid.querySelector('thead tr:first-child th:nth-child(12)')).toHaveTextContent('K year');
    expect(grid.querySelector('thead tr:first-child th:nth-child(13)')).toHaveTextContent('L forecast');
    const numbers = Array.from(grid.querySelectorAll('tr > td:first-child')).map((td) => td.textContent);
    expect(numbers.slice(0, 4)).toEqual(['1', '2', '3', '4']);
    expect(within(grid.querySelector('tbody tr:nth-child(3)') as HTMLElement).getByRole('rowheader')).toHaveTextContent('Revenue');
  });
});

describe('the formula bar and the name box (R2.2, K3, K4)', () => {
  it('shows the selected cell’s address and its formula as the package holds it, and lights its letter and number', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('button', { name: /^Revenue, FY 25: 7,270, Formula/ }));
    expect(nameBox()).toHaveValue('MODEL!K4');
    const formula = pkg('XCOA').sheets.find((x) => x.id === 'model')!.rows.find((r) => r.id === 'revenue')!.cells[8].formula!;
    expect(formulaBar()).toHaveTextContent(formula);
    expect(statusLine()).toHaveTextContent('Revenue, FY 25 · Model sheet');
    const grid = screen.getByRole('grid');
    expect(Array.from(grid.querySelectorAll('thead tr:first-child th.bg-secondary [data-fia-letter]')).map((th) => th.textContent)).toEqual(['K']);
    expect(Array.from(grid.querySelectorAll('tbody td.bg-secondary')).map((td) => td.textContent)).toEqual(['4']);
  });

  it('goes to a typed address, on another sheet too, and brings the cell into focus', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await screen.findByRole('grid');
    await user.click(nameBox());
    await user.keyboard('model!C5{Enter}');
    const strip = screen.getByRole('button', { name: /^Strip ratio, Q1 24/ });
    expect(strip).toHaveFocus();
    expect(strip.closest('td')).toHaveAttribute('aria-selected', 'true');
    expect(nameBox()).toHaveValue('MODEL!C5');
    await user.click(nameBox());
    await user.keyboard('reported!c2{Enter}');
    expect(screen.getByRole('tab', { name: 'Reported' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /^Revenue, Q1 24: 1,600, Sourced/ })).toHaveFocus();
    expect(formulaBar()).toHaveTextContent('1,600, from SYNTHETIC interim financial statements Q1 24, p. 12');
  });

  it('says why an address names no value cell, and leaves the selection and the focus where they were', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('button', { name: /^Revenue, FY 25: 7,270, Formula/ }));
    await user.click(nameBox());
    await user.keyboard('A5{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(COPY.nameBoxNotValue('A5', 'label'));
    expect(nameBox()).toHaveFocus();
    expect(nameBox()).toHaveAttribute('aria-invalid', 'true');
    await user.clear(nameBox());
    await user.keyboard('Q99{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('No cell at Q99. Use a value cell such as C5.');
    await user.keyboard('{Escape}');
    expect(nameBox()).toHaveValue('MODEL!K4');
    expect(screen.getByRole('button', { name: /^Revenue, FY 25: 7,270, Formula/ }).closest('td')).toHaveAttribute('aria-selected', 'true');
  });

  it('edits an assumption from the bar, and the model recalculates', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('tab', { name: 'Assumptions' }));
    await user.click(screen.getByRole('button', { name: /^Realised price per tonne, Q2 26E: 720, Assumption/ }));
    expect(nameBox()).toHaveValue('ASSUMPTIONS!M3');
    await user.click(within(formulaBar()).getByRole('button', { name: /^Edit Realised price per tonne: 720/ }));
    const input = within(formulaBar()).getByRole('textbox', { name: /new value/ });
    await user.clear(input);
    await user.type(input, '650{Enter}');
    expect(screen.getByRole('button', { name: /^Realised price per tonne, Q2 26E: 650, Assumption/ })).toBeInTheDocument();
    // Reset stands in the card's toolbar once there is an edit (the inspector's "What changed" has its own).
    expect(within((await cardOf()).firstElementChild as HTMLElement).getByRole('button', { name: COPY.reset })).toBeInTheDocument();
  });
});

describe('the grid from the keyboard (K7)', () => {
  it('selects with the arrows, and edits an assumption in place with F2 or Enter', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('tab', { name: 'Assumptions' }));
    const cell = screen.getByRole('button', { name: /^Realised price per tonne, Q1 26E: 720, Assumption/ });
    cell.focus();
    await user.keyboard('{ArrowRight}');
    expect(nameBox()).toHaveValue('ASSUMPTIONS!M3');
    await user.keyboard('{F2}');
    expect(screen.getByRole('textbox', { name: /Realised price per tonne, new value/ })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /^Realised price per tonne, Q2 26E/ })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(nameBox()).toHaveValue('ASSUMPTIONS!C3');
    await user.keyboard('{End}{Enter}');
    expect(screen.getByRole('textbox', { name: /Realised price per tonne, new value/ })).toHaveFocus();
  });

  it('moves between the sheet tabs with the arrows, and a new sheet opens with nothing selected', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('button', { name: /^Revenue, FY 25: 7,270, Formula/ }));
    const model = screen.getByRole('tab', { name: 'Model' });
    model.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Reported' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Reported' })).toHaveAttribute('aria-selected', 'true');
    expect(nameBox()).toHaveValue('');
    expect(statusLine()).toHaveTextContent(COPY.statusNone('Reported'));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Checks' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('zoom, the status line and the inspector’s switch (R2.5, R2.6, D-S6)', () => {
  it('zooms the grid from 70 to 150 per cent in steps of ten', async () => {
    const user = userEvent.setup();
    at('xcoa');
    const grid = (await screen.findByRole('grid')).closest('[data-fia-grid]') as HTMLElement;
    const zoom = screen.getByRole('group', { name: COPY.zoom });
    expect(zoom).toHaveTextContent('100%');
    await user.click(within(zoom).getByRole('button', { name: COPY.zoomIn }));
    expect(zoom).toHaveTextContent('110%');
    expect(grid.style.getPropertyValue('--fia-grid-scale')).toBe('1.1');
    for (let i = 0; i < 10; i++) fireEvent.click(within(zoom).getByRole('button', { name: COPY.zoomIn }));
    expect(zoom).toHaveTextContent(`${LIMITS.zoomMax}%`);
    expect(within(zoom).getByRole('button', { name: COPY.zoomIn })).toBeDisabled();
    for (let i = 0; i < 10; i++) fireEvent.click(within(zoom).getByRole('button', { name: COPY.zoomOut }));
    expect(zoom).toHaveTextContent(`${LIMITS.zoomMin}%`);
    expect(within(zoom).getByRole('button', { name: COPY.zoomOut })).toBeDisabled();
  });

  it('counts what feeds the selection and what it feeds with Connections on', async () => {
    const user = userEvent.setup();
    at('xcoa', '?connections=on');
    await user.click(await screen.findByRole('button', { name: /^Revenue, FY 25: 7,270, Formula/ }));
    expect(statusLine()).toHaveTextContent(/Revenue, FY 25 · Model sheet · ▲ \d+ feed it · ▼ \d+ fed by it/);
  });

  it('folds the inspector away and back', async () => {
    const user = userEvent.setup();
    at('xcoa');
    const card = await cardOf();
    const show = within(card).getByRole('button', { name: COPY.showInspector });
    expect(show).toHaveAttribute('aria-expanded', 'false');
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    expect(show).toHaveAttribute('aria-controls', inspector.id);
    expect(inspector.className).toContain('xl:hidden');
    await user.click(show);
    expect(within(card).getByRole('button', { name: COPY.hideInspector })).toHaveAttribute('aria-expanded', 'true');
    expect(inspector.className).not.toContain('xl:hidden');
    expect(card.contains(inspector)).toBe(true);
    expect(screen.getAllByRole('complementary', { name: 'Inspector' })).toHaveLength(1);
  });
});

describe('the Checks sheet (D-S4)', () => {
  it('lists each tie-out read-only, and its Cell column goes to the checked cell', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('tab', { name: 'Checks' }));
    const grid = screen.getByRole('grid', { name: 'Checks sheet' });
    expect(within(grid).getAllByRole('rowheader').map((h) => h.textContent)).toEqual(['Revenue, FY 25', 'Cost of revenue, FY 25']);
    expect(within(grid).queryByRole('textbox')).toBeNull();
    await user.click(within(grid).getByRole('button', { name: /^Cost of revenue, FY 25, Difference: 2$/ }));
    expect(nameBox()).toHaveValue('CHECKS!F3');
    expect(statusLine()).toHaveTextContent('Cost of revenue, FY 25, Difference · Checks sheet');
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toHaveTextContent('Differs.');
    await user.click(within(grid).getByRole('button', { name: /^Revenue, FY 25, Cell: REPORTED!K2, go to the cell$/ }));
    expect(screen.getByRole('tab', { name: 'Reported' })).toHaveAttribute('aria-selected', 'true');
    expect(nameBox()).toHaveValue('REPORTED!K2');
    expect(screen.getByRole('button', { name: /^Revenue, FY 25: 7,270, Sourced/ })).toHaveFocus();
  });
});

describe('full screen (R2.8)', () => {
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

describe('the company bar’s facts (R1.3)', () => {
  it('count the documents the sourced cells name, run from the first reported quarter to the latest, and name the currency', () => {
    const p = pkg('XCOA');
    const documents = new Set(p.sheets.flatMap((s) => s.rows.flatMap((r) => r.cells.flatMap((c) => (c.kind === 'sourced' && c.source ? [c.source.document] : [])))));
    expect(companyFacts(p)).toEqual({ filings: documents.size, from: 'Q1 24', to: 'Q4 25', fullTo: 'Q4 25', currency: 'rupiah' });
    expect(companyFactsText(companyFacts(p))).toBe(`${documents.size} filings, Q1 24 to Q4 25; full statements to Q4 25; reported in rupiah.`);
  });

  it('name US dollars for a package reported in them, and no currency for a unit it does not know', () => {
    const p = clone(pkg('XCOA'));
    const revenue = p.unitEconomics.lines.find((l) => l.role === 'revenue')!.rowRef.split('!');
    const row = p.sheets.find((s) => s.id === revenue[0])!.rows.find((r) => r.id === revenue[1])!;
    row.unit = 'US$ mn';
    expect(companyFacts(p).currency).toBe('US dollars');
    row.unit = 'barrels';
    expect(companyFacts(p).currency).toBeNull();
    expect(companyFactsText(companyFacts(p))).not.toContain('reported in');
  });
});
