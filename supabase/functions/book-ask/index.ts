/**
 * book-ask — a margin question on a free book, answered from the chapter with [¶n] citations
 * (docs/prd/library-phase-2 §3 Margin questions, §4 Ask function).
 *
 *   ask   { book_id, chapter, selection: { para_from, para_to, text }, question }
 *         → text/event-stream: `meta` (questions left), `delta` (answer text), then `done` (the [¶n] it cites
 *         that are in the context, any it cites that are not, questions left) or `error`.
 *         A refusal before the answer is JSON with a status: 400 bad request, 403 not a free book, 404 not
 *         on the shelves, 409 no extracted text, 429 the visitor's or the site's cap for the day, 503 not set up.
 *   quota { book_id } → { remaining } for this visitor today, counting nothing.
 *   text  { book_id, part: 'index' | <chapter> } → { url } signed for an hour, to the book's text in R2
 *         (text/<book id>/index.json or ch-<n>.json; supabase/functions/_shared/bookText.ts), for the reader's
 *         text view; the same first two guards, counting nothing.
 *
 * Guards, in this order (rules.ts, admit): the book published and free → ai_ready → the visitor's 5 questions
 * a day (a hash of address and browser, salted; the signed-in owner is uncapped) → the site's spend a day,
 * BOOK_ASK_DAILY_USD. The context is the selection's chapter only, read from R2 (the text lives beside the
 * book's file in Cloudflare, never in the database), never the whole book.
 *
 * Authorisation, as book-file and link-preview (config.toml): verify_jwt = true, and the book's row is read
 * through PostgREST WITH THE CALLER'S TOKEN, so RLS decides what a visitor may ask about or read; only then
 * is a URL into R2 signed (_shared/r2.ts, the signer book-file uses).
 * One privileged client exists, for one table: book_ask_usage, which visitors may not read or write, is
 * written only through the book_ask_* functions (supabase/migrations/20261025130000_library_book_ask.sql),
 * executable by the service role alone.
 *
 * Secrets (Edge Function secrets, never logged): ANTHROPIC_API_KEY, BOOK_ASK_DAILY_USD (dollars a day, the
 * site's cap), and the four R2_* that book-file already has; optional BOOK_ASK_SALT (else the service key salts
 * the visitor hash), BOOK_ASK_MODEL (default claude-opus-5-5), ANTHROPIC_BASE_URL (default the Claude API).
 * Without them every request answers 503 not_configured.
 */

import { r2Configured, r2FromEnv, signR2 } from '../_shared/r2.ts';
import { readChapter, textChapterKey, textIndexKey } from '../_shared/bookText.ts';
import {
  ANTHROPIC_VERSION,
  DEFAULT_MODEL,
  FALLBACK_BETA,
  admit,
  buildPrompt,
  citedParas,
  clientIp,
  contextWindow,
  costCents,
  foldEvent,
  jakartaDay,
  messagesBody,
  newStreamState,
  parseRequest,
  sse,
  sseData,
  TEXT_URL_SECONDS,
  textRefusal,
  visitorHash,
  VISITOR_DAILY_QUESTIONS,
  type BookRow,
  type Para,
} from './rules.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const ANTHROPIC_BASE = (Deno.env.get('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com').replace(/\/+$/, '');
const MODEL = Deno.env.get('BOOK_ASK_MODEL') || DEFAULT_MODEL;
const CAP_USD = Number(Deno.env.get('BOOK_ASK_DAILY_USD') ?? '');
const SALT = Deno.env.get('BOOK_ASK_SALT') || SERVICE_KEY;

/** The project's public key, on `apikey` only; see link-preview/index.ts. */
function publicApiKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    if (typeof keys?.default === 'string' && keys.default) return keys.default;
  } catch {
    // fall through to the legacy key
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}
const API_KEY = publicApiKey();

const R2 = r2FromEnv((name) => Deno.env.get(name));

const configured = () => !!(SUPABASE_URL && SERVICE_KEY && ANTHROPIC_KEY && Number.isFinite(CAP_USD) && CAP_USD > 0 && r2Configured(R2));

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

const isJwt = (token: string) => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token);
/** Headers that make PostgREST and Auth act as the caller: their JWT, or anon. */
const asCaller = (token: string | undefined): Record<string, string> =>
  token && isJwt(token) ? { apikey: API_KEY, Authorization: `Bearer ${token}` } : { apikey: API_KEY };

async function rest<T>(path: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...headers, Accept: 'application/json' } });
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`rest ${res.status}`);
  }
  return (await res.json()) as T;
}

/** One of the book_ask_* functions, as the service role. */
async function usage<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`rpc ${fn} ${res.status}`);
  }
  // A function returning void answers 204, or 200 with an empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function isOwner(token: string | undefined): Promise<boolean> {
  if (!token || !isJwt(token)) return false;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: asCaller(token) });
  if (!userRes.ok) {
    await userRes.body?.cancel();
    return false;
  }
  const id = ((await userRes.json().catch(() => null)) as { id?: unknown } | null)?.id;
  if (typeof id !== 'string' || !id) return false;
  const rows = await rest<unknown[]>(`user_roles?select=role&role=eq.admin&user_id=eq.${encodeURIComponent(id)}`, asCaller(token)).catch(() => []);
  return rows.length > 0;
}

const log = (fields: Record<string, unknown>) => console.log(JSON.stringify({ event: 'book-ask', ...fields }));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { ok: false, reason: 'method_not_allowed', message: 'Use POST.' });
  if (!configured()) return json(503, { ok: false, reason: 'not_configured', message: 'Questions are not set up yet.' });
  if (Number(req.headers.get('content-length') ?? '0') > 8192) return json(413, { ok: false, reason: 'bad_request', message: 'Request too large.' });

  const parsed = parseRequest(await req.json().catch(() => null));
  if (!parsed.ok) return json(400, { ok: false, reason: 'bad_request', message: parsed.message });
  const r = parsed.req;
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get('Authorization') ?? '')?.[1];
  const day = jakartaDay();
  const owner = await isOwner(token);
  const visitor = owner ? 'owner' : await visitorHash(day, clientIp((n) => req.headers.get(n)), req.headers.get('user-agent') ?? '', SALT);

  try {
    if (r.action === 'quota') {
      const asked = await usage<number | null>('book_ask_asked', { p_day: day, p_visitor: visitor });
      return json(200, { ok: true, remaining: owner ? null : Math.max(0, VISITOR_DAILY_QUESTIONS - (asked ?? 0)) });
    }

    let title = 'Untitled';
    /** The book as the caller's RLS shows it. */
    const readBook = async () => {
      const rows = await rest<(BookRow & { title: string | null; slug: string })[]>(
        `books_uploads?select=id,slug,title,access,published,ai_ready&id=eq.${r.book_id}&deleted_at=is.null&limit=1`,
        asCaller(token),
      );
      title = rows[0]?.title ?? rows[0]?.slug ?? title;
      return rows[0] ?? null;
    };

    if (r.action === 'text') {
      const refused = textRefusal(await readBook());
      if (refused) return json(refused.status, { ok: false, reason: refused.reason, message: refused.message });
      const key = r.part === 'index' ? textIndexKey(r.book_id) : textChapterKey(r.book_id, r.part);
      const url = await signR2(R2, 'GET', key, TEXT_URL_SECONDS, { 'response-content-type': 'application/json' });
      return json(200, { ok: true, url, expiresIn: TEXT_URL_SECONDS });
    }

    const admitted = await admit({
      book: readBook,
      isOwner: async () => owner,
      take: (limit) => usage<number | null>('book_ask_take', { p_day: day, p_visitor: visitor, p_limit: limit }),
      release: () => usage('book_ask_release', { p_day: day, p_visitor: visitor }),
      spentToday: async () => (await usage<number | null>('book_ask_spent', { p_day: day })) ?? 0,
      capCents: Math.round(CAP_USD * 100),
    });
    if (!admitted.ok) {
      log({ action: 'refused', reason: admitted.reason });
      return json(admitted.status, { ok: false, reason: admitted.reason, message: admitted.message });
    }

    const release = () => usage('book_ask_release', { p_day: day, p_visitor: visitor }).catch(() => undefined);
    // The chapter, from R2: the book's text lives beside its file, not in the database.
    const file = await fetch(await signR2(R2, 'GET', textChapterKey(r.book_id, r.chapter), 60));
    let chapter: Para[] | null = null;
    if (file.ok) chapter = readChapter(await file.json().catch(() => null), r.book_id, r.chapter);
    else await file.body?.cancel();
    if (!chapter) {
      await release();
      log({ action: 'no_text', status: file.status });
      return json(409, { ok: false, reason: 'not_ready', message: "This chapter's text is not ready for questions." });
    }
    const paras = contextWindow(chapter, r.selection.para_from, r.selection.para_to);
    if (!paras) {
      await release();
      return json(400, { ok: false, reason: 'bad_request', message: 'The selection is not in that chapter.' });
    }
    const prompt = buildPrompt(title, r.chapter, paras, r.selection, r.question);
    const inContext = new Set(paras.map((p) => p.para));

    const upstream = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-beta': FALLBACK_BETA,
      },
      body: JSON.stringify(messagesBody(MODEL, prompt)),
    });
    if (!upstream.ok || !upstream.body) {
      log({ action: 'upstream_failed', status: upstream.status });
      await upstream.body?.cancel();
      await release();
      return json(502, { ok: false, reason: 'model_failed', message: 'The answer could not be written just now. Try again.' });
    }

    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        // A reader who leaves mid-answer stops receiving; the answer is still read to the end, so its cost is counted.
        const send = (s: string) => {
          if (!open) return;
          try {
            controller.enqueue(enc.encode(s));
          } catch {
            open = false;
          }
        };
        send(sse('meta', { remaining: admitted.remaining, context: [paras[0].para, paras[paras.length - 1].para] }));
        const state = newStreamState();
        const reader = upstream.body!.getReader();
        const dec = new TextDecoder();
        let buffer = '';
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            const split = sseData(buffer + dec.decode(value, { stream: true }));
            buffer = split.rest;
            for (const data of split.events) {
              const text = foldEvent(state, data);
              if (text) send(sse('delta', { text }));
            }
          }
          const cents = costCents(state.models.length ? state.models : [MODEL], state.usage);
          await usage('book_ask_spend', { p_day: day, p_visitor: visitor, p_cents: cents });
          log({ action: 'answered', models: state.models, stop: state.stop, cents, usage: state.usage });
          if (state.error || state.stop === 'refusal' || !state.text) {
            await release();
            send(sse('error', { reason: state.stop === 'refusal' ? 'refused' : 'model_failed', message: 'No answer could be given to that question.' }));
          } else {
            const cited = citedParas(state.text);
            send(sse('done', { cited: cited.filter((n) => inContext.has(n)), outside: cited.filter((n) => !inContext.has(n)), remaining: admitted.remaining }));
          }
        } catch (e) {
          log({ action: 'stream_failed', error: e instanceof Error ? e.message : 'unknown' });
          await release();
          send(sse('error', { reason: 'model_failed', message: 'The answer stopped partway. Try again.' }));
        } finally {
          if (open) controller.close();
        }
      },
    });
    return new Response(body, { status: 200, headers: { ...CORS, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (e) {
    log({ action: r.action, error: e instanceof Error ? e.message : 'unknown' });
    return json(503, { ok: false, reason: 'lookup_failed', message: 'Could not check the book or the day’s questions. Try again.' });
  }
});
