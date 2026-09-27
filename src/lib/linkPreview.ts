/**
 * The editor's side of link previews: ask the `link-preview` edge function for
 * a URL's metadata (supabase/functions/link-preview). Authoring time only.
 * Nothing on a published page calls this, because the card renders its stored
 * snapshot (docs/DECISIONS.md, "Link previews: server-resolved, metadata only").
 *
 * Every failure comes back as `{ ok: false, message }` with a plain sentence
 * for the author, never as a throw. A failed fetch must leave the dialog
 * exactly as usable as manual entry always was.
 */

import { supabase } from '@/integrations/supabase/client';

export interface LinkPreviewFields {
  title: string;
  description: string;
  author: string;
  authorUrl: string;
  siteName: string;
  /** YYYY-MM-DD, or ''. */
  publishedAt: string;
  /** ISO timestamp of the fetch. */
  resolvedAt: string;
}

export type LinkPreviewResponse = { ok: true; data: LinkPreviewFields } | { ok: false; message: string };

const FIELDS: (keyof LinkPreviewFields)[] = [
  'title',
  'description',
  'author',
  'authorUrl',
  'siteName',
  'publishedAt',
  'resolvedAt',
];

export const LINK_PREVIEW_FALLBACK_MESSAGE =
  'Could not fetch details for this link. You can fill the fields in yourself.';

function pick(raw: Record<string, unknown>): LinkPreviewFields {
  const out = {} as LinkPreviewFields;
  for (const field of FIELDS) out[field] = typeof raw[field] === 'string' ? (raw[field] as string) : '';
  return out;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('link-preview', { body: { url } });
    if (error) {
      // A non-2xx answer (401/403 from the function's own auth check) still
      // carries its sentence. Show that rather than a generic one.
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        const body = await context.clone().json().catch(() => null);
        if (body && typeof body.message === 'string') return { ok: false, message: body.message };
      }
      return { ok: false, message: LINK_PREVIEW_FALLBACK_MESSAGE };
    }
    if (data?.ok === true && data.data && typeof data.data === 'object') {
      return { ok: true, data: pick(data.data as Record<string, unknown>) };
    }
    if (data?.ok === false && typeof data.message === 'string') return { ok: false, message: data.message };
    return { ok: false, message: LINK_PREVIEW_FALLBACK_MESSAGE };
  } catch {
    return { ok: false, message: LINK_PREVIEW_FALLBACK_MESSAGE };
  }
}
