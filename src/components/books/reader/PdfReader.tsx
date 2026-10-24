/**
 * A PDF, one whole page at a time, as a Kindle shows it: pdf.js draws the page onto a canvas scaled to fit the
 * stage's width and height (sharp on a high-density screen), on the reader's dark ground. The file is streamed
 * from its signed URL with range requests, so the first page shows before the whole book arrives.
 *
 * Turning pages: the arrow keys and Page Up/Down; a press on the left or right half of the page; a swipe on a
 * touchscreen. The page reached is kept per browser, and the book opens there next time.
 */
import { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { clampPage, fitScale, isTypingTarget, readPosition, storedPage, turnFor, writePosition } from '@/lib/bookReader';
import { TurnZones } from './TurnZones';
import { useSwipe } from './useSwipe';

GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  url: string;
  title: string;
  slug: string;
  onError: (message: string) => void;
  /** "Page 3 of 58", for the reader's bar. */
  onStatus: (label: string) => void;
  /** The page on screen, for the text view to open at its chapter. */
  onPage?: (page: number) => void;
}

export default function PdfReader({ url, title, slug, onError, onStatus, onPage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState(true);
  const total = doc?.numPages ?? 0;

  useEffect(() => {
    const task = getDocument({ url, disableAutoFetch: true, rangeChunkSize: 1 << 20 });
    let live = true;
    task.promise.then(
      (d) => {
        if (!live) return;
        setPage(storedPage(readPosition(slug), d.numPages));
        setDoc(d);
      },
      () => live && onError('The PDF could not be opened.'),
    );
    return () => {
      live = false;
      void task.destroy();
    };
  }, [url, slug, onError]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setBox({ w: stage.clientWidth, h: stage.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!total) return;
    onStatus(`Page ${page} of ${total}`);
    onPage?.(page);
    writePosition(slug, String(page));
  }, [page, total, slug, onStatus, onPage]);

  useEffect(() => {
    if (!doc || !box.w || !box.h || !canvasRef.current) return;
    let task: RenderTask | null = null;
    let live = true;
    setDrawing(true);
    // A page that will not load or draw (a range request failing mid-read) goes to the page's error state
    // and its retry; a render cancelled by the next page turn is not a failure.
    const fail = (e: unknown) => {
      if (live && (e as { name?: string } | null)?.name !== 'RenderingCancelledException') onError('This page could not be shown.');
    };
    doc.getPage(page).then((p) => {
      if (!live || !canvasRef.current) return;
      const base = p.getViewport({ scale: 1 });
      const fit = fitScale(base.width, base.height, box.w, box.h);
      const ratio = window.devicePixelRatio || 1;
      const view = p.getViewport({ scale: fit * ratio });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(view.width);
      canvas.height = Math.floor(view.height);
      canvas.style.width = `${Math.floor(view.width / ratio)}px`;
      canvas.style.height = `${Math.floor(view.height / ratio)}px`;
      task = p.render({ canvas, viewport: view });
      task.promise.then(() => live && setDrawing(false), fail);
    }, fail);
    return () => {
      live = false;
      task?.cancel();
    };
  }, [doc, page, box, onError]);

  const turn = (step: -1 | 1) => setPage((p) => clampPage(p + step, total));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = turnFor(e.key);
      if (!step || isTypingTarget(e) || !total) return;
      e.preventDefault();
      setPage((p) => clampPage(p + step, total));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  const swipe = useSwipe(turn, total > 0);

  return (
    <div ref={stageRef} className="relative flex h-full w-full touch-pan-y items-center justify-center overflow-hidden" {...swipe}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${title}, page ${page}${total ? ` of ${total}` : ''}`}
        data-page={page}
        className="bg-white shadow-2xl"
      />
      {(drawing || !doc) && <p className="absolute inset-x-0 top-1/2 text-center text-sm text-neutral-400">Loading page…</p>}
      {total > 0 && <TurnZones onTurn={turn} atStart={page <= 1} atEnd={page >= total} />}
    </div>
  );
}
