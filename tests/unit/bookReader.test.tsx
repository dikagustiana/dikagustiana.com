/**
 * Reading a free book (docs/books/R2-RUNBOOK.md): the dialog's Download asking for a signed URL when pressed
 * and saying so when it cannot have one; the reader page choosing pdf.js or epub.js from the signed file,
 * offering Download, and saying plainly when the book is not there; the key and page rules the readers use;
 * the client's handling of the function's answers. pdf.js and epub.js themselves are not run in jsdom.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { invoke, signedMock } = vi.hoisted(() => ({ invoke: vi.fn(), signedMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/components/layouts/PageLayout', () => ({ PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ SEO: ({ title }: { title: string }) => <meta data-seo-title={title} /> }));
vi.mock('@/components/books/reader/PdfReader', () => ({ default: ({ url, title }: { url: string; title: string }) => <div data-testid="pdf" data-url={url}>{title}</div> }));
vi.mock('@/components/books/reader/EpubReader', () => ({ default: ({ url }: { url: string }) => <div data-testid="epub" data-url={url} /> }));

import { READ_FALLBACK_MESSAGE, removeBookFile, signedBookUrl, uploadBookFile } from '@/lib/bookFile';
import { clampPage, isTypingTarget, readerKind, titleFromFilename, turnFor } from '@/lib/bookReader';
import { BookDialog } from '@/components/books/BookDialog';
import BookReader from '@/pages/BookReader';
import type { Book } from '@/hooks/queries/useBooks';

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

const free: Book = {
  id: 'b1', slug: 'open', title: 'Open Finance', author: null, year: null, shelf_id: 's', access: 'free', purchase_url: null,
  license_note: 'CC BY 4.0', filepath: 'files/open/1-o.pdf', file_store: 'r2', filename: 'o.pdf', mime_type: 'application/pdf',
  size_bytes: 4, cover_path: null, synopsis_json: null, synopsis_html: null, synopsis_excerpt: null, sort_order: 0, published: true, deleted_at: null,
};

describe('the dialog', () => {
  const renderDialog = () =>
    render(
      <MemoryRouter>
        <BookDialog book={free} shelfName="Finance" onClose={() => undefined} />
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
  const renderReader = (slug = 'open') =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[`/books-academia/${slug}/read`]}>
          <Routes>
            <Route path="/books-academia/:slug/read" element={<BookReader />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('opens a PDF in pdf.js from an inline signed URL, titled after the book, with Download and a way back', async () => {
    invoke.mockResolvedValueOnce({ data: SIGNED, error: null });
    renderReader();
    const pdf = await screen.findByTestId('pdf');
    expect(pdf).toHaveAttribute('data-url', SIGNED.url);
    expect(invoke).toHaveBeenCalledWith('book-file', { body: { action: 'read', slug: 'open', as: 'inline' } });
    expect(screen.getByRole('heading', { level: 1, name: 'Open Finance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /About this book/ })).toHaveAttribute('href', '/books-academia?book=open');
    invoke.mockResolvedValueOnce({ data: { ...SIGNED, url: 'https://r2.example/dl' }, error: null });
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(assign).toHaveBeenCalledWith('https://r2.example/dl');
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
