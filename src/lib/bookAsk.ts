/**
 * The site's side of the `book-ask` edge function (supabase/functions/book-ask; docs/prd/library-phase-2 §3
 * Margin questions): ask a question about a selected passage and read the answer as it streams, ask how
 * many questions are left today, and read the book's extracted text from R2. tests/unit/bookAsk.test.ts.
 *
 * The answer is a stream of server-sent events, so it is fetched directly (supabase.functions.invoke reads a
 * body whole), with the same headers the client would send: the project's public key, and the reader's own
 * token when signed in (the owner's questions are uncapped).
 */
import { supabase } from '@/integrations/supabase/client';

export interface AskSelection {
  para_from: number;
  para_to: number;
  text: string;
}

export interface AskInput {
  bookId: string;
  chapter: number;
  selection: AskSelection;
  question: string;
}

export interface AskHandlers {
  onMeta?: (m: { remaining: number | null; context: [number, number] }) => void;
  onDelta: (text: string) => void;
  onDone: (d: { cited: number[]; outside: number[]; remaining: number | null }) => void;
  onError: (e: { reason: string; message: string }) => void;
}

export const ASK_FALLBACK_MESSAGE = 'The answer could not be fetched just now. Try again in a moment.';

const functionsUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-ask`;

async function headers(): Promise<Record<string, string>> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const { data } = await supabase.auth.getSession();
  return { apikey: key, Authorization: `Bearer ${data.session?.access_token ?? key}`, 'Content-Type': 'application/json' };
}

/** Complete events in an SSE buffer, as [event, data], and the unfinished tail. */
export function parseSse(buffer: string): { events: [string, string][]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? '';
  const events: [string, string][] = [];
  for (const chunk of parts) {
    let event = 'message';
    const data: string[] = [];
    for (const line of chunk.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (data.length) events.push([event, data.join('\n')]);
  }
  return { events, rest };
}

/** Asks; the handlers hear the answer as it comes. Never throws: a failure arrives as onError. */
export async function askBook(input: AskInput, h: AskHandlers, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(functionsUrl(), {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({ action: 'ask', book_id: input.bookId, chapter: input.chapter, selection: input.selection, question: input.question }),
      signal,
    });
  } catch {
    if (!signal?.aborted) h.onError({ reason: 'network', message: ASK_FALLBACK_MESSAGE });
    return;
  }
  if (!res.ok || !res.body || !(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    const body = (await res.json().catch(() => null)) as { reason?: string; message?: string } | null;
    h.onError({ reason: body?.reason ?? 'unavailable', message: body?.message ?? ASK_FALLBACK_MESSAGE });
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = '';
  let finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const parsed = parseSse(buffer + dec.decode(value, { stream: true }));
      buffer = parsed.rest;
      for (const [event, data] of parsed.events) {
        let d: Record<string, unknown>;
        try {
          d = JSON.parse(data);
        } catch {
          continue;
        }
        if (event === 'meta') h.onMeta?.(d as Parameters<NonNullable<AskHandlers['onMeta']>>[0]);
        else if (event === 'delta' && typeof d.text === 'string') h.onDelta(d.text);
        else if (event === 'done') {
          finished = true;
          h.onDone(d as Parameters<AskHandlers['onDone']>[0]);
        } else if (event === 'error') {
          finished = true;
          h.onError({ reason: String(d.reason ?? 'model_failed'), message: String(d.message ?? ASK_FALLBACK_MESSAGE) });
        }
      }
    }
  } catch {
    // The stream broke off; said below.
  }
  if (!finished && !signal?.aborted) h.onError({ reason: 'stream_failed', message: 'The answer stopped partway. Try again.' });
}

/**
 * A part of a free book's extracted text, which lives in the private R2 bucket beside the book's file: the
 * function signs a URL for it (after the same checks as a question: published, free, ai_ready), and the JSON is
 * read straight from R2. Throws when there is none to read, so a query shows no text view.
 */
export async function fetchBookText(bookId: string, part: 'index' | number): Promise<unknown> {
  const res = await fetch(functionsUrl(), { method: 'POST', headers: await headers(), body: JSON.stringify({ action: 'text', book_id: bookId, part }) });
  const signed = (await res.json().catch(() => null)) as { ok?: boolean; url?: unknown } | null;
  if (!res.ok || signed?.ok !== true || typeof signed.url !== 'string') throw new Error('The book has no text to read here.');
  const file = await fetch(signed.url);
  if (!file.ok) throw new Error(`The book's text could not be read (${file.status}).`);
  return file.json();
}

/** Questions left today for this visitor; null when uncapped (the owner) or unknown. */
export async function askQuota(bookId: string): Promise<number | null> {
  try {
    const res = await fetch(functionsUrl(), { method: 'POST', headers: await headers(), body: JSON.stringify({ action: 'quota', book_id: bookId }) });
    if (!res.ok) return null;
    const d = (await res.json()) as { remaining?: unknown };
    return typeof d.remaining === 'number' ? d.remaining : null;
  } catch {
    return null;
  }
}

export type AnswerPart = { kind: 'text'; text: string } | { kind: 'cite'; para: number; checkable: boolean };

/**
 * An answer split into text and [¶n] citations. A citation is checkable when its paragraph was in the context
 * (`known`); one that was not is shown as plain text, never as a link to nowhere.
 */
export function answerParts(text: string, known: (n: number) => boolean): AnswerPart[] {
  const out: AnswerPart[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[¶\s*(\d+)\]/g)) {
    if (m.index! > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
    const n = Number(m[1]);
    out.push(known(n) ? { kind: 'cite', para: n, checkable: true } : { kind: 'text', text: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** "3 of 5 questions left today", or the owner's line. */
export const quotaLine = (remaining: number | null, owner: boolean, of = 5) =>
  owner ? 'No daily limit (owner).' : remaining === null ? `Up to ${of} questions a day.` : `${remaining} of ${of} questions left today`;
