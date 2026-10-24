/** docs/prd/2026-10-fia-fixes item 13: ?theme= naming a theme the site no longer lists falls back to every essay. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { makeQueryResult } from './helpers/renderWithProviders';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => makeQueryResult([]) } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }), useOptionalAuth: () => ({ isAdmin: false, isLoading: false }) }));

import TheNextBigThing from '@/pages/TheNextBigThing';

function Where() {
  const { search } = useLocation();
  return <p data-testid="search">{search}</p>;
}

const at = (url: string) =>
  render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/the-next-big-thing" element={<><TheNextBigThing /><Where /></>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );

describe('?theme= on The Next Big Thing', () => {
  it.each(['society', 'governance', 'nonsense'])('drops ?theme=%s and shows every essay', async (theme) => {
    at(`/the-next-big-thing?theme=${theme}`);
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
  });

  it('keeps a theme the site lists', async () => {
    at('/the-next-big-thing?theme=growth');
    await screen.findByRole('heading', { level: 1, name: 'The Next Big Thing' });
    expect(screen.getByTestId('search')).toHaveTextContent('?theme=growth');
  });
});
