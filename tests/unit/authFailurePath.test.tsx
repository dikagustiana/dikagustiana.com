/**
 * A transient failure during the very first admin check must not look like a
 * permanent answer. AuthContext deliberately forgets a failed check so the
 * next auth event retries — but RequireAdmin still sees isAdmin=false once
 * isLoading drops, and bounces the signed-in admin to /auth until that retry
 * happens. This pins both halves: the bounce (the documented sharp edge),
 * and the recovery on the next auth event instead of a cached "not admin".
 *
 * WO-13, docs/review/09-plan.md (R17).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';

type AuthCallback = (event: string, session: unknown) => void;
const listeners: AuthCallback[] = [];
const session = { user: { id: 'admin-user' }, access_token: 't', expires_at: 9_999_999_999 };

// The role query's result is controllable per test: first the network fails,
// then it recovers.
let roleResult: { data: unknown; error: unknown };
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => roleResult,
          }),
        }),
      }),
    }),
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: async () => ({ data: { session } }),
      signOut: async () => ({ error: null }),
    },
  },
}));

import { AuthProvider } from '@/contexts/AuthContext';
import { RequireAdmin } from '@/components/auth/RequireAdmin';

function Editor() {
  return <div>editor mounted</div>;
}

// The bounced admin retypes the admin URL after the role check has quietly
// succeeded again — the real-world recovery path.
function AuthPage() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate('/admin/writer/finance/my-essay')}>
      retry admin
    </button>
  );
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/admin/writer/finance/my-essay']}>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/admin/writer/:section/:slug"
            element={
              <RequireAdmin>
                <Editor />
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listeners.length = 0;
  roleResult = { data: null, error: { message: 'network down' } };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthContext transient admin-check failure', () => {
  it('bounces the signed-in admin to /auth when the first check fails', async () => {
    renderApp();
    // isLoading drops with the check failed → RequireAdmin redirects.
    await waitFor(() => expect(screen.getByRole('button', { name: 'retry admin' })).toBeInTheDocument());
    expect(screen.queryByText('editor mounted')).not.toBeInTheDocument();
  });

  it('recovers on the next auth event instead of caching "not admin"', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByRole('button', { name: 'retry admin' })).toBeInTheDocument());

    // The network heals; a same-user auth event (tab focus re-fires
    // SIGNED_IN) retries the check rather than reusing the failed answer.
    roleResult = { data: { role: 'admin' }, error: null };
    await act(async () => {
      for (const cb of listeners) cb('SIGNED_IN', session);
    });

    // The failed answer was not cached: navigating back as the same user
    // mounts the editor on the first try.
    await act(async () => {
      screen.getByRole('button', { name: 'retry admin' }).click();
    });
    await waitFor(() => expect(screen.getByText('editor mounted')).toBeInTheDocument());
  });
});
