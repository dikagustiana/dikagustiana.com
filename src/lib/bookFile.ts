/**
 * The site's side of the `book-file` edge function (supabase/functions/book-file): a book's file is in a
 * private R2 bucket, reached only through a URL the function signs for the caller. Readers ask for a read
 * URL (inline for the reader, attachment for Download); the admin's form asks for an upload URL, PUTs the
 * file straight to R2, and asks the function to remove a file a save no longer points at.
 *
 * Reads never throw: they come back as `{ ok: false, reason, message }` with a sentence for the reader.
 * Admin writes throw, as the rest of useSaveBook does, so the form shows the error.
 */
import { supabase } from '@/integrations/supabase/client';

export type FileAs = 'inline' | 'download';

export interface SignedRead {
  ok: true;
  url: string;
  contentType: string;
  filename: string;
}
export type ReadResult = SignedRead | { ok: false; reason: string; message: string };

export const READ_FALLBACK_MESSAGE = 'The book could not be opened just now. Try again in a moment.';
const NOT_FOUND_MESSAGE = 'This book is not available.';

async function errorBody(error: unknown): Promise<{ reason?: string; message?: string } | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) return context.clone().json().catch(() => null);
  return null;
}

/** A signed URL for a free book's file, or why there is none. */
export async function signedBookUrl(slug: string, as: FileAs): Promise<ReadResult> {
  try {
    const { data, error } = await supabase.functions.invoke('book-file', { body: { action: 'read', slug, as } });
    if (error) {
      const body = await errorBody(error);
      const reason = typeof body?.reason === 'string' ? body.reason : 'unavailable';
      return { ok: false, reason, message: reason === 'not_found' ? NOT_FOUND_MESSAGE : READ_FALLBACK_MESSAGE };
    }
    if (data?.ok === true && typeof data.url === 'string') {
      return { ok: true, url: data.url, contentType: String(data.contentType ?? ''), filename: String(data.filename ?? '') };
    }
    return { ok: false, reason: 'unavailable', message: READ_FALLBACK_MESSAGE };
  } catch {
    return { ok: false, reason: 'unavailable', message: READ_FALLBACK_MESSAGE };
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('book-file', { body });
  if (error) {
    const b = await errorBody(error);
    throw new Error(typeof b?.message === 'string' ? b.message : 'The book file service did not answer.');
  }
  if (data?.ok !== true) throw new Error(typeof data?.message === 'string' ? data.message : 'The book file service refused.');
  return data as T;
}

/** Uploads a free book's file to R2 (admin) and returns its key, the row's filepath. */
export async function uploadBookFile(slug: string, file: File): Promise<string> {
  const contentType = /\.epub$/i.test(file.name) ? 'application/epub+zip' : 'application/pdf';
  const signed = await call<{ key: string; url: string }>({ action: 'upload', slug, filename: file.name, contentType, size: file.size });
  const res = await fetch(signed.url, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
  if (!res.ok) throw new Error(`The file did not upload (storage answered ${res.status}).`);
  return signed.key;
}

/** Removes a file from R2 (admin). */
export async function removeBookFile(key: string): Promise<void> {
  await call({ action: 'remove', key });
}
