/**
 * A PDF, one page at a time, drawn by pdf.js onto a canvas as wide as the column (sharp on a high-density
 * screen). The file is streamed from its signed URL with range requests, so the first page shows before
 * the whole book arrives. Arrow keys and Page Up/Down turn pages, as do the buttons.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { Button } from '@/components/ui/button';
import { clampPage, isTypingTarget, turnFor } from '@/lib/bookReader';

GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  url: string;
  title: string;
  onError: (message: string) => void;
}

export default function PdfReader({ url, title, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(0);
  const [drawing, setDrawing] = useState(true);
  const total = doc?.numPages ?? 0;

  useEffect(() => {
    const task = getDocument({ url, disableAutoFetch: true, rangeChunkSize: 1 << 20 });
    let live = true;
    task.promise.then(
      (d) => live && setDoc(d),
      () => live && onError('The PDF could not be opened.'),
    );
    return () => {
      live = false;
      void task.destroy();
    };
  }, [url, onError]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setWidth(box.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !width || !canvasRef.current) return;
    let task: RenderTask | null = null;
    let live = true;
    setDrawing(true);
    doc.getPage(page).then((p) => {
      if (!live || !canvasRef.current) return;
      const base = p.getViewport({ scale: 1 });
      const ratio = window.devicePixelRatio || 1;
      const view = p.getViewport({ scale: (width / base.width) * ratio });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(view.width);
      canvas.height = Math.floor(view.height);
      canvas.style.width = `${Math.floor(view.width / ratio)}px`;
      canvas.style.height = `${Math.floor(view.height / ratio)}px`;
      task = p.render({ canvas, viewport: view });
      task.promise.then(
        () => live && setDrawing(false),
        () => undefined,
      );
    });
    return () => {
      live = false;
      task?.cancel();
    };
  }, [doc, page, width]);

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

  return (
    <div>
      <div ref={boxRef} className="relative w-full overflow-hidden rounded border border-border bg-white">
        <canvas ref={canvasRef} role="img" aria-label={`${title}, page ${page}${total ? ` of ${total}` : ''}`} data-page={page} />
        {(drawing || !doc) && <p className="absolute inset-x-0 top-4 text-center text-sm text-muted-foreground">Loading page…</p>}
      </div>
      <Pager page={page} total={total} onTurn={(step) => setPage((p) => clampPage(p + step, total))} />
    </div>
  );
}

export function Pager({ page, total, onTurn, label }: { page: number; total: number; onTurn: (step: -1 | 1) => void; label?: string }) {
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-4">
      <Button type="button" variant="outline" onClick={() => onTurn(-1)} disabled={total > 0 && page <= 1} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {label ?? (total ? `Page ${page} of ${total}` : 'Loading…')}
      </p>
      <Button type="button" variant="outline" onClick={() => onTurn(1)} disabled={total > 0 && page >= total} aria-label="Next page">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
