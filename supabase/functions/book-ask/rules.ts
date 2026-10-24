/**
 * book-ask's pure parts (supabase/functions/book-ask/index.ts; docs/prd/library-phase-2 §4, Ask function),
 * kept free of Deno so tests/unit/bookAsk.test.ts runs them in Node: the request, the visitor's hash, the
 * guards in their order, the chapter's context, the prompt, the cost of an answer, the citations in it, and
 * the model's stream.
 */

export const VISITOR_DAILY_QUESTIONS = 5;
/** How long a signed URL to the book's text lives. */
export const TEXT_URL_SECONDS = 3600;
export const QUESTION_MAX = 500;
export const SELECTION_MAX = 2000;
/** The most of a chapter sent as context (~15k tokens); a longer chapter is cut to a window round the selection. */
export const CONTEXT_CHARS = 60_000;
export const DEFAULT_MODEL = 'claude-opus-5-5';
export const ANTHROPIC_VERSION = '2026-10-21';
/** Server-side refusal fallback, routed by category (no model list to keep). */
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
export const MAX_TOKENS = 4000;

export interface Selection {
  para_from: number;
  para_to: number;
  text: string;
}

export type AskRequest =
  | { action: 'ask'; book_id: string; chapter: number; selection: Selection; question: string }
  | { action: 'quota'; book_id: string }
  /** A signed URL for the book's text in R2: its index, or one chapter. */
  | { action: 'text'; book_id: string; part: 'index' | number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : null);

export function parseRequest(body: unknown): { ok: true; req: AskRequest } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') return { ok: false, message: 'A JSON body is needed.' };
  const b = body as Record<string, unknown>;
  const bookId = typeof b.book_id === 'string' && UUID.test(b.book_id) ? b.book_id : null;
  if (!bookId) return { ok: false, message: 'book_id must be a uuid.' };
  if (b.action === 'quota') return { ok: true, req: { action: 'quota', book_id: bookId } };
  if (b.action === 'text') {
    const part = b.part === 'index' ? 'index' : int(b.part);
    if (part === null || (typeof part === 'number' && part < 0)) return { ok: false, message: "part must be 'index' or a chapter number." };
    return { ok: true, req: { action: 'text', book_id: bookId, part } };
  }
  if (b.action !== undefined && b.action !== 'ask') return { ok: false, message: 'Unknown action.' };
  const chapter = int(b.chapter);
  if (chapter === null || chapter < 0) return { ok: false, message: 'chapter must be a whole number, 0 or more.' };
  const s = (b.selection ?? null) as Record<string, unknown> | null;
  const from = int(s?.para_from);
  const to = int(s?.para_to);
  if (!s || from === null || to === null || from < 1 || to < from) return { ok: false, message: 'selection needs para_from ≤ para_to, both from 1.' };
  if (to - from > 50) return { ok: false, message: 'Select at most fifty paragraphs.' };
  const text = typeof s.text === 'string' ? s.text.trim() : '';
  if (!text || text.length > SELECTION_MAX) return { ok: false, message: `The selected text must be 1–${SELECTION_MAX} characters.` };
  const question = typeof b.question === 'string' ? b.question.trim() : '';
  if (!question || question.length > QUESTION_MAX) return { ok: false, message: `The question must be 1–${QUESTION_MAX} characters.` };
  return { ok: true, req: { action: 'ask', book_id: bookId, chapter, selection: { para_from: from, para_to: to, text }, question } };
}

/** The day caps are counted in: the owner's day, Jakarta (UTC+7, no daylight saving). */
export const jakartaDay = (now: Date = new Date()) => new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** The caller's address: the first hop the platform recorded. */
export function clientIp(get: (name: string) => string | null): string {
  return (get('cf-connecting-ip') ?? get('x-forwarded-for')?.split(',')[0] ?? get('x-real-ip') ?? '').trim() || 'unknown';
}

/** The visitor, as a hash of address and browser for the day (salted with a server secret): no address is stored. */
export async function visitorHash(day: string, ip: string, ua: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${day}|${ip}|${ua}|${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// The guards, in the order §4 gives them
// ---------------------------------------------------------------------------

export interface BookRow {
  id: string;
  access: 'free' | 'paid';
  published: boolean;
  ai_ready: boolean;
}

export type Refusal = { status: number; reason: string; message: string };

export interface GuardDeps {
  /** The book as the caller's RLS shows it; null when hidden or not there. */
  book: () => Promise<BookRow | null>;
  /** True for the signed-in owner (admin): no visitor cap. */
  isOwner: () => Promise<boolean>;
  /** Counts one question for the visitor today, atomically; null when the cap is reached. Owner: no limit. */
  take: (limit: number | null) => Promise<number | null>;
  /** Gives back a question taken (a later guard refused, or the model failed). */
  release: () => Promise<void>;
  /** Cents spent by everyone today. */
  spentToday: () => Promise<number>;
  /** The global cap, in cents. */
  capCents: number;
}

export type Admitted = { ok: true; owner: boolean; asked: number; remaining: number | null };

/** The first two guards, which reading the text needs too: published and free, then ai_ready. Null: readable. */
export function textRefusal(book: BookRow | null): Refusal | null {
  if (!book || !book.published) return { status: 404, reason: 'not_found', message: 'This book is not on the shelves.' };
  if (book.access !== 'free') return { status: 403, reason: 'not_free', message: 'Questions are only for free books.' };
  if (!book.ai_ready) return { status: 409, reason: 'not_ready', message: "This book's text is not ready for questions." };
  return null;
}

/**
 * Book published and free → ai_ready → the visitor's 5 a day (the owner uncapped) → the global spend a day.
 * Each refuses before the next is asked, so a paid book is refused without counting a question.
 */
export async function admit(d: GuardDeps): Promise<Admitted | ({ ok: false } & Refusal)> {
  const refused = textRefusal(await d.book());
  if (refused) return { ok: false, ...refused };
  const owner = await d.isOwner();
  const asked = await d.take(owner ? null : VISITOR_DAILY_QUESTIONS);
  if (asked === null) return { ok: false, status: 429, reason: 'visitor_cap', message: `That is ${VISITOR_DAILY_QUESTIONS} questions today. Come back tomorrow.` };
  if ((await d.spentToday()) >= d.capCents) {
    await d.release();
    return { ok: false, status: 429, reason: 'daily_budget', message: "Today's questions are used up across the site. Come back tomorrow." };
  }
  return { ok: true, owner, asked, remaining: owner ? null : Math.max(0, VISITOR_DAILY_QUESTIONS - asked) };
}

// ---------------------------------------------------------------------------
// Context and prompt
// ---------------------------------------------------------------------------

export interface Para {
  para: number;
  page: number;
  text: string;
}

/**
 * The chapter's paragraphs to send: all of them when they fit CONTEXT_CHARS, else the selection and as many
 * neighbours on both sides as fit, nearest first. Null when the selection is not in the chapter.
 */
export function contextWindow(chapter: Para[], from: number, to: number, limit = CONTEXT_CHARS): Para[] | null {
  const start = chapter.findIndex((p) => p.para === from);
  const end = chapter.findIndex((p) => p.para === to);
  if (start < 0 || end < 0) return null;
  const size = (p: Para) => p.text.length + 8;
  if (chapter.reduce((n, p) => n + size(p), 0) <= limit) return chapter;
  let lo = start;
  let hi = end;
  let used = chapter.slice(lo, hi + 1).reduce((n, p) => n + size(p), 0);
  let grew = true;
  while (grew) {
    grew = false;
    if (hi + 1 < chapter.length && used + size(chapter[hi + 1]) <= limit) {
      hi++;
      used += size(chapter[hi]);
      grew = true;
    }
    if (lo > 0 && used + size(chapter[lo - 1]) <= limit) {
      lo--;
      used += size(chapter[lo]);
      grew = true;
    }
  }
  return chapter.slice(lo, hi + 1);
}

export const SYSTEM_PROMPT = [
  "You answer a reader's question about a passage of a book, using only the paragraphs you are given.",
  'Each paragraph begins with its number, written [¶n].',
  'Support every statement with the paragraph it rests on, cited exactly as [¶n], one number per bracket, and cite only numbers that appear in the paragraphs given.',
  'If the paragraphs do not answer the question, say so plainly; do not draw on other knowledge and do not guess.',
  'Answer in the language of the question, in at most 150 words of plain prose, without headings or lists.',
].join(' ');

export interface Prompt {
  system: string;
  /** The chapter, as one block the API can cache across questions on the same chapter. */
  context: string;
  ask: string;
}

export function buildPrompt(title: string, chapter: number, paras: Para[], sel: Selection, question: string): Prompt {
  const range = sel.para_from === sel.para_to ? `[¶${sel.para_from}]` : `[¶${sel.para_from}]–[¶${sel.para_to}]`;
  return {
    system: SYSTEM_PROMPT,
    context: [`Book: ${title}`, `Chapter ${chapter}`, '', ...paras.map((p) => `[¶${p.para}] ${p.text}`)].join('\n'),
    ask: `The reader selected this passage, in ${range}:\n"${sel.text}"\n\nTheir question: ${question}`,
  };
}

/** The Messages API request body (raw HTTP; API version 2026-10-21, so no temperature). */
export function messagesBody(model: string, p: Prompt) {
  return {
    model,
    max_tokens: MAX_TOKENS,
    stream: true,
    // Thinking cannot be turned off on Claude Opus 5.5; low effort keeps a short answer quick and cheap.
    output_config: { effort: 'low' },
    fallbacks: 'default',
    system: p.system,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: p.context, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: p.ask },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Citations and cost
// ---------------------------------------------------------------------------

/** Every [¶n] in an answer, in order, each once. */
export function citedParas(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\[¶\s*(\d+)\]/g)) {
    const n = Number(m[1]);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

/** USD per million tokens: input, output; cache writes at 1.25× input, reads at 0.05× input. */
export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-fable-5-1': { input: 10, output: 50 },
};
/** A model not in the table is priced as the dearest one, so the cap errs on the safe side. */
const DEAREST = { input: 10, output: 50 };

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/** What an answer cost, in whole cents, rounded up: the cap never under-counts. */
export function costCents(models: string[], u: Usage): number {
  const rates = models.map((m) => PRICES[m] ?? DEAREST);
  const r = rates.reduce((a, b) => (b.input > a.input ? b : a), rates[0] ?? DEAREST);
  const usd =
    ((u.input_tokens ?? 0) * r.input +
      (u.cache_creation_input_tokens ?? 0) * r.input * 1.25 +
      (u.cache_read_input_tokens ?? 0) * r.input * 0.05 +
      (u.output_tokens ?? 0) * r.output) /
    1_000_000;
  return Math.max(0, Math.ceil(usd * 100 - 1e-9));
}

// ---------------------------------------------------------------------------
// The model's stream
// ---------------------------------------------------------------------------

export interface StreamState {
  text: string;
  models: string[];
  usage: Usage;
  stop: string | null;
  error: string | null;
}

export const newStreamState = (): StreamState => ({ text: '', models: [], usage: {}, stop: null, error: null });

/**
 * One SSE event of the Messages API stream folded into the state; returns the text to pass on, if any.
 * message_start carries the model and the input usage, content_block_delta the text (thinking and other
 * deltas are not passed on), message_delta the stop reason and the output usage.
 */
export function foldEvent(state: StreamState, data: string): string {
  let e: Record<string, unknown>;
  try {
    e = JSON.parse(data);
  } catch {
    return '';
  }
  if (e.type === 'message_start') {
    const m = e.message as { model?: string; usage?: Usage } | undefined;
    if (m?.model && !state.models.includes(m.model)) state.models.push(m.model);
    state.usage = { ...state.usage, ...(m?.usage ?? {}) };
  } else if (e.type === 'content_block_start') {
    const b = e.content_block as { type?: string; to?: { model?: string } } | undefined;
    // A fallback block: another model took over; price the answer at the dearer of the two.
    if (b?.type === 'fallback' && b.to?.model && !state.models.includes(b.to.model)) state.models.push(b.to.model);
  } else if (e.type === 'content_block_delta') {
    const d = e.delta as { type?: string; text?: string } | undefined;
    if (d?.type === 'text_delta' && d.text) {
      state.text += d.text;
      return d.text;
    }
  } else if (e.type === 'message_delta') {
    const d = e.delta as { stop_reason?: string } | undefined;
    if (d?.stop_reason) state.stop = d.stop_reason;
    state.usage = { ...state.usage, ...((e.usage as Usage | undefined) ?? {}) };
  } else if (e.type === 'error') {
    state.error = (e.error as { type?: string } | undefined)?.type ?? 'error';
  }
  return '';
}

/** Splits an SSE byte stream's text into complete events' data, keeping the unfinished tail. */
export function sseData(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? '';
  const events = parts
    .map((chunk) =>
      chunk
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).replace(/^ /, ''))
        .join('\n'),
    )
    .filter(Boolean);
  return { events, rest };
}

/** One event of this function's own stream to the reader. */
export const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
