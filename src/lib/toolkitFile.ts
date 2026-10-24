/**
 * The site's side of the `toolkit-file` edge function (supabase/functions/toolkit-file): a toolkit's file
 * is in the private R2 bucket, under toolkits/<slug>/<version>/, reached only through a URL the function
 * signs. Readers ask for a download URL for one version (or the latest); the admin's form asks for an
 * upload URL and PUTs the file straight to R2.
 *
 * Reads never throw: they come back as `{ ok: false, message }` with a sentence for the reader. The upload
 * throws, so the form shows the error.
 */
import { supabase } from '@/integrations/supabase/client';

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type DownloadResult = { ok: true; url: string; filename: string } | { ok: false; message: string };

export const DOWNLOAD_FALLBACK_MESSAGE = 'The file could not be downloaded just now. Try again in a moment.';

async function errorBody(error: unknown): Promise<{ reason?: string; message?: string } | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) return context.clone().json().catch(() => null);
  return null;
}

/** A signed attachment URL for one version of a published toolkit (the latest when none is named). */
export async function signedToolkitUrl(slug: string, version?: string): Promise<DownloadResult> {
  try {
    const { data, error } = await supabase.functions.invoke('toolkit-file', { body: { action: 'read', slug, version } });
    if (error) {
      const body = await errorBody(error);
      return { ok: false, message: body?.reason === 'not_found' ? 'This version is not available.' : DOWNLOAD_FALLBACK_MESSAGE };
    }
    if (data?.ok === true && typeof data.url === 'string') return { ok: true, url: data.url, filename: String(data.filename ?? '') };
    return { ok: false, message: DOWNLOAD_FALLBACK_MESSAGE };
  } catch {
    return { ok: false, message: DOWNLOAD_FALLBACK_MESSAGE };
  }
}

/** Uploads one version's .xlsx to R2 (admin) and returns its key, the version row's file_key. */
export async function uploadToolkitFile(slug: string, version: string, file: File): Promise<string> {
  const { data, error } = await supabase.functions.invoke('toolkit-file', {
    body: { action: 'upload', slug, version, filename: file.name, contentType: XLSX_TYPE, size: file.size },
  });
  if (error) {
    const b = await errorBody(error);
    throw new Error(typeof b?.message === 'string' ? b.message : 'The toolkit file service did not answer.');
  }
  if (data?.ok !== true || typeof data.url !== 'string') {
    throw new Error(typeof data?.message === 'string' ? data.message : 'The toolkit file service refused.');
  }
  const res = await fetch(data.url, { method: 'PUT', body: file, headers: { 'Content-Type': XLSX_TYPE } });
  if (!res.ok) throw new Error(`The file did not upload (storage answered ${res.status}).`);
  return String(data.key);
}
