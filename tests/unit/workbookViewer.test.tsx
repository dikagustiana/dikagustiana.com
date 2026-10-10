/**
 * The working paper viewer (PRD site sweep 2026-10, R4.3–R4.7) over a small workbook written here: the sheet
 * tabs, the formula bar and its name box, the grid's selection, outlines and keys, the inspector's chips and
 * jumps with Back, the URL that holds the place, an error cell, merged cells, the grid's window on a large
 * sheet, full screen and the copied address; then the page section, which fetches the JSON only near the
 * viewport and keeps the Method panel and the download when the viewer fails, and whose Method lists are held
 * to the committed JSON.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import WorkbookViewer from '@/components/workbook/WorkbookViewer';
import { WorkingPaperSection } from '@/components/workbook/WorkingPaperSection';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { ERROR_CELLS, EXCLUDED_SHEETS, WORKBOOK_JSON_URL } from '@/lib/workbook/method';
import type { PublishedWorkbook, WorkbookCell } from '@/lib/workbook/types';

const ACCOUNTING = '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)';

/** Three sheets: a summary that reads a detail sheet, the detail sheet, and one too large to render whole. */
const BOOK: PublishedWorkbook = {
  format: 'workbook-json/1',
  source: { path: 'fixture.xlsx', sha256: '0'.repeat(64), bytes: 0 },
  generator: 'tests/unit/workbookViewer.test.tsx',
  sourceSheets: 4,
  excluded: [{ name: 'Hidden Sheet', order: 4, reason: 'hidden' }],
  counts: { sheets: 3, cells: 0, formulas: 0, errors: 1, red: 1, blue: 1 },
  styles: [{ numFmt: ACCOUNTING }, { numFmt: ACCOUNTING, color: 'red' }, { bold: true }, { color: 'blue' }],
  sheets: [
    {
      name: 'Summary',
      order: 1,
      hidden: false,
      dimension: 'A1:D8',
      defaultColWidth: null,
      defaultRowHeight: null,
      columns: [{ col: 'A', width: 20 }],
      rows: [],
      merges: ['A1:C1'],
      freeze: null,
      cells: [
        { a: 'A1', v: 'Summary of the group', s: 2 },
        { a: 'A2', v: 'Cash' },
        { a: 'B2', v: 100, s: 0 },
        { a: 'C2', v: 40, s: 0 },
        { a: 'A3', v: 'Receivables' },
        { a: 'B3', v: 200, f: 'B2*2', s: 0 },
        { a: 'C3', v: 0, f: 'C2-C2', s: 0 },
        { a: 'A4', v: 'Total' },
        { a: 'B4', v: 300, f: 'SUM(B2:B3)', s: 0 },
        { a: 'B5', v: 50, f: "'Detail Sheet'!B2", s: 1 },
        { a: 'B6', v: '#REF!', t: 'e', f: '#REF!+B2' },
        { a: 'B7', v: 'Check', s: 3 },
        { a: 'D8', v: 1 },
      ],
    },
    {
      name: 'Detail Sheet',
      order: 2,
      hidden: false,
      dimension: 'A1:C4',
      defaultColWidth: null,
      defaultRowHeight: null,
      columns: [],
      rows: [],
      merges: [],
      freeze: null,
      cells: [
        { a: 'A1', v: 'Detail' },
        { a: 'B2', v: 50 },
        { a: 'B3', v: 300, f: 'Summary!B4' },
        { a: 'B4', v: 9, f: "'Hidden Sheet'!A1" },
      ],
    },
    {
      name: 'Big',
      order: 3,
      hidden: false,
      dimension: 'A1:AN200',
      defaultColWidth: null,
      defaultRowHeight: null,
      columns: [],
      rows: [],
      merges: [],
      freeze: null,
      cells: [
        { a: 'A1', v: 'Big' },
        { a: 'AN200', v: 7 },
      ],
    },
  ],
};

function renderViewer(url = '/wp') {
  const router = createMemoryRouter([{ path: '/wp', element: <WorkbookViewer book={BOOK} /> }], { initialEntries: [url] });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}

const grid = () => screen.getByRole('grid');
const cellAt = (a: string) => grid().querySelector<HTMLElement>(`[data-a="${a}"]`);
const formulaBar = () => within(screen.getByRole('group', { name: COPY.formulaBar }));
const barText = () => document.querySelector('[data-formula-bar]')?.textContent;
const nameBox = () => screen.getByRole('textbox', { name: COPY.nameBox }) as HTMLInputElement;
/** The inspector by its role and name while it is open; while it is closed the page has it, hidden. */
const inspector = () => screen.queryByRole('complementary', { name: COPY.inspector }) ?? document.querySelector('aside')!;
const place = (router: ReturnType<typeof renderViewer>['router']) => {
  const p = new URLSearchParams(router.state.location.search);
  return `${p.get('sheet')}!${p.get('cell')}`;
};

describe('the workbook viewer', () => {
  it('shows the sheets as tabs in workbook order, the first open, and opens another as a new history entry', async () => {
    const { router } = renderViewer();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Summary', 'Detail Sheet', 'Big']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tablist', { name: COPY.sheets })).toBeInTheDocument();

    await userEvent.click(tabs[1]);
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    expect(router.state.historyAction).toBe('PUSH');
    expect(place(router)).toBe('Detail Sheet!A1');
    expect(cellAt('B3')).toHaveAttribute('aria-label', expect.stringContaining('300'));

    // Arrow keys move between the tabs and open them. The URL follows within URL_EVERY_MS of its last write.
    fireEvent.keyDown(screen.getAllByRole('tab')[1], { key: 'ArrowRight' });
    expect(screen.getAllByRole('tab')[2]).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(place(router)).toBe('Big!A1'));
  });

  it('selects a cell on a click: the name box gives its address and the formula bar its formula with "="', async () => {
    const { router } = renderViewer();
    await userEvent.click(cellAt('B4')!);
    expect(nameBox().value).toBe('B4');
    expect(barText()).toBe('=SUM(B2:B3)');
    expect(cellAt('B4')).toHaveAttribute('aria-selected', 'true');
    expect(grid()).toHaveAttribute('aria-activedescendant', cellAt('B4')!.id);
    expect(router.state.historyAction).toBe('REPLACE');
    expect(place(router)).toBe('Summary!B4');

    // A typed value shows as the file holds it; the grid shows it in the site's convention.
    await userEvent.click(cellAt('C3')!);
    expect(cellAt('C3')).toHaveTextContent('–');
    await userEvent.click(cellAt('A2')!);
    expect(barText()).toBe('Cash');
  });

  it("outlines the selection's precedents on the sheet and tints its dependents", async () => {
    renderViewer('/wp?sheet=Summary&cell=B4');
    expect(grid().querySelector('[data-precedent="B2:B3"]')).not.toBeNull();
    expect(grid().querySelector('[data-selected="B4"]')).not.toBeNull();

    await userEvent.click(cellAt('B2')!);
    const dependents = [...grid().querySelectorAll('[data-dependent]')].map((d) => d.getAttribute('data-dependent'));
    expect(dependents.sort()).toEqual(['B3', 'B4', 'B6']);
    expect(grid().querySelectorAll('[data-precedent]')).toHaveLength(0);
  });

  it('jumps across sheets from the inspector, and Back returns', async () => {
    const { router } = renderViewer('/wp?sheet=Summary&cell=B5');
    fireEvent.keyDown(grid(), { key: 'Enter' });
    expect(inspector()).toBeVisible();
    expect(within(inspector()).getByText("='Detail Sheet'!B2")).toBeInTheDocument();

    await userEvent.click(within(inspector()).getByRole('button', { name: COPY.goTo("'Detail Sheet'!B2") }));
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    expect(nameBox().value).toBe('B2');
    // The button left with the old cell; the grid has the focus, so the keys go on moving the selection.
    expect(grid()).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(nameBox().value).toBe('B3');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(place(router)).toBe('Detail Sheet!B2');
    // The dependent on another sheet is not listed with this sheet's.
    expect(within(inspector()).getByText(COPY.noDependents)).toBeInTheDocument();

    await userEvent.click(formulaBar().getByRole('button', { name: COPY.backTo('Summary!B5') }));
    expect(nameBox().value).toBe('B5');
    await waitFor(() => expect(place(router)).toBe('Summary!B5'));
    expect(formulaBar().queryByRole('button', { name: /Back/ })).toBeNull();

    // A precedent on a sheet D9 leaves out is named and said to be unpublished, not a button.
    await userEvent.click(screen.getAllByRole('tab')[1]);
    await userEvent.click(cellAt('B4')!);
    expect(within(inspector()).getByText("'Hidden Sheet'!A1")).toBeInTheDocument();
    expect(within(inspector()).getByText(COPY.notPublished)).toBeInTheDocument();

    // A precedent on the same sheet is a chip that selects it.
    await userEvent.click(screen.getAllByRole('tab')[0]);
    expect(nameBox().value).toBe('B5');
    await userEvent.click(cellAt('B4')!);
    await userEvent.click(within(inspector()).getByRole('button', { name: /B2:B3/ }));
    expect(nameBox().value).toBe('B2');
    expect(grid()).toHaveFocus();
    // And a dependent's chip.
    await userEvent.click(within(inspector()).getByRole('button', { name: /B3/ }));
    expect(nameBox().value).toBe('B3');
    expect(grid()).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(inspector()).not.toBeVisible();
  });

  it('moves with the arrows, Home and End, Ctrl+Home and Page Down; Enter opens the inspector and Esc closes it', () => {
    renderViewer('/wp?sheet=Summary&cell=B3');
    const key = (k: string, extra: object = {}) => fireEvent.keyDown(grid(), { key: k, ...extra });
    key('ArrowDown');
    expect(nameBox().value).toBe('B4');
    key('ArrowRight');
    expect(nameBox().value).toBe('C4');
    key('ArrowUp');
    expect(nameBox().value).toBe('C3');
    key('Home');
    expect(nameBox().value).toBe('A3');
    key('End');
    expect(nameBox().value).toBe('D3');
    key('Home', { ctrlKey: true });
    expect(nameBox().value).toBe('A1');
    key('PageDown');
    expect(nameBox().value).toBe('A8');
    // Into the merge A1:C1 from below lands on its top-left; out of it to the right steps past it.
    key('PageUp');
    expect(nameBox().value).toBe('A1');
    key('ArrowRight');
    expect(nameBox().value).toBe('D1');

    expect(inspector()).not.toBeVisible();
    key('Enter');
    expect(inspector()).toBeVisible();
    fireEvent.keyDown(grid(), { key: 'Escape' });
    expect(inspector()).not.toBeVisible();
  });

  it('keeps up with a held arrow key, writing the URL at most every 300 ms, and moves on when the browser refuses a write', async () => {
    const { router } = renderViewer('/wp?sheet=Big&cell=A1');
    const navigate = vi.spyOn(router, 'navigate');
    // A key held down: about 30 presses a second, 150 of them here at once.
    for (let i = 0; i < 150; i++) fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    expect(nameBox().value).toBe('A151');
    expect(cellAt('A151')).toHaveAttribute('aria-selected', 'true');
    expect(navigate.mock.calls.length).toBeLessThanOrEqual(1);
    await waitFor(() => expect(place(router)).toBe('Big!A151'));
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(router.state.historyAction).toBe('REPLACE');

    // Safari throws past its limit on history updates; the selection does not wait for the URL.
    navigate.mockImplementation(() => {
      throw new DOMException('history.replaceState() more than 100 times per 10 seconds', 'SecurityError');
    });
    for (let i = 0; i < 20; i++) fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    expect(nameBox().value).toBe('A171');
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(3));
    expect(place(router)).toBe('Big!A151');
    fireEvent.keyDown(grid(), { key: 'ArrowRight' });
    expect(nameBox().value).toBe('B171');

    // The URL catches up once the browser takes writes again.
    navigate.mockRestore();
    fireEvent.keyDown(grid(), { key: 'ArrowRight' });
    await waitFor(() => expect(place(router)).toBe('Big!C171'));
  });

  it("follows the URL when it changes under the viewer, as the browser's Back changes it", async () => {
    const { router } = renderViewer('/wp?sheet=Summary&cell=B4');
    await userEvent.click(screen.getAllByRole('tab')[1]);
    expect(place(router)).toBe('Detail Sheet!A1');
    await act(() => router.navigate(-1));
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    expect(nameBox().value).toBe('B4');
    await act(() => router.navigate('/wp?sheet=Detail%20Sheet&cell=B3'));
    expect(nameBox().value).toBe('B3');
    expect(barText()).toBe('=Summary!B4');
  });

  it('goes to a typed address with Ctrl+G, on this sheet or another, and says when there is no such cell', async () => {
    const { router } = renderViewer();
    fireEvent.keyDown(grid(), { key: 'g', ctrlKey: true });
    expect(nameBox()).toHaveFocus();

    await userEvent.clear(nameBox());
    await userEvent.type(nameBox(), 'Detail Sheet!B3{Enter}');
    expect(place(router)).toBe('Detail Sheet!B3');
    expect(barText()).toBe('=Summary!B4');
    expect(grid()).toHaveFocus();

    fireEvent.keyDown(grid(), { key: 'G', ctrlKey: true });
    await userEvent.clear(nameBox());
    await userEvent.type(nameBox(), "'summary'!$b$4{Enter}");
    expect(barText()).toBe('=SUM(B2:B3)');
    await waitFor(() => expect(place(router)).toBe('Summary!B4'));

    fireEvent.keyDown(grid(), { key: 'g', ctrlKey: true });
    await userEvent.clear(nameBox());
    await userEvent.type(nameBox(), 'Nowhere!A1{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(COPY.noSuchCell);
    expect(nameBox()).toHaveAttribute('aria-invalid', 'true');
    await userEvent.keyboard('{Escape}');
    expect(nameBox().value).toBe('B4');
    expect(grid()).toHaveFocus();
  });

  it('opens at the place the URL names, whatever its case, and an unknown sheet opens the first', () => {
    renderViewer('/wp?sheet=detail%20sheet&cell=b3');
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    expect(nameBox().value).toBe('B3');
    expect(screen.getByText("'Detail Sheet'!B3", { selector: '[data-inspector-address]' })).toBeInTheDocument();
  });

  it('opens the first sheet when the URL names none of its sheets, and snaps a cell inside a merge to its top-left', () => {
    renderViewer('/wp?sheet=Nowhere&cell=B1');
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    expect(nameBox().value).toBe('A1');
    const merged = cellAt('A1')!;
    expect(cellAt('B1')).toBeNull();
    expect(parseFloat(merged.style.width)).toBeGreaterThan(parseFloat(cellAt('D1')!.style.width));
  });

  it('shows an error cell in the error colours, as its code, with the error said in the inspector', async () => {
    renderViewer('/wp?sheet=Summary&cell=B6');
    const cell = cellAt('B6')!;
    expect(cell).toHaveTextContent('#REF!');
    expect(cell).toHaveAttribute('data-kind', 'error');
    expect(cell.className).toContain('bg-wb-error-bg');
    expect(cell).toHaveAttribute('aria-label', `B6, #REF!, ${COPY.legendError}`);
    fireEvent.keyDown(grid(), { key: 'Enter' });
    expect(within(inspector()).getByText(COPY.errorNote)).toBeInTheDocument();
    // The workbook's red and blue type are kept and said.
    expect(cellAt('B5')!.className).toContain('text-wb-red');
    expect(cellAt('B5')).toHaveAttribute('aria-label', expect.stringContaining(COPY.legendRed));
    expect(cellAt('B7')!.className).toContain('text-wb-blue');
  });

  it('renders only the window of a large sheet, and the selected cell wherever it is', () => {
    renderViewer('/wp?sheet=Big&cell=AN200');
    const cells = grid().querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBeGreaterThan(20);
    expect(cells.length).toBeLessThan(800);
    expect(200 * 40).toBeGreaterThan(cells.length * 10);
    expect(cellAt('AN200')).toHaveAttribute('aria-selected', 'true');
    expect(cellAt('A1')).toBeNull();
    expect(grid()).toHaveAttribute('aria-rowcount', '200');
    expect(grid()).toHaveAttribute('aria-colcount', '40');
  });

  it("copies the selected cell's address as Excel writes it, and fills the page when the browser's full screen is not there", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderViewer('/wp?sheet=Detail%20Sheet&cell=B2');
    await userEvent.click(screen.getByRole('button', { name: COPY.copyAddress }));
    expect(writeText).toHaveBeenCalledWith("'Detail Sheet'!B2");
    expect(await screen.findByText(COPY.copied)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: COPY.fullScreen });
    const root = document.querySelector('[data-full-screen]')!;
    await userEvent.click(button);
    expect(root).toHaveAttribute('data-full-screen', 'page');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(grid(), { key: 'Escape' });
    expect(root).toHaveAttribute('data-full-screen', 'off');
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('offers the owner\'s .xlsx under the name D11 gives it', () => {
    renderViewer();
    const link = screen.getByRole('link', { name: COPY.download });
    expect(link).toHaveAttribute('download', 'pt-dummy-psak-338-working-paper.xlsx');
    expect(link.getAttribute('href')).toMatch(/pt-dummy-psak-338.*\.xlsx$/);
  });
});

describe('the working paper section', () => {
  const fetchMock = vi.fn();
  let observers: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit }[] = [];

  beforeEach(() => {
    observers = [];
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          observers.push({ callback, options });
        }
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  const renderSection = (url = '/accounting/consolidated-reporting') => {
    const router = createMemoryRouter([{ path: '/accounting/consolidated-reporting', element: <WorkingPaperSection /> }], { initialEntries: [url] });
    return render(<RouterProvider router={router} />);
  };
  const near = () => act(() => observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

  it('fetches the workbook only when the section nears the viewport, then shows the viewer', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(BOOK), { status: 200 }));
    renderSection();
    expect(screen.getByRole('heading', { name: COPY.heading })).toBeInTheDocument();
    expect(screen.getByText(COPY.lede)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(COPY.loading);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(observers[0].options?.rootMargin).toMatch(/px/);

    near();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(WORKBOOK_JSON_URL);
    expect(await screen.findByRole('grid', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('opens the page at the viewer when a link names a place in the workbook, and nowhere else', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    // jsdom has no scrollIntoView.
    const scrolled = vi.fn();
    Element.prototype.scrollIntoView = scrolled;
    try {
      renderSection().unmount();
      expect(scrolled).not.toHaveBeenCalled();
      const { container } = renderSection('/accounting/consolidated-reporting?sheet=Summary&cell=B4');
      expect(scrolled).toHaveBeenCalledTimes(1);
      expect(scrolled.mock.contexts[0]).toBe(container.querySelector('[data-workbook-viewer]'));
      // A jump, not the page's smooth glide.
      expect(scrolled).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });

  it('keeps the Method panel and the download when the workbook does not load, and says the viewer did not', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));
    renderSection('/accounting/consolidated-reporting?sheet=Summary');
    // A link to a sheet loads at once, without waiting for the viewport.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.failedTitle);
    expect(screen.queryByRole('grid')).toBeNull();

    expect(screen.getByRole('heading', { name: COPY.method })).toBeInTheDocument();
    expect(screen.getByText(COPY.methodCached)).toBeInTheDocument();
    expect(screen.getByText(COPY.methodErrors(49), { exact: false })).toBeInTheDocument();
    for (const s of EXCLUDED_SHEETS) expect(screen.getByText(s.name)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.download })).toHaveAttribute('download', COPY.downloadName);
  });

  it('lists the sheets D9 leaves out and the error cells D8 keeps exactly as the committed JSON has them', () => {
    const book = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../public/consolidation/pt-dummy-psak-338.workbook.json'), 'utf8'),
    ) as PublishedWorkbook;
    expect(EXCLUDED_SHEETS).toEqual(book.excluded.map(({ name, reason }) => ({ name, reason })));
    const errors = book.sheets.flatMap((s) => s.cells.filter((c: WorkbookCell) => c.t === 'e').map((c) => ({ sheet: s.name, code: String(c.v), a: c.a })));
    expect(errors).toHaveLength(book.counts.errors);
    expect(ERROR_CELLS.flatMap((g) => g.cells.map((a) => ({ sheet: g.sheet, code: g.code, a })))).toEqual(errors);
  });
});
