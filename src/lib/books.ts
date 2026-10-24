/**
 * Small pieces of the Books page shared by its components (site cleanup 2026-10, PRD §D).
 */
import type { Book } from '@/hooks/queries/useBooks';

export const accessLabel = (access: Book['access']) => (access === 'free' ? 'Free' : 'Buy');
