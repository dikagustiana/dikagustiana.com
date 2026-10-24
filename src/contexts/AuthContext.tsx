import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // The user id whose admin role has already been resolved. `undefined` means
  // nothing resolved yet; `null` means resolved as signed-out.
  const resolvedUserId = useRef<string | null | undefined>(undefined);

  // Returns false when the check itself failed (network, RLS), as opposed to
  // answering "not an admin", so the caller can let the next event retry.
  const checkAdminRole = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!error && !!data);
      return !error;
    } catch {
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const resolveSession = async (activeSession: Session | null) => {
      if (!mounted) return;

      setSession(activeSession);
      setUser(activeSession?.user ?? null);

      // auth-js fires SIGNED_IN (or TOKEN_REFRESHED) every time the tab
      // becomes visible again. Same user means same role: keep the app
      // mounted. Flipping isLoading here made RequireAdmin swap the page for a
      // spinner, which unmounted the Writer Studio and threw away every
      // unsaved keystroke on each tab switch.
      const nextUserId = activeSession?.user?.id ?? null;
      if (resolvedUserId.current === nextUserId) return;
      resolvedUserId.current = nextUserId;

      setIsLoading(true);

      if (activeSession?.user) {
        const checked = await checkAdminRole(activeSession.user.id);
        // A failed check is not an answer: forget it, so the next auth event
        // (e.g. the next tab focus) tries again instead of caching "not admin".
        if (!checked) resolvedUserId.current = undefined;
      } else {
        setIsAdmin(false);
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void resolveSession(nextSession);
      }
    );

    void supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      void resolveSession(existingSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/** The auth state, or undefined outside an AuthProvider: for a block that only adds something for an admin and is otherwise nothing. */
export function useOptionalAuth() {
  return useContext(AuthContext);
}
