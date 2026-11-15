/**
 * The `EN · ID` toggle in both article shells
 * (docs/prd/essay-language/03-PEMBACA.md §C5).
 *
 * The first promise is the one that protects every live essay: a shell given
 * no `translation`, or a translation that is not a published version, renders
 * exactly what it rendered before. The rest is the toggle's behaviour.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { ComponentType, ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';

vi.mock('@/integrations/supabase/client', () => {
  const list = Promise.resolve({ data: [], error: null });
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'is', 'filter', 'not']) builder[m] = () => builder;
  builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
  (builder as { then: unknown }).then = list.then.bind(list);
  return { supabase: { from: () => builder } };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import { ArticleShell } from '@/components/editorial/ArticleShell';
import { LongformArticleShell } from '@/components/editorial/LongformArticleShell';
import type { TranslationState } from '@/components/editorial/useEssayLanguageView';
import type { EssayTranslation } from '@/lib/essayLanguage';

const doc = (...paragraphs: string[]): JSONContent => ({
  type: 'doc',
  content: paragraphs.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
});

const translationRow = (over: Partial<EssayTranslation> = {}): EssayTranslation => ({
  essay_id: 'e1',
  locale: 'id',
  title: 'Judul Indonesia',
  snippet: null,
  content_json: doc('Isi panjang berbahasa Indonesia.'),
  brief_json: doc('Isi ringkas berbahasa Indonesia.'),
  presentation: { deck: 'Dek Indonesia', key_takeaways: ['Poin satu'] },
  read_time: null,
  published: true,
  ...over,
});

const ready = (data: EssayTranslation | null): TranslationState => ({ data, loading: false });

const baseProps = {
  seoTitle: 'English Title',
  slug: 'an-essay',
  backLink: { label: 'Back', path: '/' },
  title: 'English Title',
  deck: 'English deck',
  content: JSON.stringify(doc('English long body.')),
  keyTakeaways: ['English point'],
};

/** Shows the current address so a test can read `?lang=`. */
function Address() {
  const l = useLocation();
  return <output data-testid="address">{l.pathname + l.search + l.hash}</output>;
}

type Shell = ComponentType<Record<string, unknown>>;

function renderShell(Shell: Shell, props: Record<string, unknown>, at = '/essays/an-essay') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[at]}>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <Shell {...baseProps} {...props} />
                  <Address />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

const shells: [string, Shell][] = [
  ['ArticleShell', ArticleShell as unknown as Shell],
  ['LongformArticleShell', LongformArticleShell as unknown as Shell],
];

describe.each(shells)('%s', (_name, Shell) => {
  it('no translation prop: no language toggle, English only, ?lang ignored', () => {
    renderShell(Shell, {}, '/essays/an-essay?lang=id');
    expect(screen.queryByTestId('essay-language-toggle')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('English Title');
    expect(screen.getByText('English long body.')).toBeTruthy();
  });

  it('no published translation: no toggle, and the markup is the same as without the prop', () => {
    const a = renderShell(Shell, {});
    const before = a.container.querySelector('main')!.innerHTML;
    a.unmount();
    const b = renderShell(Shell, { translation: ready(translationRow({ published: false })) });
    expect(screen.queryByTestId('essay-language-toggle')).toBeNull();
    expect(b.container.querySelector('main')!.innerHTML).toBe(before);
  });

  it('a published translation shows EN · ID, English selected', () => {
    renderShell(Shell, { translation: ready(translationRow()) });
    const group = screen.getByTestId('essay-language-toggle');
    expect(within(group).getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(group).getByRole('button', { name: 'Bahasa Indonesia' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('English long body.')).toBeTruthy();
  });

  it('choosing ID swaps title, deck, body and takeaways, marks lang, and writes ?lang=id', () => {
    renderShell(Shell, { translation: ready(translationRow()) });
    fireEvent.click(screen.getByRole('button', { name: 'Bahasa Indonesia' }));
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Judul Indonesia');
    expect(h1.closest('[lang="id"]')).toBeTruthy();
    expect(screen.getByText('Dek Indonesia')).toBeTruthy();
    const body = screen.getByText('Isi panjang berbahasa Indonesia.');
    expect(body.closest('[lang="id"]')).toBeTruthy();
    expect(screen.queryByText('English long body.')).toBeNull();
    expect(screen.queryByText('English point')).toBeNull();
    expect(screen.getByText('Poin satu')).toBeTruthy();
    expect(screen.getByTestId('address').textContent).toBe('/essays/an-essay?lang=id');
  });

  it('opening ?lang=id shows Indonesian; choosing EN removes the parameter', () => {
    renderShell(Shell, { translation: ready(translationRow()) }, '/essays/an-essay?lang=id#part-2');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Judul Indonesia');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('English Title');
    expect(screen.getByTestId('address').textContent).toBe('/essays/an-essay#part-2');
  });

  it('?lang=id on an essay with no Indonesian version: English, parameter dropped', () => {
    renderShell(Shell, { translation: ready(null) }, '/essays/an-essay?lang=id');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('English Title');
    expect(screen.getByTestId('address').textContent).toBe('/essays/an-essay');
  });

  it('?lang=id while the translation loads: no English flash', () => {
    renderShell(Shell, { translation: { data: null, loading: true } }, '/essays/an-essay?lang=id');
    expect(screen.queryByText('English long body.')).toBeNull();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('a Brief-only translation: ID shows the Brief and no Full · Brief toggle', () => {
    renderShell(Shell, { translation: ready(translationRow({ content_json: null })), brief: doc('English brief.') });
    expect(screen.getByTestId('essay-view-toggle')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bahasa Indonesia' }));
    expect(screen.getByText('Isi ringkas berbahasa Indonesia.')).toBeTruthy();
    expect(screen.queryByTestId('essay-view-toggle')).toBeNull();
  });

  it('the view survives a language switch when the other language has it', () => {
    renderShell(Shell, { translation: ready(translationRow()), brief: doc('English brief.') });
    fireEvent.click(screen.getByRole('button', { name: 'Brief' }));
    expect(screen.getByText('English brief.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bahasa Indonesia' }));
    expect(screen.getByText('Isi ringkas berbahasa Indonesia.')).toBeTruthy();
  });

  it('from ID Brief back to an English essay with no Brief → English Full', () => {
    renderShell(Shell, { translation: ready(translationRow()) });
    fireEvent.click(screen.getByRole('button', { name: 'Bahasa Indonesia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Brief' }));
    expect(screen.getByText('Isi ringkas berbahasa Indonesia.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByText('English long body.')).toBeTruthy();
  });
});
