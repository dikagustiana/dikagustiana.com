import type { EssayPresentation } from '@/lib/presentation';
/**
 * Canonical types for the writing domain.
 *
 * Section → Category → Essay (strict 3-level hierarchy)
 * Category determines section through FK.
 * Section is never stored directly on essays.
 */

export interface WritingSection {
  id: string;
  slug: string;
  name: string;
  voice_role: string;
  manifesto: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WritingCategory {
  id: string;
  section_id: string;
  slug: string;
  name: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  section?: WritingSection;
}

export interface WritingEssay {
  id: string;
  title: string;
  slug: string;
  deck: string | null;
  body: string | null;
  // DB field aliases (kept for backward compat with raw DB queries)
  snippet?: string | null;
  content?: string | null;
  category_id: string;
  module_id: string | null;
  tags: string[];
  status: EssayStatus;
  meta_description: string | null;
  author: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  // Legacy fields kept for backward compat during transition
  section: string;
  phase: string | null;
  voice_role: string | null;
  presentation: EssayPresentation | null;
  /** @deprecated legacy column, dropped by the staged _pending migration */
  economist_fields?: EssayPresentation | null;
  // Joined
  category?: WritingCategory;
}

export type EssayStatus = 'draft' | 'published';

export interface EssayFormState {
  title: string;
  deck: string;
  slug: string;
  body: string | null;
  category_id: string;
  section_id: string;
  tags: string[];
  status: EssayStatus;
  meta_description: string;
  author: string;
}

export interface PublishValidationError {
  field: string;
  message: string;
}

export function validateForPublish(state: EssayFormState): PublishValidationError[] {
  const errors: PublishValidationError[] = [];

  if (!state.title.trim()) {
    errors.push({ field: 'title', message: 'Title is required.' });
  }
  if (!state.section_id) {
    errors.push({ field: 'section_id', message: 'Section is required.' });
  }
  if (!state.category_id) {
    errors.push({ field: 'category_id', message: 'Category is required.' });
  }
  if (!state.body || state.body === '{"type":"doc","content":[{"type":"paragraph"}]}') {
    errors.push({ field: 'body', message: 'Body content is required.' });
  }
  if (!state.slug.trim()) {
    errors.push({ field: 'slug', message: 'Slug is required.' });
  }

  return errors;
}

/** Autosave status surfaced in the editor top bar. */
export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

/**
 * Re-exported so both editor stacks share ONE definition of when silent
 * autosave is safe. The implementation lives in `@/lib/revisions` alongside
 * the rest of the autosave decision logic.
 */
export { canAutosave } from '@/lib/revisions';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
