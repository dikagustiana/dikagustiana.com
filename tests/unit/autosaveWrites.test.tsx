/**
 * The write path behind every keystroke: writeRevision, the useEssayAutosave
 * hook, recordRevision, and useDraftRecovery — against a mocked Supabase
 * client (no network, no database).
 *
 * These are the goal-6 safety nets: backup-first ordering, the guarded
 * never-published row write (published=false + updated_at optimistic
 * concurrency), the loud zero-rows failure, brief-body backup-only scoping,
 * the 23505 retry, and the recovery offer. Nothing here touches the real
 * project; every write below happens against an in-memory harness.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { JSONContent } from '@tiptap/core';

type RevisionRow = {
  id: string;
  revision_no: number;
  change_type: string;
  created_at: string;
  content_json: unknown;
  title: string | null;
};

type CallEntry = {
  table: string;
  op: 'select' | 'update' | 'insert';
  payload: unknown;
  filters: Array<[string, unknown]>;
  usedIn: boolean;
};

interface Harness {
  calls: CallEntry[];
  /** Returned by a plain latest-revision select (numbering). */
  latestAll: RevisionRow | null;
  /** Returned by a body-scoped select (rollup / recovery). */
  latestOfBody: RevisionRow | null;
  /** Popped per essay_revisions insert. */
  insertQueue: Array<{ data?: { id: string } | null; error?: { code: string; message: string } | null }>;
  rollupError: { code: string; message: string } | null;
  essayRow: { data: Array<{ updated_at: string }> | null; error: { message: string } | null };
  /** When set, every essays write parks until it resolves (race tests). */
  essayRowGate: Promise<void> | null;
}

function makeHarness(): Harness {
  return {
    calls: [],
    latestAll: null,
    latestOfBody: null,
    insertQueue: [],
    rollupError: null,
    essayRow: { data: [{ updated_at: '2026-01-03T00:00:00Z' }], error: null },
    essayRowGate: null,
  };
}

const state: { current: Harness } = { current: makeHarness() };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const h = state.current;
      const entry: CallEntry = { table, op: 'select', payload: undefined, filters: [], usedIn: false };
      h.calls.push(entry);
      const b: Record<string, unknown> = {};
      const self = () => b;
      b.select = self;
      b.update = (p: unknown) => { entry.op = 'update'; entry.payload = p; return b; };
      b.insert = (p: unknown) => { entry.op = 'insert'; entry.payload = p; return b; };
      b.eq = (c: string, v: unknown) => { entry.filters.push([c, v]); return b; };
      b.in = (c: string, v: unknown[]) => { entry.usedIn = true; entry.filters.push([c, v]); return b; };
      b.order = self;
      b.limit = self;
      b.maybeSingle = async () => ({ data: entry.usedIn ? h.latestOfBody : h.latestAll, error: null });
      b.single = async () => h.insertQueue.shift() ?? { data: { id: 'rev-new' }, error: null };
      b.then = (res?: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
        let result: unknown;
        if (table === 'essay_revisions' && entry.op === 'update') {
          result = { data: null, error: h.rollupError };
        } else if (table === 'essays') {
          result = h.essayRow;
        } else {
          result = { data: null, error: { code: 'XX000', message: `unexpected await on ${table}` } };
        }
        const settled = table === 'essays' && h.essayRowGate
          ? h.essayRowGate.then(() => result)
          : Promise.resolve(result);
        return settled.then(res, rej);
      };
      return b;
    },
  },
}));

import { writeRevision, useEssayAutosave, useDraftRecovery } from '@/hooks/useEssayAutosave';
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/revisions';

const rev = (over: Partial<RevisionRow> = {}): RevisionRow => ({
  id: 'rev-1',
  revision_no: 1,
  change_type: 'autosave',
  created_at: new Date().toISOString(),
  content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'old' }] }] },
  title: null,
  ...over,
});

const doc = (text: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const before = performance.now();

const input = (over: Partial<Parameters<typeof writeRevision>[0]> = {}) => ({
  essayId: 'essay-1',
  doc: doc('new text'),
  title: 'T',
  snippet: null,
  status: 'draft' as const,
  changeType: 'autosave' as const,
  ...over,
});

const inserts = () => state.current.calls.filter(c => c.table === 'essay_revisions' && c.op === 'insert');
const revisionUpdates = () => state.current.calls.filter(c => c.table === 'essay_revisions' && c.op === 'update');
const essayUpdates = () => state.current.calls.filter(c => c.table === 'essays' && c.op === 'update');

beforeEach(() => {
  vi.useFakeTimers();
  state.current = makeHarness();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// writeRevision
// ---------------------------------------------------------------------------

describe('writeRevision', () => {
  it('appends a revision numbered one past the absolute latest', async () => {
    state.current.latestAll = rev({ revision_no: 7, id: 'other' });
    state.current.latestOfBody = rev({ revision_no: 7, id: 'other' });

    const id = await writeRevision(input(), null);

    expect(id).toBe('rev-new');
    expect(inserts()).toHaveLength(1);
    expect(inserts()[0].payload).toMatchObject({ essay_id: 'essay-1', revision_no: 8, change_type: 'autosave' });
    expect(revisionUpdates()).toHaveLength(0);
  });

  it('rolls up into our own recent autosave row instead of appending', async () => {
    state.current.latestOfBody = rev({
      id: 'mine',
      revision_no: 3,
      change_type: 'autosave',
      created_at: new Date().toISOString(),
    });
    state.current.latestAll = rev({ revision_no: 9, id: 'a-brief-row-elsewhere' });

    const id = await writeRevision(input(), 'mine');

    expect(id).toBe('mine');
    expect(revisionUpdates()).toHaveLength(1);
    expect(revisionUpdates()[0].filters).toContainEqual(['id', 'mine']);
    expect((revisionUpdates()[0].payload as { content_json: unknown }).content_json).toEqual(input().doc);
    expect(inserts()).toHaveLength(0);
  });

  it('never rolls up a row this session did not write', async () => {
    state.current.latestOfBody = rev({ id: 'someone-elses', created_at: new Date().toISOString() });
    state.current.latestAll = rev({ revision_no: 4, id: 'someone-elses' });

    await writeRevision(input(), 'mine');

    expect(inserts()).toHaveLength(1);
    expect(inserts()[0].payload).toMatchObject({ revision_no: 5 });
  });

  it('retries with a recomputed number when another writer took ours (23505)', async () => {
    state.current.latestAll = rev({ revision_no: 1, id: 'other' });
    state.current.latestOfBody = rev({ revision_no: 1, id: 'other' });
    state.current.insertQueue = [
      { error: { code: '23505', message: 'duplicate key' } },
      { data: { id: 'rev-second' } },
    ];

    const id = await writeRevision(input(), null);

    expect(id).toBe('rev-second');
    expect(inserts()).toHaveLength(2);
    expect(inserts()[1].payload).toMatchObject({ revision_no: 2 });
  });

  it('gives up loudly after three 23505 attempts', async () => {
    state.current.latestAll = rev({ revision_no: 1, id: 'other' });
    state.current.latestOfBody = rev({ revision_no: 1, id: 'other' });
    const dup = { error: { code: '23505', message: 'duplicate key' } };
    state.current.insertQueue = [dup, dup, dup];

    await expect(writeRevision(input(), null)).rejects.toMatchObject({ code: '23505' });
    expect(inserts()).toHaveLength(3);
  });

  it('scopes rollup and numbering filters to the brief body', async () => {
    state.current.latestOfBody = rev({ id: 'brief-row', change_type: 'brief_autosave', created_at: new Date().toISOString() });

    await writeRevision(input({ changeType: 'brief_autosave' }), null);

    const scopedSelect = state.current.calls.find(c => c.op === 'select' && c.usedIn);
    expect(scopedSelect?.filters).toContainEqual(['change_type', ['brief_autosave', 'brief_manual_save']]);
  });
});

// ---------------------------------------------------------------------------
// useEssayAutosave
// ---------------------------------------------------------------------------

const baseArgs = {
  essayId: 'essay-1',
  title: 'T',
  sectionId: 'finance',
  categoryId: 'cat-1',
  snippet: null,
  status: 'draft' as const,
  enabled: true,
};

async function until(cond: () => boolean, steps = 200) {
  for (let i = 0; i < steps && !cond(); i += 1) {
    await vi.advanceTimersByTimeAsync(10);
  }
  expect(cond()).toBe(true);
}

describe('useEssayAutosave', () => {
  it('backs up a debounced edit of a published essay, revision only', async () => {
    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: { ...baseArgs, status: 'published' as const, doc: doc('v1'), persistToEssay: false },
    });

    await until(() => result.current.autosaveStatus === 'saved');

    expect(result.current.lastSavedTo).toBe('revision');
    expect(inserts()).toHaveLength(1);
    expect(inserts()[0].payload).toMatchObject({ change_type: 'autosave' });
    expect(essayUpdates()).toHaveLength(0);
  });

  it('writes backup FIRST, then the guarded row, for a never-published essay', async () => {
    const serverUpdatedAt = { current: '2026-01-02T00:00:00Z' };
    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: {
        ...baseArgs, doc: doc('v1'), persistToEssay: true, html: '<p>v1</p>', serverUpdatedAtRef: serverUpdatedAt,
      },
    });

    await until(() => result.current.autosaveStatus === 'saved');

    expect(result.current.lastSavedTo).toBe('essay');
    expect(inserts()).toHaveLength(1);
    expect(essayUpdates()).toHaveLength(1);

    const order = state.current.calls.map(c => `${c.table}:${c.op}`);
    expect(order.indexOf('essay_revisions:insert')).toBeLessThan(order.indexOf('essays:update'));

    const upd = essayUpdates()[0];
    expect(upd.filters).toEqual(
      expect.arrayContaining([
        ['id', 'essay-1'],
        ['published', false],
        ['updated_at', '2026-01-02T00:00:00Z'],
      ]),
    );
    expect(serverUpdatedAt.current).toBe('2026-01-03T00:00:00Z');
  });

  it('fails loudly but keeps the backup when the row guard matches zero rows', async () => {
    state.current.essayRow = { data: [], error: null };
    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: {
        ...baseArgs, doc: doc('v1'), persistToEssay: true,
        serverUpdatedAtRef: { current: '2026-01-02T00:00:00Z' },
      },
    });

    await until(() => result.current.autosaveStatus === 'error');

    expect(result.current.autosaveError).toMatch(/another tab|another device/i);
    expect(inserts()).toHaveLength(1);
  });

  // WO-03 (docs/review/09-plan.md): the chip now shows the real cause —
  // Supabase errors are plain objects, and the old extraction collapsed them
  // to "Unknown error".
  it('surfaces a row-write error instead of silently claiming Saved', async () => {
    state.current.essayRow = { data: null, error: { message: 'network down' } };
    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: {
        ...baseArgs, doc: doc('v1'), persistToEssay: true,
        serverUpdatedAtRef: { current: '2026-01-02T00:00:00Z' },
      },
    });

    await until(() => result.current.autosaveStatus === 'error');
    expect(result.current.autosaveError).toBe('network down');
    expect(inserts()).toHaveLength(1);
  });

  it('never saves an empty document', async () => {
    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: { ...baseArgs, doc: doc('') && { type: 'doc', content: [] }, persistToEssay: false },
    });

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 100);

    expect(result.current.autosaveStatus).toBe('idle');
    expect(state.current.calls.filter(c => c.op !== 'select')).toHaveLength(0);
  });

  it('flush() saves immediately without waiting out the debounce', async () => {
    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: { ...baseArgs, doc: doc('v1'), persistToEssay: false },
    });

    await act(async () => { await result.current.flush(); });
    expect(inserts()).toHaveLength(1);
  });

  it('a brief-body autosave is backup-only even when told to persist the row', async () => {
    state.current.latestAll = rev({ revision_no: 5, id: 'other' });
    state.current.latestOfBody = rev({ id: 'brief-other', change_type: 'brief_autosave', created_at: new Date().toISOString() });

    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: { ...baseArgs, doc: doc('brief words'), body: 'brief' as const, persistToEssay: true },
    });

    await until(() => result.current.autosaveStatus === 'saved');

    expect(essayUpdates()).toHaveLength(0);
    expect(result.current.lastSavedTo).toBe('revision');
    expect(inserts()[0].payload).toMatchObject({ change_type: 'brief_autosave', revision_no: 6 });
  });

  it('recordRevision appends an explicit marker even inside the rollup window', async () => {
    state.current.latestOfBody = rev({
      id: 'mine', revision_no: 2, change_type: 'autosave', created_at: new Date().toISOString(),
    });

    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: { ...baseArgs, doc: doc('v1'), persistToEssay: false },
    });

    await act(() => result.current.recordRevision('publish', { status: 'published' }));

    expect(inserts()).toHaveLength(1);
    expect(inserts()[0].payload).toMatchObject({ change_type: 'publish', status: 'published' });
    expect(revisionUpdates()).toHaveLength(0);
    expect(result.current.lastSavedTo).toBe('essay');
    expect(result.current.autosaveStatus).toBe('saved');
  });

  // WO-04 (docs/review/09-plan.md): a second flush while a guarded row write
  // is mid-flight must WAIT for it — a manual save that raced its own tab's
  // autosave guarded on a stale updated_at and blamed "another tab".
  it('flush() settles an in-flight save before returning', async () => {
    let release!: () => void;
    state.current.essayRowGate = new Promise<void>(r => { release = r; });
    const serverUpdatedAt = { current: '2026-01-02T00:00:00Z' };
    const { result } = renderHook(props =>
      useEssayAutosave({ ...baseArgs, ...props }), {
      initialProps: {
        ...baseArgs, doc: doc('v1'), persistToEssay: true, serverUpdatedAtRef: serverUpdatedAt,
      },
    });

    let firstSettled = false;
    await act(async () => { void result.current.flush().then(() => { firstSettled = true; }); });
    await vi.advanceTimersByTimeAsync(20);
    expect(inserts()).toHaveLength(1); // backup landed; row write is parked

    let secondSettled = false;
    await act(async () => { void result.current.flush().then(() => { secondSettled = true; }); });
    await vi.advanceTimersByTimeAsync(20);
    expect(secondSettled).toBe(false); // the second flush waits out the first

    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(firstSettled).toBe(true);
    expect(secondSettled).toBe(true);
    expect(inserts()).toHaveLength(1); // the settled follow-up finds no diff — no duplicate
    expect(essayUpdates()).toHaveLength(1);
    expect(serverUpdatedAt.current).toBe('2026-01-03T00:00:00Z');
    expect(result.current.autosaveStatus).toBe('saved');
  });
});

// ---------------------------------------------------------------------------
// useDraftRecovery
// ---------------------------------------------------------------------------

describe('useDraftRecovery', () => {
  const rowDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'saved version' }] }] };

  it('offers a differing autosave of the same body as a recovery candidate', async () => {
    state.current.latestOfBody = rev({ change_type: 'autosave', content_json: doc('crashed tab text') });

    const { result } = renderHook(() => useDraftRecovery('essay-1', rowDoc, true));

    await until(() => result.current.candidate !== null);
    expect(result.current.candidate?.revision.id).toBe('rev-1');
    act(() => result.current.dismiss());
    expect(result.current.candidate).toBeNull();
  });

  it('stays quiet when the backup matches the row', async () => {
    state.current.latestOfBody = rev({ change_type: 'autosave', content_json: rowDoc });

    const { result } = renderHook(() => useDraftRecovery('essay-1', rowDoc, true));

    await vi.advanceTimersByTimeAsync(50);
    expect(result.current.candidate).toBeNull();
  });

  it('never offers an explicit-save marker, only autosaves', async () => {
    state.current.latestOfBody = rev({ change_type: 'manual_save', content_json: doc('manual text') });

    const { result } = renderHook(() => useDraftRecovery('essay-1', rowDoc, true));

    await vi.advanceTimersByTimeAsync(50);
    expect(result.current.candidate).toBeNull();
  });

  it('does not offer a brief backup to the long editor', async () => {
    state.current.latestOfBody = null; // body-scoped select returns nothing for 'long'
    state.current.latestAll = rev({ change_type: 'brief_autosave', content_json: doc('brief words') });

    const { result } = renderHook(() => useDraftRecovery('essay-1', rowDoc, true));

    await vi.advanceTimersByTimeAsync(50);
    expect(result.current.candidate).toBeNull();
  });

  // The offer is content-only ON PURPOSE. A manual save writes a
  // `manual_save` revision, so after a normal save-and-reload the newest
  // revision of the body is not an autosave and nothing is offered; an older
  // differing autosave only surfaces when that marker failed to land. A
  // recency rule against essays.updated_at was tried and rejected
  // (docs/review/claude-audit.md, WO-02): the Brief and the long body share
  // that column, and a rolled-up autosave stamps created_at from the client
  // clock, so the rule could hide a real unsaved draft. An extra banner the
  // author can dismiss is the cheaper failure.
  it('offers the differing autosave even when it predates the last save', async () => {
    state.current.latestOfBody = rev({
      change_type: 'autosave',
      content_json: doc('stale burst, saved over'),
      created_at: new Date(before - 3_600_000).toISOString(),
    });

    const { result } = renderHook(() => useDraftRecovery('essay-1', rowDoc, true));

    await until(() => result.current.candidate !== null);
    expect(result.current.candidate?.savedAt).toBe(state.current.latestOfBody!.created_at);
  });
});
