/**
 * Renders a Finance in Action preview page with the providers App gives it.
 *
 * The preview pages are reached through App only when __FIA_PREVIEW__ is true
 * at build time, and tests build with it false (vitest.config.ts), so the
 * suites render the page components directly, inside the same providers.
 * Callers mock '@/integrations/supabase/client' themselves.
 */
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';

export function renderFiaPage(page: ReactElement, { path, url }: { path: string; url: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[url]}>
              <Routes>
                <Route path={path} element={page} />
                <Route path="*" element={<p>elsewhere</p>} />
              </Routes>
            </MemoryRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}
