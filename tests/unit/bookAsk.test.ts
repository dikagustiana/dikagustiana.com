// @vitest-environment node
/**
 * The book-ask edge function's rules (supabase/functions/book-ask/rules.ts; docs/prd/library-phase-2 §4 Ask
 * function and Tests) and the site's client for it (src/lib/bookAsk.ts): the guards in their order — a paid
 * book refused before anything is counted, a sixth question refused, the site's daily spend — the book's text
 * in R2 (supabase/functions/_shared/bookText.ts), the chapter's context, a prompt that asks for [¶n] from the context only, the model's stream folded into text, citations
 * and cost, and the answer split into checkable citations.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }));

import {
  CONTEXT_CHARS,
  SYSTEM_PROMPT,
  VISITOR_DAILY_QUESTIONS,
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
  sseData,
  textRefusal,
  visitorHash,
  type BookRow,
  type GuardDeps,
  type Para,
} from '../../supabase/functions/book-ask/rules';
import { answerParts, parseSse, quotaLine } from '@/lib/bookAsk';
import { chapterAtPage, readChapter, readIndex, textChapterKey, textFiles, textIndexKey } from '../../supabase/functions/_shared/bookText';

const BOOK = '11111111-2222-3333-4444-555555555555';
const free: BookRow = { id: BOOK, access: 'free', published: true, ai_ready: true };

/** A day's counter for one visitor, as book_ask_take keeps it. */
function deps(book: BookRow | null, over: Partial<GuardDeps> = {}) {
  let asked = 0;
  const calls: string[] = [];
  const d: GuardDeps = {
    book: async () => {
      calls.push('book');
      return book;
    },
    isOwner: async () => false,
    take: async (limit) => {
      calls.push('take');
      if (limit !== null && asked >= limit) return null;
      return ++asked;
    },
    release: async () => {
      calls.push('release');
      asked--;
    },
    spentToday: async () => 0,
    capCents: 200,
    ...over,
  };
  return { d, calls, asked: () => asked };
}

describe('the request', () => {
  it('takes a book, a chapter, a selection and a question, and refuses anything else', () => {
    const ok = parseRequest({ book_id: BOOK, chapter: 1, selection: { para_from: 3, para_to: 4, text: ' a passage ' }, question: ' Why? ' });
    expect(ok).toEqual({ ok: true, req: { action: 'ask', book_id: BOOK, chapter: 1, selection: { para_from: 3, para_to: 4, text: 'a passage' }, question: 'Why?' } });
    expect(parseRequest({ action: 'quota', book_id: BOOK })).toEqual({ ok: true, req: { action: 'quota', book_id: BOOK } });
    expect(parseRequest({ action: 'text', book_id: BOOK, part: 'index' })).toEqual({ ok: true, req: { action: 'text', book_id: BOOK, part: 'index' } });
    expect(parseRequest({ action: 'text', book_id: BOOK, part: 2 })).toEqual({ ok: true, req: { action: 'text', book_id: BOOK, part: 2 } });
    expect(parseRequest({ action: 'text', book_id: BOOK, part: '../x' }).ok).toBe(false);
    expect(parseRequest({ action: 'text', book_id: BOOK, part: -1 }).ok).toBe(false);
    expect(parseRequest({ book_id: 'x' }).ok).toBe(false);
    expect(parseRequest({ book_id: BOOK, chapter: 1, selection: { para_from: 4, para_to: 3, text: 'a' }, question: 'q' }).ok).toBe(false);
    expect(parseRequest({ book_id: BOOK, chapter: 1, selection: { para_from: 1, para_to: 1, text: 'a' }, question: 'q'.repeat(501) }).ok).toBe(false);
    expect(parseRequest({ book_id: BOOK, chapter: -1, selection: { para_from: 1, para_to: 1, text: 'a' }, question: 'q' }).ok).toBe(false);
  });

  it("hashes the visitor by day, address and browser, and takes the day in Jakarta", async () => {
    const a = await visitorHash('2026-10-24', '1.2.3.4', 'UA', 's');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await visitorHash('2026-10-24', '1.2.3.4', 'UA', 's')).toBe(a);
    expect(await visitorHash('2026-10-25', '1.2.3.4', 'UA', 's')).not.toBe(a);
    expect(await visitorHash('2026-10-24', '1.2.3.5', 'UA', 's')).not.toBe(a);
    expect(await visitorHash('2026-10-24', '1.2.3.4', 'UA2', 's')).not.toBe(a);
    expect(clientIp((n) => ({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' })[n] ?? null)).toBe('9.9.9.9');
    expect(jakartaDay(new Date('2026-10-24T17:30:00Z'))).toBe('2026-10-25');
    expect(jakartaDay(new Date('2026-10-24T16:30:00Z'))).toBe('2026-10-24');
  });
});

describe('the guards, in order', () => {
  it('refuses a paid book before counting a question, even with the caps reached', async () => {
    const { d, calls } = deps({ ...free, access: 'paid', ai_ready: false }, { spentToday: async () => 10_000 });
    expect(await admit(d)).toMatchObject({ ok: false, status: 403, reason: 'not_free' });
    expect(calls).toEqual(['book']);
  });

  it('refuses a hidden book, then one without text, before the caps', async () => {
    expect(await admit(deps(null).d)).toMatchObject({ ok: false, status: 404, reason: 'not_found' });
    const notReady = deps({ ...free, ai_ready: false });
    expect(await admit(notReady.d)).toMatchObject({ ok: false, status: 409, reason: 'not_ready' });
    expect(notReady.calls).toEqual(['book']);
  });

  it('answers five questions a visitor a day and refuses the sixth', async () => {
    const { d, asked } = deps(free);
    const left: (number | null)[] = [];
    for (let i = 0; i < VISITOR_DAILY_QUESTIONS; i++) {
      const r = await admit(d);
      expect(r.ok).toBe(true);
      if (r.ok) left.push(r.remaining);
    }
    expect(left).toEqual([4, 3, 2, 1, 0]);
    expect(await admit(d)).toMatchObject({ ok: false, status: 429, reason: 'visitor_cap' });
    expect(asked()).toBe(5);
  });

  it('leaves the owner uncapped', async () => {
    const { d } = deps(free, { isOwner: async () => true });
    for (let i = 0; i < 8; i++) expect(await admit(d)).toMatchObject({ ok: true, owner: true, remaining: null });
  });

  it("refuses when the site's spend for the day is reached, and gives the question back", async () => {
    const { d, calls, asked } = deps(free, { spentToday: async () => 200 });
    expect(await admit(d)).toMatchObject({ ok: false, status: 429, reason: 'daily_budget' });
    expect(calls).toEqual(['book', 'take', 'release']);
    expect(asked()).toBe(0);
  });
});

describe("the book's text in R2", () => {
  const paras = [
    { chapter: 0, para: 1, page: 1, text: 'Preface.' },
    { chapter: 1, para: 2, page: 2, text: 'One.' },
    { chapter: 1, para: 3, page: 3, text: 'Two.' },
    { chapter: 2, para: 4, page: 7, text: 'Three.' },
  ];

  it('is an index and a file per chapter, keyed by the book id', () => {
    const { index, chapters } = textFiles(BOOK, 9, paras);
    expect(textIndexKey(BOOK)).toBe(`text/${BOOK}/index.json`);
    expect(textChapterKey(BOOK, 2)).toBe(`text/${BOOK}/ch-2.json`);
    expect(index).toEqual({
      version: 1,
      book_id: BOOK,
      page_count: 9,
      paragraphs: 4,
      chapters: [
        { chapter: 0, first_para: 1, last_para: 1, first_page: 1, last_page: 1 },
        { chapter: 1, first_para: 2, last_para: 3, first_page: 2, last_page: 3 },
        { chapter: 2, first_para: 4, last_para: 4, first_page: 7, last_page: 7 },
      ],
    });
    expect(chapters[1]).toEqual({ version: 1, book_id: BOOK, chapter: 1, paragraphs: [{ para: 2, page: 2, text: 'One.' }, { para: 3, page: 3, text: 'Two.' }] });
    expect(chapterAtPage(index, 1)).toBe(0);
    expect(chapterAtPage(index, 6)).toBe(1);
    expect(chapterAtPage(index, 99)).toBe(2);
    // Read back only for the book and chapter asked for.
    expect(readChapter(chapters[1], BOOK, 1)).toHaveLength(2);
    expect(readChapter(chapters[1], BOOK, 2)).toBeNull();
    expect(readChapter(chapters[1], 'another', 1)).toBeNull();
    expect(readIndex(index, BOOK)).toBe(index);
    expect(readIndex(null, BOOK)).toBeNull();
  });

  it('is read only past the same first guards as a question', () => {
    expect(textRefusal(free)).toBeNull();
    expect(textRefusal({ ...free, access: 'paid' })).toMatchObject({ status: 403, reason: 'not_free' });
    expect(textRefusal({ ...free, ai_ready: false })).toMatchObject({ status: 409 });
    expect(textRefusal(null)).toMatchObject({ status: 404 });
  });
});

describe('the context and the prompt', () => {
  const chapter: Para[] = Array.from({ length: 30 }, (_, i) => ({ para: i + 11, page: 1 + Math.floor(i / 5), text: `Paragraph ${i + 11}. ${'x'.repeat(200)}` }));

  it('sends the whole chapter when it fits, else a window round the selection', () => {
    expect(contextWindow(chapter, 15, 16)).toBe(chapter);
    const small = contextWindow(chapter, 25, 26, 5 * 230)!;
    expect(small.map((p) => p.para)).toContain(25);
    expect(small.map((p) => p.para)).toContain(26);
    expect(small.length).toBeLessThanOrEqual(5);
    expect(small[0].para).toBeGreaterThanOrEqual(23);
    expect(contextWindow(chapter, 9, 12)).toBeNull();
    expect(CONTEXT_CHARS).toBeGreaterThan(10_000);
  });

  it('numbers every paragraph [¶n], asks for those numbers only, and sends no temperature', () => {
    const p = buildPrompt('A Short Book of Ledgers', 1, chapter.slice(0, 3), { para_from: 12, para_to: 12, text: 'Paragraph 12.' }, 'What is it?');
    expect(p.context.split('\n').slice(3).map((l) => l.slice(0, 6))).toEqual(['[¶11] ', '[¶12] ', '[¶13] ']);
    expect(p.ask).toContain('[¶12]');
    expect(SYSTEM_PROMPT).toMatch(/cite only numbers that appear in the paragraphs given/);
    const body = messagesBody('claude-opus-5-5', p);
    expect(body).toMatchObject({ model: 'claude-opus-5-5', stream: true, fallbacks: 'default', output_config: { effort: 'low' } });
    expect(body).not.toHaveProperty('temperature');
    expect(body.messages[0].content[0]).toMatchObject({ text: p.context, cache_control: { type: 'ephemeral' } });
  });
});

describe('the answer', () => {
  it("folds the model's stream into text, its models and usage, passing on text only", () => {
    const stream = [
      'event: message_start\ndata: {"type":"message_start","message":{"model":"claude-opus-5-5","usage":{"input_tokens":1200,"cache_read_input_tokens":0,"cache_creation_input_tokens":3000,"output_tokens":1}}}',
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":""}}',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Postings must agree [¶12]"}}',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":", see [¶4] and [¶12] [¶99]."}}',
      'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":400}}',
      'event: message_stop\ndata: {"type":"message_stop"}',
      'event: ping\ndata: {"type":"pi',
    ].join('\n\n');
    const { events, rest } = sseData(stream);
    expect(rest).toContain('"pi');
    const s = newStreamState();
    const passed = events.map((e) => foldEvent(s, e)).join('');
    expect(passed).toBe('Postings must agree [¶12], see [¶4] and [¶12] [¶99].');
    expect(s).toMatchObject({ models: ['claude-opus-5-5'], stop: 'end_turn', usage: { input_tokens: 1200, cache_creation_input_tokens: 3000, output_tokens: 400 } });
    expect(citedParas(s.text)).toEqual([12, 4, 99]);
    // 1200×$4 + 3000×$5 (cache write) + 400×$20, per million: $0.0278 → 3 cents, rounded up.
    expect(costCents(s.models, s.usage)).toBe(3);
  });

  it('prices a fallback at the dearer model, and an unknown model as the dearest', () => {
    const s = newStreamState();
    foldEvent(s, '{"type":"message_start","message":{"model":"claude-opus-5-5","usage":{"input_tokens":1000000}}}');
    foldEvent(s, '{"type":"content_block_start","index":0,"content_block":{"type":"fallback","from":{"model":"claude-opus-5-5"},"to":{"model":"claude-opus-5"}}}');
    expect(costCents(s.models, s.usage)).toBe(500);
    expect(costCents(['claude-new'], { output_tokens: 1_000_000 })).toBe(5000);
    expect(costCents(['claude-opus-5-5'], {})).toBe(0);
  });

  it('reads the function’s own stream on the client, and makes only the context’s [¶n] checkable', () => {
    const { events, rest } = parseSse('event: meta\ndata: {"remaining":4}\n\nevent: delta\ndata: {"text":"a"}\n\nevent: done\ndata: {"cited":[12]');
    expect(events).toEqual([['meta', '{"remaining":4}'], ['delta', '{"text":"a"}']]);
    expect(rest).toBe('event: done\ndata: {"cited":[12]');
    expect(answerParts('As [¶12] says, not [¶99].', (n) => n === 12)).toEqual([
      { kind: 'text', text: 'As ' },
      { kind: 'cite', para: 12, checkable: true },
      { kind: 'text', text: ' says, not ' },
      { kind: 'text', text: '[¶99]' },
      { kind: 'text', text: '.' },
    ]);
    expect(quotaLine(3, false)).toBe('3 of 5 questions left today');
    expect(quotaLine(null, true)).toBe('No daily limit (owner).');
  });
});
