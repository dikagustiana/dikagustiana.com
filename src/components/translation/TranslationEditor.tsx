/**
 * TranslationEditor — where the owner writes an essay's Indonesian version
 * (docs/prd/essay-language/04-PENULIS.md).
 *
 * Same discipline as the Brief's surface (src/components/brief/BriefEditor.tsx):
 *
 *   - It never loads the English long body. The essay query selects metadata
 *     only; `content` and `content_json` are absent by type. The English essay
 *     is one click away on its public page, in another tab.
 *   - Its only writes are to `essay_translations` and to `essay_revisions`
 *     (as id_* kinds). Nothing here updates `essays`. A stray keystroke on this
 *     screen cannot reach the English essay.
 *   - Autosave is backup-only, for both bodies, whatever the row's status: the
 *     Brief's one uniform rule. Save writes the row, guarded on updated_at.
 *   - Recovery is offered per body, never applied.
 *
 * Nothing here translates, summarises or suggests text. The translation is the
 * owner's writing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EssayEditor, type EditorSurface } from '@/components/editorial/EssayEditor';
import { EditorToolbar } from '@/components/editorial/toolbar/EditorToolbar';
import { LinkPopover, type LinkPopoverState } from '@/components/editorial/toolbar/LinkPopover';
import { getBriefExtensions } from '@/lib/tiptap/extensions';
import { transformPastedHTML } from '@/lib/tiptap/pasteFromWord';
import { tiptapJsonToHtml } from '@/lib/tiptap/serialize';
import { BRIEF_TARGET_MAX, BRIEF_TARGET_MIN, briefWordCount, isEmptyBrief, parseBriefDoc } from '@/lib/brief';
import { docsDiffer, isEmptyDoc } from '@/lib/revisions';
import { universalEssayUrl } from '@/lib/essayUrl';
import {
  canPublishTranslation,
  presentationFromForm,
  translationFormFromRow,
  type TranslationForm,
} from '@/lib/translationForm';
import { useEssayAutosave, useDraftRecovery } from '@/hooks/useEssayAutosave';
import { cn } from '@/lib/utils';
import { ArrowLeft, Bold, CloudOff, ExternalLink, History, Italic, Link2, Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TranslationRow = Database['public']['Tables']['essay_translations']['Row'];

/** The essay as this surface sees it. The long body is absent BY TYPE. */
interface EssayMeta {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  section: string;
  category_id: string;
  status: string | null;
  published: boolean | null;
}

export const TRANSLATION_META_SELECT = 'id, slug, title, snippet, section, category_id, status, published';

type Body = 'full' | 'brief';

export function TranslationEditor({ essaySlug }: { essaySlug: string }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [essay, setEssay] = useState<EssayMeta | null>(null);
  const [row, setRow] = useState<TranslationRow | null>(null);
  const [state, setState] = useState<'loading' | 'failed' | 'ready'>('loading');
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setState('loading');
      const e = await supabase.from('essays').select(TRANSLATION_META_SELECT).eq('slug', essaySlug).maybeSingle();
      if (cancelled) return;
      if (e.error) {
        setFailure(e.error.message);
        setState('failed');
        return;
      }
      if (!e.data) {
        setEssay(null);
        setState('ready');
        return;
      }
      const t = await supabase
        .from('essay_translations')
        .select('*')
        .eq('essay_id', e.data.id)
        .eq('locale', 'id')
        .maybeSingle();
      if (cancelled) return;
      if (t.error) {
        setFailure(t.error.message);
        setState('failed');
        return;
      }
      setEssay(e.data as EssayMeta);
      setRow((t.data as TranslationRow | null) ?? null);
      setState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [essaySlug]);

  if (!isAdmin) return <Navigate to="/auth" replace />;

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Couldn't load the Indonesian version. If the database has not been given the
          <code className="mx-1">essay_translations</code> table yet, this page cannot work until it is.
        </p>
        {failure && <p className="max-w-md text-xs text-muted-foreground/80">{failure}</p>}
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!essay) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">No essay with this address.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/content">Back to the Writer's Desk</Link>
        </Button>
      </div>
    );
  }

  return (
    <TranslationCanvas
      essay={essay}
      initialRow={row}
      onSaved={() => {
        void queryClient.invalidateQueries({ queryKey: ['essay-translation', essay.id] });
        void queryClient.invalidateQueries({ queryKey: ['translation-status'] });
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Canvas — mounted once both rows are loaded, so each editor is created with
// its initial document.
// ---------------------------------------------------------------------------

function TranslationCanvas({
  essay,
  initialRow,
  onSaved,
}: {
  essay: EssayMeta;
  initialRow: TranslationRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [row, setRow] = useState<TranslationRow | null>(initialRow);
  const serverUpdatedAtRef = useRef<string | null>(initialRow?.updated_at ?? null);

  const [form, setForm] = useState<TranslationForm>(() => translationFormFromRow(initialRow));
  const [longDoc, setLongDoc] = useState<JSONContent | null>(() => parseBriefDoc(initialRow?.content_json));
  const [longHtml, setLongHtml] = useState<string>(() => {
    const d = parseBriefDoc(initialRow?.content_json);
    return d ? tiptapJsonToHtml(d) : '';
  });
  const [briefDoc, setBriefDoc] = useState<JSONContent | null>(() => parseBriefDoc(initialRow?.brief_json));
  const [dirty, setDirty] = useState({ meta: false, full: false, brief: false });
  const isDirty = dirty.meta || dirty.full || dirty.brief;
  const [busy, setBusy] = useState<null | 'save' | 'publish' | 'unpublish'>(null);
  const [tab, setTab] = useState<Body>('full');
  const [surface, setSurface] = useState<EditorSurface | null>(null);

  const setField = <K extends keyof TranslationForm>(key: K, value: TranslationForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty((d) => ({ ...d, meta: true }));
  };

  // ── Autosave: backup-only, one hook per body, each in its own namespace. ──
  const revisionTitle = form.title.trim() || essay.title;
  const status = row?.published ? 'published' : 'draft';
  const common = {
    essayId: essay.id,
    title: revisionTitle,
    sectionId: essay.section,
    categoryId: essay.category_id,
    snippet: form.snippet.trim() || null,
    status,
    persistToEssay: false,
    enabled: busy == null,
  } as const;
  const fullSave = useEssayAutosave({ ...common, doc: longDoc, body: 'id_long' });
  const briefSave = useEssayAutosave({ ...common, doc: briefDoc, body: 'id_brief' });

  // ── Recovery, per body. ──
  const fullRecovery = useDraftRecovery(essay.id, parseBriefDoc(initialRow?.content_json), true, 'id_long');
  const briefRecovery = useDraftRecovery(essay.id, parseBriefDoc(initialRow?.brief_json), true, 'id_brief');

  // ── The Brief editor (restricted schema, same as the English Brief). ──
  const briefExtensions = useMemo(
    () => getBriefExtensions({ placeholder: 'Ringkasan dalam 500–600 kata prosa mengalir.' }),
    [],
  );
  const initialBrief = useRef(briefDoc);
  const briefEditor = useEditor({
    extensions: briefExtensions,
    content: initialBrief.current ?? '',
    onUpdate: ({ editor: e }) => {
      setBriefDoc(e.getJSON());
      setDirty((d) => ({ ...d, brief: true }));
    },
    editorProps: {
      transformPastedHTML,
      attributes: { class: 'essay-prose brief-prose focus:outline-none', 'aria-label': 'Indonesian Brief text', lang: 'id' },
    },
  });
  const briefWords = useMemo(() => briefWordCount(briefDoc), [briefDoc]);

  const restoreFull = useCallback(() => {
    const doc = fullRecovery.candidate?.revision.content_json as JSONContent | null | undefined;
    if (!doc) return;
    setLongHtml(tiptapJsonToHtml(doc)); // EssayEditor syncs from `content` and pushes the JSON back
    setLongDoc(doc);
    setDirty((d) => ({ ...d, full: true }));
    fullRecovery.dismiss();
    setTab('full');
    toast({ title: 'Full text recovered', description: 'The backed-up version is loaded. Save to keep it.' });
  }, [fullRecovery, toast]);

  const restoreBrief = useCallback(() => {
    const doc = briefRecovery.candidate?.revision.content_json as JSONContent | null | undefined;
    if (!doc || !briefEditor) return;
    briefEditor.commands.setContent(doc, { emitUpdate: false });
    setBriefDoc(doc);
    setDirty((d) => ({ ...d, brief: true }));
    briefRecovery.dismiss();
    setTab('brief');
    toast({ title: 'Brief recovered', description: 'The backed-up version is loaded. Save to keep it.' });
  }, [briefRecovery, briefEditor, toast]);

  // Last line of defence on tab close.
  useEffect(() => {
    const handler = () => {
      void fullSave.flush();
      void briefSave.flush();
    };
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [fullSave, briefSave]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const longValue = longDoc && !isEmptyDoc(longDoc) ? longDoc : null;
  const briefValue = briefDoc && !isEmptyBrief(briefDoc) ? briefDoc : null;

  const staleToast = () =>
    toast({
      title: 'Not saved — this version changed somewhere else',
      description: 'Another tab or device saved a newer version. Reload to get it; your text here is untouched until you do.',
      variant: 'destructive',
    });

  /**
   * Write the translation row. Creates it on first save (as a draft), else
   * updates it guarded on updated_at. Returns the written row, or null when
   * the guard matched nothing (a newer save exists) or the write failed.
   */
  const writeRow = async (patch: Partial<TranslationRow>): Promise<TranslationRow | null> => {
    if (!row) {
      const { data, error } = await supabase
        .from('essay_translations')
        .insert({ essay_id: essay.id, locale: 'id', title: form.title.trim(), ...patch } as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as TranslationRow;
    }
    let q = supabase
      .from('essay_translations')
      .update({ ...patch, updated_at: new Date().toISOString() } as never)
      .eq('id', row.id);
    if (serverUpdatedAtRef.current) q = q.eq('updated_at', serverUpdatedAtRef.current);
    const { data, error } = await q.select('*');
    if (error) throw error;
    if (!data || data.length === 0) {
      staleToast();
      return null;
    }
    return data[0] as TranslationRow;
  };

  const settle = (written: TranslationRow) => {
    setRow(written);
    serverUpdatedAtRef.current = written.updated_at;
    onSaved();
  };

  const fail = (what: string, error: unknown) =>
    toast({
      title: `Error ${what}`,
      description: error instanceof Error ? error.message : ((error as { message?: string })?.message ?? 'Unknown error'),
      variant: 'destructive',
    });

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'The Indonesian title is required', variant: 'destructive' });
      return;
    }
    setBusy('save');
    try {
      const written = await writeRow({
        title: form.title.trim(),
        snippet: form.snippet.trim() || null,
        presentation: presentationFromForm(form) as never,
        read_time: form.readTime.trim() || null,
        content_json: longValue as never,
        brief_json: briefValue as never,
      });
      if (!written) return;
      settle(written);
      const was = dirty;
      setDirty({ meta: false, full: false, brief: false });
      toast({ title: 'Indonesian version saved', description: written.published ? 'It is live.' : 'Still a draft — readers do not see it.' });
      if (was.full || !initialRow) await fullSave.recordRevision('id_manual_save', { doc: longValue });
      if (was.brief) await briefSave.recordRevision('id_brief_manual_save', { doc: briefValue });
    } catch (error) {
      fail('saving', error);
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async (publish: boolean) => {
    if (!row) return;
    setBusy(publish ? 'publish' : 'unpublish');
    try {
      const written = await writeRow(
        publish ? { published: true, published_at: row.published_at ?? new Date().toISOString() } : { published: false },
      );
      if (!written) return;
      settle(written);
      toast({ title: publish ? 'Indonesian version published' : 'Indonesian version taken down' });
      await fullSave.recordRevision(publish ? 'id_publish' : 'id_unpublish', { doc: longValue, status: publish ? 'published' : 'draft' });
    } catch (error) {
      fail(publish ? 'publishing' : 'taking down', error);
    } finally {
      setBusy(null);
    }
  };

  const publishCheck = canPublishTranslation({ saved: !!row && !isDirty, title: form.title, hasFull: !!longValue, hasBrief: !!briefValue });
  const englishUrl = universalEssayUrl(essay.slug);
  const autosave = tab === 'full' ? fullSave : briefSave;

  // Brief toolbar state.
  const [linkState, setLinkState] = useState<LinkPopoverState | null>(null);
  const marks = useEditorState({
    editor: briefEditor,
    selector: ({ editor: e }) => ({ bold: !!e?.isActive('bold'), italic: !!e?.isActive('italic'), link: !!e?.isActive('link') }),
  });
  const keepSelection = (e: React.MouseEvent) => e.preventDefault();
  const openLinkPopover = useCallback(() => {
    if (!briefEditor) return;
    const existingHref = (briefEditor.getAttributes('link').href as string | undefined) ?? '';
    if (existingHref) briefEditor.chain().extendMarkRange('link').run();
    const { from, to } = briefEditor.state.selection;
    const coords = briefEditor.view.coordsAtPos(from);
    setLinkState({ from, to, left: coords.left, top: coords.bottom, initialText: briefEditor.state.doc.textBetween(from, to, ' '), initialUrl: existingHref });
  }, [briefEditor]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ── Top bar ── */}
      <header className="flex-shrink-0 border-b border-border/60 bg-background">
        <div className="mx-auto flex min-h-12 w-full max-w-[52rem] flex-wrap items-center justify-between gap-2 px-4 py-1.5">
          <Button asChild variant="ghost" size="sm" className="-ml-2 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground">
            <Link to="/admin/content">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Writer's Desk</span>
              <span className="sr-only sm:hidden">Writer's Desk</span>
            </Link>
          </Button>

          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground" data-testid="translation-status">
            <span>Indonesian</span>
            <span aria-hidden>·</span>
            <span className={cn(row?.published ? 'font-medium text-foreground' : '')}>
              {row ? (row.published ? 'Live' : 'Draft') : 'Not saved yet'}
            </span>
            <span aria-hidden>·</span>
            {autosave.autosaveStatus === 'error' ? (
              <span className="flex items-center gap-1 font-medium text-destructive" title={autosave.autosaveError ?? undefined}>
                <CloudOff className="h-3.5 w-3.5" />
                Backup failed
              </span>
            ) : autosave.autosaveStatus === 'saving' ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Backing up…
              </span>
            ) : isDirty ? (
              <span>Unsaved{autosave.lastBackupAt ? ', backed up' : ''}</span>
            ) : (
              <span>Saved</span>
            )}
          </span>

          <div className="flex shrink-0 items-center gap-2">
            {row?.published ? (
              <Button size="sm" variant="outline" disabled={busy != null} onClick={() => void handlePublish(false)}>
                {busy === 'unpublish' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Take down'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy != null || !publishCheck.ok}
                title={publishCheck.ok ? undefined : publishCheck.reason}
                onClick={() => void handlePublish(true)}
              >
                {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
              </Button>
            )}
            <Button size="sm" className="px-3" disabled={busy != null || !isDirty} onClick={() => void handleSave()}>
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body tabs, and the toolbar of the body in front. ── */}
      <div className="flex-shrink-0 border-b border-border/60 bg-background">
        <div className="mx-auto flex h-10 w-full max-w-[52rem] items-center justify-between gap-2 px-4">
          <div role="tablist" aria-label="Indonesian body" className="flex items-center gap-1 text-sm">
            {(['full', 'brief'] as const).map((b) => (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={tab === b}
                onClick={() => setTab(b)}
                className={cn(
                  'rounded-sm px-2 py-1 transition-colors',
                  tab === b ? 'font-semibold text-foreground underline decoration-2 underline-offset-[6px]' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {b === 'full' ? 'Full' : 'Brief'}
                {(b === 'full' ? longValue : briefValue) ? '' : ' (empty)'}
              </button>
            ))}
          </div>
          {tab === 'brief' ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5" role="toolbar" aria-label="Brief formatting">
                <Button type="button" variant="ghost" size="sm" aria-label="Bold" aria-pressed={marks?.bold} className={cn('h-8 w-8 p-0', marks?.bold && 'bg-secondary text-foreground')} onMouseDown={keepSelection} onClick={() => briefEditor?.chain().focus().toggleBold().run()}>
                  <Bold className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" aria-label="Italic" aria-pressed={marks?.italic} className={cn('h-8 w-8 p-0', marks?.italic && 'bg-secondary text-foreground')} onMouseDown={keepSelection} onClick={() => briefEditor?.chain().focus().toggleItalic().run()}>
                  <Italic className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" aria-label="Link" aria-pressed={marks?.link} className={cn('h-8 w-8 p-0', marks?.link && 'bg-secondary text-foreground')} onMouseDown={keepSelection} onClick={openLinkPopover}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
              <span className={cn('whitespace-nowrap text-xs tabular-nums', briefWords >= BRIEF_TARGET_MIN && briefWords <= BRIEF_TARGET_MAX ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {briefWords} {briefWords === 1 ? 'word' : 'words'}
                <span className="text-muted-foreground"> · target {BRIEF_TARGET_MIN}–{BRIEF_TARGET_MAX}</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {tab === 'full' && surface && <EditorToolbar editor={surface.editor} insertOptions={surface.insertOptions} className="flex-shrink-0" />}

      {/* Recovery banners — offered, never applied. */}
      {[
        { c: fullRecovery.candidate, label: 'Full text', restore: restoreFull, dismiss: fullRecovery.dismiss },
        { c: briefRecovery.candidate, label: 'Brief', restore: restoreBrief, dismiss: briefRecovery.dismiss },
      ].map(
        ({ c, label, restore, dismiss }) =>
          c && (
            <div key={label} className="flex-shrink-0 border-b border-border bg-amber-50 px-4 py-3">
              <Alert className="mx-auto max-w-[52rem] border-0 bg-transparent p-0">
                <History className="h-4 w-4" />
                <AlertTitle>Unsaved Indonesian {label.toLowerCase()} recovered from backup</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  <span>A backup from {new Date(c.savedAt).toLocaleString()} differs from the saved one.</span>
                  <span className="flex items-center gap-2">
                    <Button size="sm" onClick={restore}>Restore backup</Button>
                    <Button size="sm" variant="ghost" onClick={dismiss}>Keep saved version</Button>
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          ),
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[52rem] px-4 pb-32 pt-8">
          <div className="editorial-column" lang="id">
            {/* Context: which essay, and where to read the English. */}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" lang="en">
              <span className="font-semibold uppercase tracking-[0.2em]">Indonesian version</span>
              <span>of “{essay.title}”</span>
              <a href={englishUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                Open the English essay <ExternalLink className="h-3 w-3" />
              </a>
              {row?.published && (
                <a href={`${englishUrl}?lang=id`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                  View it live <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>

            <label className="sr-only" htmlFor="tr-title">Indonesian title</label>
            <input
              id="tr-title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Judul"
              className="editorial-title mt-4 w-full bg-transparent focus:outline-none"
            />
            <label className="sr-only" htmlFor="tr-deck">Indonesian deck</label>
            <Textarea
              id="tr-deck"
              value={form.deck}
              onChange={(e) => setField('deck', e.target.value)}
              placeholder="Dek (opsional; kosong = dek bahasa Inggris)"
              rows={2}
              className="editorial-subtitle mt-3 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
            />

            <details className="mt-4 rounded-md border border-border/60 px-4 py-3" lang="en">
              <summary className="cursor-pointer text-sm text-muted-foreground">Details: snippet, key takeaways, caption, revision note, read time</summary>
              <div className="mt-4 grid gap-4" lang="id">
                <Field label="Snippet (cards and search descriptions)" htmlFor="tr-snippet">
                  <Textarea id="tr-snippet" rows={2} value={form.snippet} onChange={(e) => setField('snippet', e.target.value)} />
                </Field>
                <Field label="Key takeaways, one per line (empty = none shown in Indonesian)" htmlFor="tr-takeaways">
                  <Textarea id="tr-takeaways" rows={4} value={form.keyTakeaways} onChange={(e) => setField('keyTakeaways', e.target.value)} />
                </Field>
                <Field label="Hero caption (empty = English caption)" htmlFor="tr-caption">
                  <Input id="tr-caption" value={form.heroCaption} onChange={(e) => setField('heroCaption', e.target.value)} />
                </Field>
                <Field label="Revision note (empty = English note)" htmlFor="tr-revision">
                  <Textarea id="tr-revision" rows={2} value={form.revisionNote} onChange={(e) => setField('revisionNote', e.target.value)} />
                </Field>
                <Field label="Read time (empty = English read time)" htmlFor="tr-readtime">
                  <Input id="tr-readtime" value={form.readTime} onChange={(e) => setField('readTime', e.target.value)} placeholder="mis. 12 menit" />
                </Field>
              </div>
            </details>

            {/* Both editors stay mounted, so switching tabs keeps each one's
                selection and undo history; the hidden one is out of the way. */}
            <div className="mt-8 border-t border-border pt-8" hidden={tab !== 'full'}>
              <EssayEditor
                content={longHtml}
                onChange={(html) => {
                  setLongHtml(html);
                }}
                onChangeJson={(json) => {
                  setLongDoc(json);
                  setDirty((d) => (docChanged(json, initialRow?.content_json) || d.full ? { ...d, full: true } : d));
                }}
                onSurfaceChange={setSurface}
                section={essay.section as 'finance' | 'green-transition' | 'next-big-thing'}
                placeholder="Tulis versi panjang di sini, atau tempel dari Word."
                minHeight="55vh"
              />
            </div>
            <div className="mt-8 border-t border-border pt-8" hidden={tab !== 'brief'}>
              <EditorContent editor={briefEditor} />
            </div>
          </div>
        </div>
      </div>

      {briefEditor && linkState && <LinkPopover editor={briefEditor} state={linkState} onClose={() => setLinkState(null)} />}

      <style>{`
        .brief-prose { min-height: 50vh; }
        .brief-prose p.is-empty:first-child::before,
        .brief-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.6);
          pointer-events: none;
          height: 0;
        }
        .brief-prose a { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
    </div>
  );
}

/**
 * EssayEditor pushes its JSON on load as well as on edits (its sync effect),
 * so "changed" is judged against the stored document, not against "an
 * onChangeJson happened" — opening the page must not mark it unsaved.
 */
function docChanged(json: JSONContent, stored: unknown): boolean {
  const sd = parseBriefDoc(stored);
  // Key order ignored: jsonb does not keep it (revisions.ts canonicalJson).
  return docsDiffer(isEmptyDoc(json) ? null : json, sd && !isEmptyDoc(sd) ? sd : null);
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground" lang="en">
        {label}
      </Label>
      {children}
    </div>
  );
}
