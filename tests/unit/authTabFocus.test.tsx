/**
 * Regression: switching browser tabs wiped the Writer Studio.
 *
 * supabase auth-js emits SIGNED_IN (or TOKEN_REFRESHED) on every
 * hidden -> visible transition (GoTrueClient._onVisibilityChanged ->
 * _recoverAndRefresh). AuthProvider used to flip isLoading to true on EVERY
 * auth event, so RequireAdmin swapped its children for a spinner, the editor
 * unmounted, and every unsaved keystroke in React state was gone.
 *
 * A same-user event must leave admin pages mounted. A sign-out must not.
 */
import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

type AuthCallback = (event: string, session: unknown) => void;
const listeners: AuthCallback[] = [];
const session = { user: { id: 'admin-user' }, access_token: 't', expires_at: 9_999_999_999 };

vi.mock('@/integrations/supabase/client', () => {
  const roleQuery = {
    select: () => roleQuery,
    eq: () => roleQuery,
    // A real network round-trip: long enough for React to commit whatever
    // AuthProvider renders while the role check is in flight.
    maybeSingle: () => new Promise(resolve =>
      setTimeout(() => resolve({ data: { role: 'admin' }, error: null }), 30)),
  };
  return {
    supabase: {
      from: () => roleQuery,
      auth: {
        onAuthStateChange: (cb: AuthCallback) => {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getSession: async () => ({ data: { session } }),
        signOut: async () => ({ error: null }),
      },
    },
  };
});

import { AuthProvider } from '@/contexts/AuthContext';
import { RequireAdmin } from '@/components/auth/RequireAdmin';

let mounts = 0;
function Editor() {
  useEffect(() => {
    mounts += 1;
  }, []);
  return <div>editor</div>;
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/admin/writer/finance/x']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/writer/:section/:slug" element={<RequireAdmin><Editor /></RequireAdmin>} />
          <Route path="/auth" element={<div>login</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const emit = (event: string, s: unknown) => act(async () => {
  listeners.forEach(cb => cb(event, s));
  await Promise.resolve();
});

describe('auth events on tab focus', () => {
  beforeEach(() => {
    listeners.length = 0;
    mounts = 0;
  });

  it('keeps the editor mounted through SIGNED_IN / TOKEN_REFRESHED for the same user', async () => {
    renderApp();
    await emit('INITIAL_SESSION', session);
    await screen.findByText('editor');
    expect(mounts).toBe(1);

    // What auth-js fires when the tab becomes visible again.
    await emit('SIGNED_IN', session);
    await emit('TOKEN_REFRESHED', { ...session, access_token: 't2' });

    await waitFor(() => expect(screen.getByText('editor')).toBeInTheDocument());
    expect(mounts).toBe(1);
  });

  it('still leaves the admin page on sign-out', async () => {
    renderApp();
    await emit('INITIAL_SESSION', session);
    await screen.findByText('editor');

    await emit('SIGNED_OUT', null);
    await screen.findByText('login');
  });
});
