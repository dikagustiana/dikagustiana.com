/**
 * The PSAK 338 working paper as a workbook to read (PRD site sweep 2026-10, R4.3–R4.5; site cleanup 2026-10,
 * A1–A9): the sheet tabs, the formula bar with its name box, and the grid, over the published JSON. Nothing
 * is edited and nothing recalculated; every figure is Excel's cached value. The inspector, the legend, the
 * precedent and dependent highlighting, Copy cell address and the download are gone.
 *
 * Where the reader is shows in the URL, `?sheet=Consol%20SoFP%2024&cell=D9`, so a cell can be linked to. The
 * viewer holds the place itself: it reads the URL when it opens and whenever the URL changes under it (the
 * browser's Back and Forward, a link), and writes it back at most every URL_EVERY_MS, because browsers
 * throttle history updates and a held arrow key would outrun them. A move within a sheet replaces the
 * entry; opening another sheet adds one, so the browser's Back returns to the sheet before. The viewer's
 * own Back returns from a Go To from the name box.
 *
 * Keys, with the focus anywhere in the viewer: Ctrl+G goes to the name box; Esc leaves full screen (the
 * browser's own full screen leaves on Esc by itself). The grid's keys are its own (./SheetGrid). Full screen
 * uses the Fullscreen API on the viewer alone, and fills the page where that is not available (a phone);
 * either way only the tabs, the formula bar, the grid and the Exit control are on screen (A6). The browser's
 * F11 is left to the browser and does not change the control's state, which follows the document's
 * fullscreen element.
 *
 * The default export, so the page can load it as its own chunk.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildRefGraph, decodeA1, encodeA1, qualifiedRef } from '@/lib/workbook/refs';
import { buildSheetModel, firstCell, readGoTo, snap, type Cell, type SheetModel } from '@/lib/workbook/sheet';
import type { PublishedWorkbook, WorkbookSheet } from '@/lib/workbook/types';
import { cn } from '@/lib/utils';
import { FormulaBar } from './FormulaBar';
import { FullScreenButton } from './FullScreenButton';
import { NameBox } from './NameBox';
import { SheetGrid } from './SheetGrid';
import { SheetTabs } from './SheetTabs';

/** How far the viewer's Back can go. */
const BACK_MAX = 50;
/**
 * The URL is written at most this often. Chrome drops history updates past about 200 in 10 s, and Safari
 * throws past 100; a held arrow key moves about 30 times a second.
 */
const URL_EVERY_MS = 300;

interface Place {
  sheet: string;
  cell: Cell;
}

/** A place as the URL spells it, to tell the viewer's own writes from a change made elsewhere. */
const urlKey = (sheet: string | null, cell: string | null): string => `${sheet ?? ''}!${cell ?? ''}`;

type FullScreen = 'off' | 'browser' | 'page';

export default function WorkbookViewer({ book }: { book: PublishedWorkbook }) {
  const uid = useId().replace(/:/g, '');
  const ids = { tabs: `${uid}-tab`, panel: `${uid}-panel`, grid: `${uid}-grid` };

  // Read once per load: the references' graph (for how far each sheet's formulas reach) and the sheets by name. Each sheet is laid out the first time
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
        m = buildSheetModel(s, book.styles, graph.used.get(s.name));
        models.set(s.name, m);
      }
      return m;
    },
    [models, book.styles, graph],
  );
  const findSheet = useCallback((name: string | null) => (name === null ? undefined : byName.get(name.toUpperCase())), [byName]);

  // Where the reader is: the URL's place when the viewer opens, then the viewer's own.
  const [params, setParams] = useSearchParams();
  const placeIn = useCallback(
    (p: URLSearchParams): Place => {
      const s = findSheet(p.get('sheet')) ?? book.sheets[0];
      const m = modelOf(s);
      const at = decodeA1(p.get('cell') ?? '');
      return { sheet: s.name, cell: at ? snap(m, at) : firstCell(s, m) };
    },
    [findSheet, modelOf, book.sheets],
  );
  const [place, setPlace] = useState(() => placeIn(params));
  const sheet = findSheet(place.sheet) ?? book.sheets[0];
  const model = modelOf(sheet);
  const selected = snap(model, place.cell);
  const address = encodeA1(selected.col, selected.row);
  const cell = model.cells.get(address);

  // Each sheet reopens where it was left, as Excel's do.
  const lastCell = useRef(new Map<string, Cell>());
  lastCell.current.set(sheet.name, selected);

  const [back, setBack] = useState<Place[]>([]);
  const [fullScreen, setFullScreen] = useState<FullScreen>('off');

  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const nameBox = useRef<HTMLInputElement>(null);

  // The URL's place as the viewer last read or wrote it, as the URL spells it, and its sheet; the place
  // waiting to be written, and when the URL was last written.
  const inUrl = useRef({ key: urlKey(params.get('sheet'), params.get('cell')), sheet: place.sheet });
  const pending = useRef<Place | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastWrite = useRef(-Infinity);
  const latestSetParams = useRef(setParams);
  useEffect(() => {
    latestSetParams.current = setParams;
  }, [setParams]);

  const writeUrl = useCallback(() => {
    timer.current = undefined;
    const to = pending.current;
    pending.current = null;
    if (!to) return;
    const cell = encodeA1(to.cell.col, to.cell.row);
    const key = urlKey(to.sheet, cell);
    if (key === inUrl.current.key) return;
    lastWrite.current = performance.now();
    // A move within the sheet replaces the URL's entry; another sheet adds one.
    const was = inUrl.current;
    const replace = to.sheet === was.sheet;
    inUrl.current = { key, sheet: to.sheet };
    try {
      latestSetParams.current(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('sheet', to.sheet);
          next.set('cell', cell);
          return next;
        },
        { replace },
      );
    } catch {
      // The browser refused the update: the place stays the viewer's, and the URL catches up at the next move.
      inUrl.current = was;
    }
  }, []);

  /** Selects a place at once, and writes it to the URL now or, within URL_EVERY_MS of the last write, then. */
  const show = useCallback(
    (to: Place) => {
      setPlace(to);
      pending.current = to;
      if (timer.current !== undefined) return;
      const wait = lastWrite.current + URL_EVERY_MS - performance.now();
      if (wait <= 0) writeUrl();
      else timer.current = setTimeout(writeUrl, wait);
    },
    [writeUrl],
  );

  // The URL changed under the viewer (the browser's Back or Forward, a link): it wins over a write still
  // waiting.
  useEffect(() => {
    const key = urlKey(params.get('sheet'), params.get('cell'));
    if (key === inUrl.current.key) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    pending.current = null;
    const to = placeIn(params);
    inUrl.current = { key, sheet: to.sheet };
    setPlace(to);
  }, [params, placeIn]);

  useEffect(() => {
    const waiting = timer;
    return () => clearTimeout(waiting.current);
  }, []);

  const select = useCallback((to: Cell) => show({ sheet: sheet.name, cell: to }), [show, sheet.name]);

  const openSheet = (name: string) => {
    const s = findSheet(name);
    if (s && s.name !== sheet.name) show({ sheet: s.name, cell: lastCell.current.get(s.name) ?? firstCell(s, modelOf(s)) });
  };

  /** A jump the viewer's Back returns from (a Go To). The grid takes the focus, as after Back. */
  const jump = (name: string, to: Cell) => {
    const s = findSheet(name);
    if (!s) return;
    setBack((b) => [...b.slice(1 - BACK_MAX), { sheet: sheet.name, cell: selected }]);
    show({ sheet: s.name, cell: snap(modelOf(s), to) });
    grid.current?.focus();
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
    } else if (e.key === 'Escape' && fullScreen === 'page') {
      e.preventDefault();
      setFullScreen('off');
    }
  };

  const where = back[back.length - 1];
  const filled = fullScreen !== 'off';

  return (
    <div
      ref={root}
      onKeyDown={onKeyDown}
      data-full-screen={fullScreen}
      className={cn('flex flex-col text-foreground', filled ? 'h-full gap-0 overflow-hidden bg-background p-2' : 'gap-3', fullScreen === 'page' && 'fixed inset-0 z-50')}
    >
      {!filled && (
        <div className="flex justify-end">
          <FullScreenButton fullScreen={false} onToggle={toggleFullScreen} />
        </div>
      )}
      <div className={cn('flex min-h-0 flex-col', filled && 'flex-1')}>
        <div className="flex items-end gap-2">
          <SheetTabs id={ids.tabs} sheets={names} active={sheet.name} controls={ids.panel} onSelect={openSheet} className="flex-1" />
          {filled && <FullScreenButton fullScreen onToggle={toggleFullScreen} className="mb-1" />}
        </div>
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
          />
          <div className={cn('flex min-h-0', filled ? 'flex-1' : 'h-[min(70vh,44rem)]')}>
            <SheetGrid id={ids.grid} gridRef={grid} model={model} styles={book.styles} selected={selected} onSelect={select} className="min-w-0 flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
