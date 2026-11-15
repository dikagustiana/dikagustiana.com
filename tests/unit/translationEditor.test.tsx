/**
 * The Indonesian version's writing surface (docs/prd/essay-language/04-PENULIS.md
 * §D6). Its promise is structural, like the Brief's GATE B2: nothing on this
 * screen can reach the English essay. These tests hold it behaviourally:
 *
 *   - the essays query never selects the long body;
 *   - opening, typing a title and saving writes only essay_translations and
 *     essay_revisions — never essays;
 *   - a translation autosave never writes the essays row, even when asked;
 *   - every revision it writes is an id_* kind.
 *
 * Supabase is an in-memory recorder; nothing touches a database.
 */
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type Call = { table: string; op: 'select' | 'update' | 'insert' | 'delete'; columns?: string; payload?: unknown };
const calls: Call[] = [];

const ESSAY = {
  id: 'e1', slug: 'an-essay', title: 'An Essay', snippet: null, section: 'next-big-thing',
  category_id: 'c1', status: 'published', published: true,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const entry: Call = { table, op: 'select' };
      calls.push(entry);
      const b: Record<string, unknown> = {};
      b.select = (cols?: string) => { if (entry.op === 'select') entry.columns = cols; return b; };
      b.update = (p: unknown) => { entry.op = 'update'; entry.payload = p; return b; };
      b.insert = (p: unknown) => { entry.op = 'insert'; entry.payload = p; return b; };
      b.delete = () => { entry.op = 'delete'; return b; };
      for (const m of ['eq', 'in', 'order', 'limit']) b[m] = () => b;
      const result = () => {
        if (table === 'essays') return { data: ESSAY, error: null };
        if (table === 'essay_translations' && entry.op === 'insert')
          return { data: { id: 't1', essay_id: 'e1', locale: 'id', title: 'Judul', published: false, published_at: null, updated_at: '2026-11-15T00:00:00Z', content_json: null, brief_json: null, presentation: null, read_time: null, snippet: null, created_at: '2026-11-15T00:00:00Z' }, error: null };
        if (table === 'essay_revisions' && entry.op === 'insert') return { data: { id: 'r-new' }, error: null };
        return { data: null, error: null };
      };
      b.maybeSingle = async () => result();
      b.single = async () => result();
      (b as { then: unknown }).then = (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
      return b;
    },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: true, user: { id: 'admin' } }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import { TranslationEditor, TRANSLATION_META_SELECT } from '@/components/translation/TranslationEditor';
import { useEssayAutosave } from '@/hooks/useEssayAutosave';

beforeEach(() => {
  calls.length = 0;
});

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TranslationEditor essaySlug="an-essay" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('the essays query', () => {
  it('never selects the English long body', () => {
    const cols = TRANSLATION_META_SELECT.split(',').map((c) => c.trim());
    expect(cols).not.toContain('content');
    expect(cols).not.toContain('content_json');
    expect(cols).not.toContain('brief_json');
  });
});

describe('TranslationEditor', () => {
  it('open → title → Save writes the translation and id_* revisions, never essays', async () => {
    renderEditor();
    const title = await screen.findByLabelText('Indonesian title');
    fireEvent.change(title, { target: { value: 'Judul' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(calls.some((c) => c.table === 'essay_translations' && c.op === 'insert')).toBe(true));
    await waitFor(() => expect(calls.some((c) => c.table === 'essay_revisions' && c.op === 'insert')).toBe(true));

    const essayCalls = calls.filter((c) => c.table === 'essays');
    expect(essayCalls.length).toBeGreaterThan(0);
    for (const c of essayCalls) {
      expect(c.op).toBe('select');
      expect(c.columns).toBe(TRANSLATION_META_SELECT);
    }

    const insert = calls.find((c) => c.table === 'essay_translations' && c.op === 'insert')!;
    expect(insert.payload).toMatchObject({ essay_id: 'e1', locale: 'id', title: 'Judul' });
    // A first save is a draft: nothing here publishes by saving.
    expect((insert.payload as { published?: boolean }).published).toBeUndefined();

    for (const r of calls.filter((c) => c.table === 'essay_revisions' && c.op === 'insert')) {
      expect((r.payload as { change_type: string }).change_type).toMatch(/^id_/);
    }
  });

  it('Publish is unavailable before the first save', async () => {
    renderEditor();
    await screen.findByLabelText('Indonesian title');
    expect((screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('translation autosave', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Isi.' }] }] };

  for (const body of ['id_long', 'id_brief'] as const) {
    it(`${body}: backup only, even with persistToEssay, under its own change type`, async () => {
      vi.useFakeTimers();
      try {
        renderHook(() =>
          useEssayAutosave({
            essayId: 'e1', title: 'Judul', sectionId: 'next-big-thing', categoryId: 'c1', snippet: null,
            status: 'draft', doc, enabled: true, persistToEssay: true, body,
          }),
        );
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
      } finally {
        vi.useRealTimers();
      }
      expect(calls.filter((c) => c.table === 'essays' && c.op !== 'select')).toEqual([]);
      const inserts = calls.filter((c) => c.table === 'essay_revisions' && c.op === 'insert');
      expect(inserts.length).toBe(1);
      expect((inserts[0].payload as { change_type: string }).change_type).toBe(body === 'id_long' ? 'id_autosave' : 'id_brief_autosave');
    });
  }
});
