/**
 * A free book's extracted text, for the reader's text view and its margin questions
 * (docs/prd/library-phase-2 §3 Margin questions). The text lives in the private R2 bucket beside the book's
 * file (text/<book id>/index.json and ch-<n>.json; supabase/functions/_shared/bookText.ts, written by
 * scripts/books/extract-paragraphs.ts), reached through URLs the book-ask function signs for a published,
 * free, ai_ready book (src/lib/bookAsk.ts, fetchBookText).
 *
 * A failed read is "no text": the reader then shows no text view and no Ask, which is also what a paid book or
 * one not yet extracted gets.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchBookText } from '@/lib/bookAsk';
import { chapterAtPage, readChapter, readIndex, type TextIndex } from '../../../supabase/functions/_shared/bookText';

export interface ReaderBook {
  id: string;
  access: 'free' | 'paid';
  ai_ready: boolean;
}

export interface BookPara {
  chapter: number;
  para: number;
  page: number;
  text: string;
}

/** The reader's book row: whether it may take questions. Null when hidden, missing, or the read fails. */
export const useReaderBook = (slug: string) =>
  useQuery({
    queryKey: ['books', 'reader-book', slug],
    queryFn: async (): Promise<ReaderBook | null> => {
      const { data, error } = await supabase.from('books_uploads').select('id, slug, access, ai_ready').eq('slug', slug).is('deleted_at', null).limit(1);
      if (error) return null;
      const row = ((data ?? []) as (ReaderBook & { slug: string })[]).find((b) => b.slug === slug);
      return row ? { id: row.id, access: row.access, ai_ready: !!row.ai_ready } : null;
    },
    enabled: !!slug,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

const indexQuery = (bookId: string | undefined) => ({
  queryKey: ['books', 'text-index', bookId],
  queryFn: async (): Promise<TextIndex | null> => readIndex(await fetchBookText(bookId!, 'index').catch(() => null), bookId!),
  enabled: !!bookId,
  retry: false,
  staleTime: 30 * 60 * 1000,
});

/** The first and last chapter that hold text; null when the book has none to show. */
export const useChapterRange = (bookId: string | undefined) =>
  useQuery({
    ...indexQuery(bookId),
    select: (index: TextIndex | null) => {
      const chapters = index?.chapters.map((c) => c.chapter) ?? [];
      return chapters.length ? { first: Math.min(...chapters), last: Math.max(...chapters) } : null;
    },
  });

/** The chapter a page is in, from the index. */
export const useChapterAtPage = (bookId: string | undefined, page: number | null) =>
  useQuery({
    ...indexQuery(bookId),
    enabled: !!bookId && page !== null,
    select: (index: TextIndex | null) => (index ? chapterAtPage(index, page ?? 1) : null),
  });

/** One chapter's paragraphs, in order. */
export const useChapter = (bookId: string | undefined, chapter: number | null) =>
  useQuery({
    queryKey: ['books', 'text-chapter', bookId, chapter],
    queryFn: async (): Promise<BookPara[]> => {
      const paras = readChapter(await fetchBookText(bookId!, chapter!), bookId!, chapter!);
      if (!paras) throw new Error('The chapter could not be read.');
      return paras.map((p) => ({ chapter: chapter!, ...p })).sort((a, b) => a.para - b.para);
    },
    enabled: !!bookId && chapter !== null,
    retry: false,
    staleTime: 30 * 60 * 1000,
  });
