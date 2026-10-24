/**
 * Renders its children for an admin and nothing at all for anyone else: no
 * placeholder, no "hidden" note (docs/prd/2026-10-fia-fixes items 8 and 10).
 * The same check as RequireAdmin, without its redirect: a block for the
 * builder inside a page every reader sees. While the session is still being
 * read, nothing is rendered either.
 */
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading || !isAdmin) return null;
  return <>{children}</>;
}
