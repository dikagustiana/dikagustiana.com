/**
 * Reading a free book (docs/books/R2-RUNBOOK.md): the cover page's Download (library phase 2; before it, the dialog's) asking for a signed URL when pressed
 * and saying so when it cannot have one; the reader page choosing pdf.js or epub.js from the signed file,
 * offering Download, and saying plainly when the book is not there; the key and page rules the readers use;
 * the client's handling of the function's answers. pdf.js and epub.js themselves are not run in jsdom.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { invoke, signedMock } = vi.hoisted(() => ({ invoke: vi.fn(), signedMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/components/layouts/PageLayout', () => ({ PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ SEO: ({ title }: { title: string }) => <meta data-seo-title={title} /> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, user: null }) }));
vi.mock('@/components/books/reader/PdfReader', () => ({
  default: ({ url, title, slug, onStatus }: { url: string; title: string; slug: string; onStatus: (s: string) => void }) => (
    <div data-testid="pdf" data-url={url} data-slug={slug}>
      {title}
      <button type="button" onClick={() => onStatus('Page 3 of 58')}>report</button>
    </div>
  ),
}));
vi.mock('@/components/books/reader/EpubReader', () => ({ default: ({ url }: { url: string }) => <div data-testid="epub" data-url={url} /> }));

import { READ_FALLBACK_MESSAGE, removeBookFile, signedBookUrl, uploadBookFile } from '@/lib/bookFile';
import {
  clampPage,
  fitScale,
  isTypingTarget,
  positionKey,
  readPosition,
  readerKind,
  storedPage,
  swipeStep,
  titleFromFilename,
  turnFor,
  writePosition,
} from '@/lib/bookReader';
import { CoverPage } from '@/components/books/CoverPage';
import BookReader from '@/pages/BookReader';
import { TurnZones } from '@/components/books/reader/TurnZones';
import { useSwipe } from '@/components/books/reader/useSwipe';
import { withSpines, type Book } from '@/hooks/queries/useBooks';

const SIGNED = { ok: true, url: 'https://acct.r2.cloudflarestorage.com/dg-books-public/files/open/1-o.pdf?X-Amz-Signature=x', contentType: 'application/pdf', filename: 'Open Finance.pdf' };

const assign = vi.fn();
beforeEach(() => {
  invoke.mockReset();
  assign.mockReset();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
});
afterEach(() => vi.restoreAllMocks());

const httpError = (status: number, body: unknown) => ({ context: new Response(JSON.stringify(body), { status }) });

describe('the book-file client', () => {
  it('returns the signed URL for a read, and a plain sentence for a missing book or a failure', async () => {
    invoke.mockResolvedValueOnce({ data: SIGNED, error: null });
    await expect(signedBookUrl('open', 'download')).resolves.toMatchObject({ ok: true, url: SIGNED.url, filename: 'Open Finance.pdf' });
    expect(invoke).toHaveBeenCalledWith('book-file', { body: { action: 'read', slug: 'open', as: 'download' } });

    invoke.mockResolvedValueOnce({ data: null, error: httpError(404, { ok: false, reason: 'not_found' }) });
    await expect(signedBookUrl('gone', 'inline')).resolves.toEqual({ ok: false, reason: 'not_found', message: 'This book is not available.' });

    invoke.mockResolvedValueOnce({ data: null, error: httpError(503, { ok: false, reason: 'not_configured' }) });
    await expect(signedBookUrl('open', 'inline')).resolves.toEqual({ ok: false, reason: 'not_configured', message: READ_FALLBACK_MESSAGE });

    invoke.mockRejectedValueOnce(new Error('offline'));
    await expect(signedBookUrl('open', 'inline')).resolves.toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('uploads by asking for a PUT URL and sending the file straight to it, and removes through the function', async () => {
    const put = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    invoke.mockResolvedValueOnce({ data: { ok: true, key: 'files/open/1-o.pdf', url: 'https://r2.example/put' }, error: null });
    const file = new File(['%PDF'], 'o.pdf', { type: 'application/pdf' });
    await expect(uploadBookFile('open', file)).resolves.toBe('files/open/1-o.pdf');
    expect(invoke).toHaveBeenCalledWith('book-file', { body: { action: 'upload', slug: 'open', filename: 'o.pdf', contentType: 'application/pdf', size: 4 } });
    expect(put).toHaveBeenCalledWith('https://r2.example/put', { method: 'PUT', body: file, headers: { 'Content-Type': 'application/pdf' } });

    put.mockResolvedValueOnce(new Response(null, { status: 403 }));
    invoke.mockResolvedValueOnce({ data: { ok: true, key: 'k', url: 'https://r2.example/put' }, error: null });
    await expect(uploadBookFile('open', file)).rejects.toThrow('storage answered 403');

    invoke.mockResolvedValueOnce({ data: null, error: httpError(403, { ok: false, reason: 'forbidden', message: 'Only the site owner can change book files.' }) });
    await expect(removeBookFile('files/open/1-o.pdf')).rejects.toThrow('Only the site owner can change book files.');
  });
});

describe('the reader rules', () => {
  it('turns pages with the arrows and Page Up/Down, held to the book, and not while typing or with a modifier', () => {
    expect([turnFor('ArrowRight'), turnFor('PageDown'), turnFor('ArrowLeft'), turnFor('PageUp'), turnFor('a')]).toEqual([1, 1, -1, -1, 0]);
    expect([clampPage(0, 10), clampPage(11, 10), clampPage(4, 10), clampPage(2, 0)]).toEqual([1, 10, 4, 1]);
    const input = document.createElement('input');
    expect(isTypingTarget({ altKey: false, ctrlKey: false, metaKey: false, target: input })).toBe(true);
    expect(isTypingTarget({ altKey: false, ctrlKey: false, metaKey: false, target: document.body })).toBe(false);
    expect(isTypingTarget({ altKey: true, ctrlKey: false, metaKey: false, target: document.body })).toBe(true);
  });

  it('chooses the reader from the type, else the name, and the title from the file name', () => {
    expect(readerKind('application/epub+zip', 'x')).toBe('epub');
    expect(readerKind('', 'x.EPUB')).toBe('epub');
    expect(readerKind('application/pdf', 'x.pdf')).toBe('pdf');
    expect(titleFromFilename('Open Finance.pdf', 'open')).toBe('Open Finance');
    expect(titleFromFilename('.pdf', 'open')).toBe('open');
  });
});

describe('the e-reader rules', () => {
  it('fits a whole page inside the stage, by whichever side is tighter', () => {
    expect(fitScale(600, 800, 1200, 800)).toBe(1); // height-bound: a tall page on a wide screen
    expect(fitScale(600, 800, 300, 2000)).toBe(0.5); // width-bound: a phone held upright
    expect(fitScale(0, 800, 300, 400)).toBe(1);
  });

  it('turns on a sideways swipe of 50 px or more, left forward, and not on a scroll or a tap', () => {
    expect(swipeStep(-80, 10)).toBe(1);
    expect(swipeStep(80, -10)).toBe(-1);
    expect(swipeStep(-30, 0)).toBe(0);
    expect(swipeStep(-80, 70)).toBe(0);
    expect(swipeStep(NaN, 0)).toBe(0);
  });

  it('keeps the place per book and browser, held to the book, and works without storage', () => {
    window.localStorage.clear();
    writePosition('open', '12');
    expect(window.localStorage.getItem(positionKey('open'))).toBe('12');
    expect(storedPage(readPosition('open'), 58)).toBe(12);
    expect(storedPage(readPosition('open'), 10)).toBe(10);
    expect(storedPage(null, 58)).toBe(1);
    expect(storedPage('epubcfi(/6/4)', 58)).toBe(1);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readPosition('open')).toBeNull();
    expect(() => writePosition('open', '3')).not.toThrow();
  });
});

describe('a swipe over a turn zone', () => {
  // jsdom has no PointerEvent; a MouseEvent carries the coordinates and pointerType a touch would.
  beforeEach(() => {
    if (typeof window.PointerEvent === 'undefined') {
      class TestPointerEvent extends MouseEvent {
        pointerType: string;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerType = init.pointerType ?? 'mouse';
        }
      }
      vi.stubGlobal('PointerEvent', TestPointerEvent);
    }
  });
  afterEach(() => vi.unstubAllGlobals());

  const Stage = ({ onTurn }: { onTurn: (step: -1 | 1) => void }) => {
    const swipe = useSwipe(onTurn);
    return (
      <div data-testid="stage" {...swipe}>
        <TurnZones onTurn={onTurn} />
      </div>
    );
  };

  it('turns once: the click the swipe leaves behind is swallowed, and a tap or a key press still turns', async () => {
    const onTurn = vi.fn();
    render(<Stage onTurn={onTurn} />);
    const next = screen.getByRole('button', { name: 'Next page' });
    // A leftward swipe that starts and ends on the right half: forward once, not twice.
    fireEvent.pointerDown(next, { pointerType: 'touch', clientX: 300, clientY: 100 });
    fireEvent.pointerUp(next, { pointerType: 'touch', clientX: 200, clientY: 105 });
    fireEvent.click(next);
    expect(onTurn.mock.calls).toEqual([[1]]);
    // A tap is a click.
    fireEvent.pointerDown(next, { pointerType: 'touch', clientX: 300, clientY: 100 });
    fireEvent.pointerUp(next, { pointerType: 'touch', clientX: 302, clientY: 100 });
    fireEvent.click(next);
    expect(onTurn.mock.calls).toEqual([[1], [1]]);
    // The keyboard is untouched.
    next.focus();
    await userEvent.keyboard('{Enter}');
    expect(onTurn.mock.calls).toEqual([[1], [1], [1]]);
  });
});

const free: Book = {
  id: 'b1', slug: 'open', title: 'Open Finance', author: null, year: null, shelf_id: 's', access: 'free', purchase_url: null,
  license_note: 'CC BY 4.0', filepath: 'files/open/1-o.pdf', file_store: 'r2', filename: 'o.pdf', mime_type: 'application/pdf',
  size_bytes: 4, cover_path: null, synopsis_json: null, synopsis_html: null, synopsis_excerpt: null, sort_order: 0, published: true, deleted_at: null,
};

describe("the cover page's Download", () => {
  const shelf = { id: 's', slug: 'finance', name: 'Finance', sort_order: 0 };
  const renderDialog = () =>
    render(
      <MemoryRouter>
        <CoverPage book={withSpines([{ ...shelf, books: [free] }], [shelf])[0].books[0]} shelf={shelf} citedBy={[]} />
      </MemoryRouter>,
    );

  it('downloads through a signed URL fetched on the press', async () => {
    invoke.mockResolvedValueOnce({ data: SIGNED, error: null });
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(invoke).toHaveBeenCalledWith('book-file', { body: { action: 'read', slug: 'open', as: 'download' } });
    expect(assign).toHaveBeenCalledWith(SIGNED.url);
  });

  it('says so when the file cannot be had, and goes nowhere', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(503, { ok: false, reason: 'not_configured' }) });
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(READ_FALLBACK_MESSAGE);
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('the reader page', () => {
  const Where = () => {
    const l = useLocation();
    return <p data-testid="where">{l.pathname + l.search}</p>;
  };
  const renderReader = (slug = 'open') =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/books-academia/${slug}/read`]}>
          <Routes>
            <Route path="/books-academia/:slug/read" element={<BookReader />} />
            <Route path="/books-academia/:slug" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('opens a PDF in pdf.js, filling the window over the page, titled after the book, with where the reader is, Download and close', async () => {
    invoke.mockResolvedValueOnce({ data: SIGNED, error: null });
    const { container } = renderReader();
    const pdf = await screen.findByTestId('pdf');
    expect(pdf).toHaveAttribute('data-url', SIGNED.url);
    expect(pdf).toHaveAttribute('data-slug', 'open');
    expect(invoke).toHaveBeenCalledWith('book-file', { body: { action: 'read', slug: 'open', as: 'inline' } });
    expect(container.querySelector('[data-reader]')).toHaveClass('fixed', 'inset-0');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('heading', { level: 1, name: 'Open Finance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Close the reader' })).toHaveAttribute('href', '/books-academia/open');
    await userEvent.click(screen.getByRole('button', { name: 'report' }));
    // One live status, read out at every width (visually hidden on a phone, never removed or aria-hidden).
    const live = container.querySelectorAll('[aria-live]');
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveTextContent('Page 3 of 58');
    expect(live[0]).not.toHaveClass('hidden');
    expect(live[0].closest('[aria-hidden="true"]')).toBeNull();
    invoke.mockResolvedValueOnce({ data: { ...SIGNED, url: 'https://r2.example/dl' }, error: null });
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(assign).toHaveBeenCalledWith('https://r2.example/dl');
  });

  it("closes on Esc to the book's cover page, and lets the page scroll again", async () => {
    invoke.mockResolvedValueOnce({ data: SIGNED, error: null });
    renderReader();
    await screen.findByTestId('pdf');
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByTestId('where')).toHaveTextContent('/books-academia/open');
    expect(document.body.style.overflow).toBe('');
  });

  it('asks the browser for full screen with F or the button, where the browser can, and offers none where it cannot', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    HTMLElement.prototype.requestFullscreen = request;
    invoke.mockResolvedValueOnce({ data: SIGNED, error: null });
    const first = renderReader();
    await screen.findByTestId('pdf');
    await userEvent.keyboard('f');
    await userEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(request).toHaveBeenCalledTimes(2);
    first.unmount();

    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    invoke.mockResolvedValueOnce({ data: SIGNED, error: null });
    renderReader();
    await screen.findByTestId('pdf');
    expect(screen.queryByRole('button', { name: 'Full screen' })).toBeNull();
  });

  it('opens an EPUB in epub.js', async () => {
    invoke.mockResolvedValueOnce({ data: { ...SIGNED, contentType: 'application/epub+zip', filename: 'Open.epub' }, error: null });
    renderReader();
    expect(await screen.findByTestId('epub')).toBeInTheDocument();
  });

  it('says a missing or unpublished book is not available, with the way back to the shelves', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(404, { ok: false, reason: 'not_found' }) });
    renderReader('gone');
    expect(await screen.findByText('This book is not available to read here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to the shelves/ })).toHaveAttribute('href', '/books-academia');
    expect(screen.queryByTestId('pdf')).toBeNull();
  });

  it('says a failure is a failure, with a retry', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(503, { ok: false, reason: 'not_configured' }) });
    renderReader();
    expect(await screen.findByText("Couldn't open the book")).toBeInTheDocument();
    invoke.mockResolvedValueOnce({ data: SIGNED, error: null });
    await userEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(await screen.findByTestId('pdf')).toBeInTheDocument();
  });
});
