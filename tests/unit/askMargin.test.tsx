/**
 * Margin questions in the reader (docs/prd/library-phase-2 §3; src/pages/BookReader.tsx, TextView.tsx,
 * AskMargin.tsx): a free book with extracted text gets Text; its chapter shows as numbered paragraphs;
 * selecting a passage offers Ask; the margin streams the answer, its [¶n] taking the reader to the paragraph;
 * the foot says what is left today. A paid book, or one without text, gets neither Text nor Ask.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { invoke, readerBook, askBook } = vi.hoisted(() => ({ invoke: vi.fn(), readerBook: vi.fn(), askBook: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, user: null }) }));
vi.mock('@/components/books/reader/PdfReader', () => ({
  default: ({ onPage }: { onPage?: (p: number) => void }) => (
    <button type="button" data-testid="pdf" onClick={() => onPage?.(2)}>
      pdf
    </button>
  ),
}));
const PARAS = Array.from({ length: 14 }, (_, i) => ({ chapter: 1, para: i + 2, page: i < 12 ? 1 : 2, text: `Text of paragraph ${i + 2}.` }));
vi.mock('@/hooks/queries/useBookText', () => ({
  useReaderBook: () => ({ data: readerBook() }),
  useChapterRange: (id: string | undefined) => ({ data: id ? { first: 1, last: 3 } : undefined }),
  useChapterAtPage: (id: string | undefined, page: number | null) => ({ data: id && page !== null ? 1 : undefined, isLoading: false }),
  useChapter: (id: string | undefined, chapter: number | null) => ({ data: id && chapter === 1 ? PARAS : [], isLoading: false }),
}));
vi.mock('@/lib/bookAsk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/bookAsk')>()),
  askBook,
  askQuota: async () => 5,
}));

import BookReader from '@/pages/BookReader';

const SIGNED = { ok: true, url: 'https://r2.example/x.pdf', contentType: 'application/pdf', filename: 'Ledgers.pdf' };

function renderReader() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/books-academia/ledgers/read']}>
        <Routes>
          <Route path="/books-academia/:slug/read" element={<BookReader />} />
          <Route path="/books-academia/:slug" element={<p>cover</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Selects the whole text of one paragraph, as a reader's drag would. */
function select(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

describe('margin questions', () => {
  beforeEach(() => {
    invoke.mockReset().mockResolvedValue({ data: SIGNED, error: null });
    askBook.mockReset();
    readerBook.mockReturnValue({ id: 'book-1', access: 'free', ai_ready: true });
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('asks about a selected passage, streams the answer, and [¶12] takes the reader to paragraph 12', async () => {
    askBook.mockImplementation(async (_input, h) => {
      h.onMeta({ remaining: 3, context: [2, 15] });
      h.onDelta('A trial balance must agree [¶12]');
      h.onDelta(', unlike [¶99].');
      h.onDone({ cited: [12], outside: [99], remaining: 3 });
    });
    renderReader();
    await screen.findByTestId('pdf');
    await userEvent.click(screen.getByTestId('pdf'));
    await userEvent.click(screen.getByRole('button', { name: 'Text' }));
    const p5 = document.getElementById('para-5')!;
    expect(p5).toHaveTextContent('Text of paragraph 5.');
    expect(within(p5).getByText('¶5')).toHaveAttribute('aria-hidden', 'true');

    act(() => select(p5));
    act(() => {
      p5.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Ask' }));

    const margin = screen.getByRole('complementary', { name: 'Question in the margin' });
    expect(within(margin).getByRole('heading')).toHaveTextContent('Ask about ¶5');
    expect(p5).toHaveAttribute('data-quoted', 'true');
    await waitFor(() => expect(within(margin).getByText('5 of 5 questions left today')).toBeInTheDocument());
    expect(within(margin).getByText('Answers are generated; check the cited paragraphs.')).toBeInTheDocument();

    await userEvent.type(within(margin).getByLabelText('Your question about the passage'), 'Why must it agree?');
    await userEvent.click(within(margin).getByRole('button', { name: 'Ask' }));
    expect(askBook).toHaveBeenCalledWith(
      { bookId: 'book-1', chapter: 1, selection: { para_from: 5, para_to: 5, text: 'Text of paragraph 5.' }, question: 'Why must it agree?' },
      expect.any(Object),
      expect.any(AbortSignal),
    );
    const answer = margin.querySelector('[data-answer]')!;
    expect(answer).toHaveTextContent('A trial balance must agree [¶12], unlike [¶99].');
    // Only the paragraph in the context is a link.
    expect(within(answer as HTMLElement).getAllByRole('button')).toHaveLength(1);
    expect(within(margin).getByText('3 of 5 questions left today')).toBeInTheDocument();

    await userEvent.click(within(answer as HTMLElement).getByRole('button', { name: 'Paragraph 12: go to it' }));
    const p12 = document.getElementById('para-12')!;
    await waitFor(() => expect(p12).toHaveAttribute('data-marked', 'true'));
    expect(p12.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });

    // Esc closes the margin first, not the reader.
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Question in the margin' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Pages' })).toBeInTheDocument();
  });

  it('offers no text view and no Ask on a paid book or one without extracted text', async () => {
    for (const book of [{ id: 'b', access: 'paid', ai_ready: false }, { id: 'b', access: 'free', ai_ready: false }, null]) {
      readerBook.mockReturnValue(book);
      const view = renderReader();
      await screen.findByTestId('pdf');
      expect(screen.queryByRole('button', { name: 'Text' })).toBeNull();
      view.unmount();
    }
  });
});
