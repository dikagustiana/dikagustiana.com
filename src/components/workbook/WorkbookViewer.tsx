/**
 * The PSAK 338 working paper as a workbook to inspect (PRD site sweep 2026-10, R4.3–R4.5): the sheet tabs,
 * the formula bar with its name box, the grid and the inspector, over the published JSON. Nothing is edited
 * and nothing recalculated; every figure is Excel's cached value.
 *
 * Where the reader is lives in the URL, `?sheet=Consol%20SoFP%2024&cell=D9`, so a cell can be linked to. A
 * move within a sheet replaces the entry; opening another sheet adds one, so the browser's Back returns to
 * the sheet before. The viewer's own Back returns from a jump: a precedent or dependent chip, a cross-sheet
 * button, a Go To from the name box.
 *
 * Keys, with the focus anywhere in the viewer: Ctrl+G goes to the name box; Esc closes the inspector, or
 * leaves full screen where the browser's own full screen was not available. The grid's keys are its own
 * (./SheetGrid). Full screen uses the Fullscreen API on the viewer alone; the browser's F11 is left to the
 * browser and does not change the button's state, which follows the document's fullscreen element.
 *
 * The default export, so the page can load it as its own chunk.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildRefGraph, decodeA1, dependentsOf, encodeA1, precedentsOf, qualifiedRef } from '@/lib/workbook/refs';
import { buildSheetModel, firstCell, readGoTo, snap, type Cell, type SheetModel } from '@/lib/workbook/sheet';
import type { PublishedWorkbook, WorkbookSheet } from '@/lib/workbook/types';
import { cn } from '@/lib/utils';
import { CellInspector } from './CellInspector';
import { FormulaBar } from './FormulaBar';
import { Legend } from './Legend';
import { NameBox } from './NameBox';
import { SheetGrid, type GridMarks } from './SheetGrid';
import { SheetTabs } from './SheetTabs';
import { Toolbar } from './Toolbar';

/** From this width the inspector stands beside the grid, and opens with the viewer. */
const WIDE = '(min-width: 1024px)';
/** How far the viewer's Back can go. */
const BACK_MAX = 50;

interface Place {
  sheet: string;
  cell: Cell;
}

type FullScreen = 'off' | 'browser' | 'page';

export default function WorkbookViewer({ book }: { book: PublishedWorkbook }) {
  const uid = useId().replace(/:/g, '');
  const ids = { tabs: `${uid}-tab`, panel: `${uid}-panel`, grid: `${uid}-grid`, inspector: `${uid}-inspector` };

  // Read once per load: the references' graph and the sheets by name. Each sheet is laid out the first time
  // it is opened, and kept.
  const { graph, byName, names, models } = useMemo(
    () => ({
      graph: buildRefGraph(book),
      byName: new Map(book.sheets.map((s) => [s.name.toUpperCase(), s])),
      names: book.sheets.map((s) => s.name),
      models: new Map<string, SheetModel>(),
    }),
    [book],
  );
  const modelOf = useCallback(
    (s: WorkbookSheet): SheetModel => {
      let m = models.get(s.name);
      if (!m) {
        m = buildSheetModel(s, book.styles);
        models.set(s.name, m);
      }
      return m;
    },
    [models, book.styles],
  );
  const findSheet = useCallback((name: string | null) => (name === null ? undefined : byName.get(name.toUpperCase())), [byName]);

  // Where the reader is: read from the URL, every render.
  const [params, setParams] = useSearchParams();
  const sheet = findSheet(params.get('sheet')) ?? book.sheets[0];
  const model = modelOf(sheet);
  const asked = params.get('cell');
  const selected = useMemo(() => {
    const at = decodeA1(asked ?? '');
    return at ? snap(model, at) : firstCell(sheet, model);
  }, [model, sheet, asked]);
  const address = encodeA1(selected.col, selected.row);
  const cell = model.cells.get(address);
  const style = cell?.s === undefined ? undefined : book.styles[cell.s];

  // Each sheet reopens where it was left, as Excel's do.
  const lastCell = useRef(new Map<string, Cell>());
  lastCell.current.set(sheet.name, selected);

  const [back, setBack] = useState<Place[]>([]);
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches);
  const [fullScreen, setFullScreen] = useState<FullScreen>('off');

  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const nameBox = useRef<HTMLInputElement>(null);
  const inspector = useRef<HTMLElement>(null);

  /** A move within the sheet replaces the URL's entry; another sheet adds one. */
  const show = useCallback(
    (to: Place) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('sheet', to.sheet);
          next.set('cell', encodeA1(to.cell.col, to.cell.row));
          return next;
        },
        { replace: to.sheet === sheet.name },
      );
    },
    [setParams, sheet.name],
  );

  const select = useCallback((to: Cell) => show({ sheet: sheet.name, cell: to }), [show, sheet.name]);

  const openSheet = (name: string) => {
    const s = findSheet(name);
    if (s && s.name !== sheet.name) show({ sheet: s.name, cell: lastCell.current.get(s.name) ?? firstCell(s, modelOf(s)) });
  };

  /** A jump the viewer's Back returns from. */
  const jump = (name: string, to: Cell) => {
    const s = findSheet(name);
    if (!s) return;
    setBack((b) => [...b.slice(1 - BACK_MAX), { sheet: sheet.name, cell: selected }]);
    show({ sheet: s.name, cell: snap(modelOf(s), to) });
  };

  const goBack = () => {
    const to = back[back.length - 1];
    if (!to) return;
    setBack((b) => b.slice(0, -1));
    show(to);
    grid.current?.focus();
  };

  const goTo = (typed: string): boolean => {
    const read = readGoTo(typed);
    const s = read && (read.sheet === null ? sheet : findSheet(read.sheet));
    if (!read || !s) return false;
    const m = modelOf(s);
    if (read.cell.col > m.lastCol || read.cell.row > m.lastRow) return false;
    jump(s.name, read.cell);
    return true;
  };

  const closeInspector = () => {
    setOpen(false);
    grid.current?.focus();
  };

  const openInspector = (focus: boolean) => {
    setOpen(true);
    // The panel is shown in this render's commit; focus it after.
    if (focus) requestAnimationFrame(() => inspector.current?.focus());
  };

  // The button follows the document's fullscreen element, however full screen began or ended.
  useEffect(() => {
    const follow = () => setFullScreen((was) => (document.fullscreenElement && document.fullscreenElement === root.current ? 'browser' : was === 'browser' ? 'off' : was));
    document.addEventListener('fullscreenchange', follow);
    return () => document.removeEventListener('fullscreenchange', follow);
  }, []);

  const toggleFullScreen = async () => {
    if (fullScreen === 'browser') {
      await document.exitFullscreen().catch(() => setFullScreen('off'));
      return;
    }
    if (fullScreen === 'page') {
      setFullScreen('off');
      return;
    }
    const el = root.current;
    if (el && document.fullscreenEnabled && typeof el.requestFullscreen === 'function') {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        // Refused (a phone's browser, an iframe): fill the page instead.
      }
    }
    setFullScreen('page');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      nameBox.current?.focus();
      nameBox.current?.select();
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        closeInspector();
      } else if (fullScreen === 'page') {
        e.preventDefault();
        setFullScreen('off');
      }
    }
  };

  const precedents = precedentsOf(graph, sheet.name, address);
  const marks: GridMarks = useMemo(
    () => ({
      precedents: precedentsOf(graph, sheet.name, address).filter((p) => p.local),
      dependents: dependentsOf(graph, sheet.name, address)
        .filter((d) => d.sheet === sheet.name)
        .map((d) => d.a),
    }),
    [graph, sheet.name, address],
  );
  const where = back[back.length - 1];
  const filled = fullScreen !== 'off';

  return (
    <div
      ref={root}
      onKeyDown={onKeyDown}
      data-full-screen={fullScreen}
      className={cn(
        // A wide screen sets the legend and the actions above the grid; a narrow one puts the actions first and
        // the legend under the grid, so the grid is not a screen away.
        'flex flex-col gap-3 text-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-6',
        filled && 'overflow-auto bg-background p-3 lg:grid-rows-[auto_minmax(0,1fr)]',
        fullScreen === 'page' && 'fixed inset-0 z-50',
      )}
    >
      <Legend className="order-3 lg:order-none" />
      <Toolbar address={qualifiedRef(sheet.name, address)} fullScreen={filled} onFullScreen={toggleFullScreen} className="order-1 lg:order-none" />
      <div className={cn('order-2 flex min-h-0 flex-col lg:order-none lg:col-span-2', filled && 'flex-1 lg:h-full')}>
        <SheetTabs id={ids.tabs} sheets={names} active={sheet.name} controls={ids.panel} onSelect={openSheet} />
        <div
          id={ids.panel}
          role="tabpanel"
          aria-labelledby={`${ids.tabs}-${names.indexOf(sheet.name)}`}
          className={cn('flex min-h-0 flex-col overflow-hidden rounded-b-md rounded-tr-md border border-border bg-popover', filled && 'flex-1')}
        >
          <FormulaBar
            nameBox={<NameBox ref={nameBox} address={address} onGo={goTo} onDone={() => grid.current?.focus()} />}
            cell={cell}
            backTo={where ? qualifiedRef(where.sheet, encodeA1(where.cell.col, where.cell.row)) : null}
            onBack={goBack}
            inspectorOpen={open}
            inspectorId={ids.inspector}
            onOpenInspector={() => openInspector(true)}
          />
          <div className={cn('flex min-h-0', filled ? 'flex-1' : 'h-[min(70vh,44rem)]')}>
            <SheetGrid
              id={ids.grid}
              gridRef={grid}
              model={model}
              styles={book.styles}
              selected={selected}
              marks={marks}
              onSelect={select}
              onActivate={() => openInspector(false)}
              className="min-w-0 flex-1"
            />
            <CellInspector
              ref={inspector}
              id={ids.inspector}
              open={open}
              sheet={sheet.name}
              address={address}
              cell={cell}
              style={style}
              precedents={precedents}
              dependents={marks.dependents}
              onGo={jump}
              onClose={closeInspector}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
