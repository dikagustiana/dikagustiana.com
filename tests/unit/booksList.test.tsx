import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock the data hook so we test BooksList's wiring + states without a backend.
const { useBooksMock } = vi.hoisted(() => ({ useBooksMock: vi.fn() }));
vi.mock('@/hooks/queries/useBooks', () => ({ useBooks: useBooksMock }));

// PageLayout pulls in Header/Footer/auth; stub it to a passthrough, and SEO to null.
vi.mock('@/components/layouts/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));

import BooksList from '@/pages/BooksList';

function renderAt(category = 'finance-accounting') {
  return render(
    <MemoryRouter initialEntries={[`/books/${category}`]}>
      <Routes>
        <Route path="/books/:category" element={<BooksList />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => useBooksMock.mockReset());

describe('BooksList', () => {
  it('queries useBooks scoped to the URL category', () => {
    useBooksMock.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    renderAt('finance-accounting');
    expect(useBooksMock).toHaveBeenCalledWith({ category: 'finance-accounting' });
  });

  it('shows the loading state', () => {
    useBooksMock.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() });
    const { container } = renderAt();
    // LoadingState renders skeletons; assert neither empty nor error copy is shown.
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
    expect(screen.queryByText('No books yet')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no books', () => {
    useBooksMock.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    renderAt();
    expect(screen.getByText('No books yet')).toBeInTheDocument();
  });

  it('renders real book rows from the DB (not hardcoded samples)', () => {
    useBooksMock.mockReturnValue({
      data: [
        { id: 'b1', title: 'Real DB Book', author: 'A. Author', year: 2025, filename: 'x.pdf', category: 'finance-accounting' },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderAt();
    expect(screen.getByText('Real DB Book')).toBeInTheDocument();
    expect(screen.getByText(/A\. Author/)).toBeInTheDocument();
    // The old hardcoded sample titles must be gone.
    expect(screen.queryByText('Financial Statement Analysis')).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Real DB Book/ });
    expect(link).toHaveAttribute('href', '/books/finance-accounting/b1/read');
  });

  it('shows an error state with retry', () => {
    const refetch = vi.fn();
    useBooksMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom'), refetch });
    renderAt();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
