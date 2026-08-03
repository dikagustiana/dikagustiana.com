/**
 * BriefEditor — the dedicated writing surface for an essay's Brief companion.
 *
 * A Brief is written days after the long essay is published, and will be 161
 * times. This surface exists so that routine never opens the published body
 * for editing: the essay query here selects METADATA ONLY — `content` and
 * `content_json` are not fetched, not held in state, not on screen — and the
 * one write this file performs updates `brief_json` and nothing else. GATE B2
 * (docs/GATE_LEDGER.md) verifies behaviourally what is structural here: a
 * stray keystroke on this screen cannot reach the long essay. The absence is
 * also the exercise: with the long version not on screen, the Brief is
 * compressed from understanding, not whittled down by copy-paste
 * (docs/DECISIONS.md, delegated decision 1).
 *
 * The word count is live and the 500–600 target is stated, because the
 * target is the constraint and the constraint is the task. (The long canvas
 * deliberately shows NO count — it has no target. Do not converge the two;
 * the reconciliation is recorded in docs/DECISIONS.md.)
 *
 * There is deliberately no summarise button, no AI assist, no
 * generate-from-long action here — a machine-written Brief has no value at
 * all, and a shortcut that exists will be used (GATE B7 greps this file).
 *
 * Save semantics match the published-essay rule regardless of essay status:
 * autosave is backup-only (`brief_autosave` revisions), an explicit Save
 * writes the row, guarded on updated_at so a stale tab loses loudly.
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getBriefExtensions } from '@/lib/tiptap/extensions';
import { transformPastedHTML } from '@/lib/tiptap/pasteFromWord';
import {
  BRIEF_TARGET_MAX,
  BRIEF_TARGET_MIN,
  briefWordCount,
  isEmptyBrief,
  parseBriefDoc,
} from '@/lib/brief';
import { useEssayAutosave, useDraftRecovery } from '@/hooks/useEssayAutosave';
import { LinkPopover, type LinkPopoverState } from '@/components/editorial/toolbar/LinkPopover';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Bold,
  CloudOff,
  History,
  Italic,
  Link2,
  Loader2,
} from 'lucide-react';

/**
 * The essay row as this surface sees it. The long body is absent BY TYPE:
 * adding `content` here is the change decision 1 forbids.
 */
interface BriefEssayMeta {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  section: string;
  category_id: string;
  status: string | null;
  published: boolean | null;
  date: string | null;
  updated_at: string;
  brief_json: unknown;
}

const META_SELECT =
  'id, slug, title, snippet, section, category_id, status, published, date, updated_at, brief_json';

interface BriefEditorProps {
  essaySlug: string;
}

export function BriefEditor({ essaySlug }: BriefEditorProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [essay, setEssay] = useState<BriefEssayMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const serverUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setLoadFailed(false);
      const { data, error } = await supabase
        .from('essays')
        .select(META_SELECT)
        .eq('slug', essaySlug)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadFailed(true);
      } else if (data) {
        setEssay(data as BriefEssayMeta);
        serverUpdatedAtRef.current = data.updated_at;
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [essaySlug]);

  if (!isAdmin) return <Navigate to="/auth" replace />;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn't load this essay — the essay is still there; this page just couldn't reach
          the database.
        </p>
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

  return <BriefCanvas essay={essay} serverUpdatedAtRef={serverUpdatedAtRef} onSaved={() => {
    void queryClient.invalidateQueries({ queryKey: ['brief-queue'] });
    void queryClient.invalidateQueries({ queryKey: ['essay-by-slug', essay.slug] });
  }} />;
}

// ---------------------------------------------------------------------------
// Canvas — mounted only once the essay row is loaded, so the editor is
// created WITH its initial document and never needs external content pushed
// in (the sync-mirror machinery the long editor carries does not exist here).
// ---------------------------------------------------------------------------

function BriefCanvas({
  essay,
  serverUpdatedAtRef,
  onSaved,
}: {
  essay: BriefEssayMeta;
  serverUpdatedAtRef: { current: string | null };
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [doc, setDoc] = useState<JSONContent | null>(() => parseBriefDoc(essay.brief_json));
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [linkState, setLinkState] = useState<LinkPopoverState | null>(null);

  const extensions = useMemo(
    () =>
      getBriefExtensions({
        placeholder:
          'Explain the same thing the long essay explains — in 500–600 words of flowing prose.',
      }),
    [],
  );

  const initialDoc = useRef(doc);
  const editor = useEditor({
    extensions,
    content: initialDoc.current ?? '',
    onUpdate: ({ editor: e }) => {
      setDoc(e.getJSON());
      setIsDirty(true);
    },
    editorProps: {
      // The owner writes in Word and pastes in; strip Word's markup noise
      // before the restricted schema drops whatever structure remains.
      transformPastedHTML,
      attributes: {
        class: 'essay-prose brief-prose focus:outline-none',
        'aria-label': 'Brief text',
      },
    },
  });

  // Live word count — the number IS the task here (target stated beside it).
  const wordCount = useMemo(() => briefWordCount(doc), [doc]);

  // Dev-only: expose the live editor so the gate harness can compare the
  // in-memory document against the stored row programmatically. Dead code in
  // production builds (import.meta.env.DEV is compile-time false there).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __briefEditor?: unknown }).__briefEditor = editor;
    return () => {
      delete (window as unknown as { __briefEditor?: unknown }).__briefEditor;
    };
  }, [editor]);

  // ── Autosave: backup-only, into brief_autosave revisions. Never the row. ──
  const {
    autosaveStatus,
    lastBackupAt,
    autosaveError,
    recordRevision,
    flush: flushAutosave,
  } = useEssayAutosave({
    essayId: essay.id,
    title: essay.title,
    sectionId: essay.section,
    categoryId: essay.category_id,
    snippet: essay.snippet,
    status: essay.status === 'published' ? 'published' : 'draft',
    doc,
    body: 'brief',
    persistToEssay: false,
    serverUpdatedAtRef,
    enabled: !isSaving,
  });

  // ── Recovery: a brief_autosave newer than the row's brief_json. ──
  const { candidate: recovery, dismiss: dismissRecovery } = useDraftRecovery(
    essay.id,
    parseBriefDoc(essay.brief_json),
    true,
    'brief',
  );

  const handleRestoreRecovery = useCallback(() => {
    const recovered = recovery?.revision.content_json as JSONContent | null | undefined;
    if (!recovered || !editor) return;
    editor.commands.setContent(recovered, { emitUpdate: false });
    setDoc(recovered);
    setIsDirty(true);
    dismissRecovery();
    toast({
      title: 'Brief draft recovered',
      description: 'The backed-up version is loaded. Save to keep it.',
    });
  }, [recovery, editor, dismissRecovery, toast]);

  // Last line of defence on tab close.
  useEffect(() => {
    const handler = () => flushAutosave();
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [flushAutosave]);

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

  /**
   * The one write this surface performs. The column set is the whole point:
   * `brief_json` — never content, never content_json, never status. Guarded
   * on updated_at so a stale tab fails loudly instead of winning silently.
   * An emptied canvas saves NULL: the Brief is deleted, the public toggle
   * disappears, the essay returns to the queue.
   */
  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      const current = editor.getJSON();
      const value = isEmptyBrief(current) ? null : current;

      let update = supabase
        .from('essays')
        .update({ brief_json: value as never, updated_at: new Date().toISOString() })
        .eq('id', essay.id);
      if (serverUpdatedAtRef.current) {
        update = update.eq('updated_at', serverUpdatedAtRef.current);
      }
      const { data: rows, error } = await update.select('updated_at');
      if (error) throw error;
      if (!rows || rows.length === 0) {
        toast({
          title: 'Not saved — this essay changed somewhere else',
          description:
            'Another tab or device saved a newer version. Reload to get it; your text here is untouched until you do.',
          variant: 'destructive',
        });
        return;
      }
      serverUpdatedAtRef.current = rows[0].updated_at;
      setIsDirty(false);
      toast({ title: value ? 'Brief saved' : 'Brief removed' });

      await recordRevision('brief_manual_save', { doc: value });
      onSaved();
    } catch (error: unknown) {
      toast({
        title: 'Error saving Brief',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openLinkPopover = useCallback(() => {
    if (!editor) return;
    const existingHref = (editor.getAttributes('link').href as string | undefined) ?? '';
    if (existingHref) {
      editor.chain().extendMarkRange('link').run();
    }
    const { from, to } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    setLinkState({
      from,
      to,
      left: coords.left,
      top: coords.bottom,
      initialText: editor.state.doc.textBetween(from, to, ' '),
      initialUrl: existingHref,
    });
  }, [editor]);

  const marks = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: !!e?.isActive('bold'),
      italic: !!e?.isActive('italic'),
      link: !!e?.isActive('link'),
    }),
  });

  // Formatting must act on the selection the writer made; a button that
  // takes focus collapses it first (same rule as the long toolbar).
  const keepSelection = (e: React.MouseEvent) => e.preventDefault();

  const inTarget = wordCount >= BRIEF_TARGET_MIN && wordCount <= BRIEF_TARGET_MAX;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ── Top bar: back, save state, Save. ── */}
      <header className="flex-shrink-0 border-b border-border/60 bg-background">
        <div className="mx-auto flex h-12 w-full max-w-[52rem] items-center justify-between gap-2 px-4 sm:gap-4">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:px-3"
          >
            <Link to="/admin/content">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Writer's Desk</span>
              <span className="sr-only sm:hidden">Writer's Desk</span>
            </Link>
          </Button>

          {/* Backup chip — never says "Saved" for text that lives only in a
              revision. The row is only touched by the Save button. */}
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span>Brief</span>
            <span aria-hidden>·</span>
            {autosaveStatus === 'error' ? (
              <span
                className="flex items-center gap-1 font-medium text-destructive"
                title={autosaveError ?? undefined}
              >
                <CloudOff className="h-3.5 w-3.5" />
                Backup failed
              </span>
            ) : autosaveStatus === 'saving' ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Backing up…
              </span>
            ) : isDirty && autosaveStatus === 'unsaved' ? (
              <span>Unsaved</span>
            ) : lastBackupAt ? (
              <span className="truncate">
                Backed up
                <span className="hidden sm:inline">
                  {' '}
                  {lastBackupAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            ) : isDirty ? (
              <span>Unsaved</span>
            ) : (
              <span>Idle</span>
            )}
          </span>

          <Button
            size="sm"
            className="shrink-0 px-3"
            onClick={() => void handleSave()}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </header>

      {/* ── Formatting bar: the whole permitted vocabulary — bold, italic,
             link — plus the live count against its stated target. There is
             no insert menu, no slash command, no block palette: a Brief has
             nothing to insert. ── */}
      <div className="flex-shrink-0 border-b border-border/60 bg-background">
        <div className="mx-auto flex h-10 w-full max-w-[52rem] items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-0.5" role="toolbar" aria-label="Brief formatting">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Bold"
              aria-pressed={marks?.bold}
              className={cn('h-8 w-8 p-0', marks?.bold && 'bg-secondary text-foreground')}
              onMouseDown={keepSelection}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Italic"
              aria-pressed={marks?.italic}
              className={cn('h-8 w-8 p-0', marks?.italic && 'bg-secondary text-foreground')}
              onMouseDown={keepSelection}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Link"
              aria-pressed={marks?.link}
              className={cn('h-8 w-8 p-0', marks?.link && 'bg-secondary text-foreground')}
              onMouseDown={keepSelection}
              onClick={openLinkPopover}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Live while typing — the target is stated, not implied. Tone is
              informational either way: 500–600 is a target, never a gate. */}
          <span
            data-testid="brief-word-count"
            className={cn(
              'whitespace-nowrap text-xs tabular-nums',
              inTarget ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
            <span className="text-muted-foreground"> · target {BRIEF_TARGET_MIN}–{BRIEF_TARGET_MAX}</span>
          </span>
        </div>
      </div>

      {/* Recovery banner — offered, never applied. */}
      {recovery && (
        <div className="flex-shrink-0 border-b border-border bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
          <Alert className="mx-auto max-w-[52rem] border-0 bg-transparent p-0">
            <History className="h-4 w-4" />
            <AlertTitle>Unsaved Brief recovered from backup</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                A backed-up Brief from {new Date(recovery.savedAt).toLocaleString()} differs
                from the saved one.
              </span>
              <span className="flex items-center gap-2">
                <Button size="sm" onClick={handleRestoreRecovery}>
                  Restore backup
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissRecovery}>
                  Keep saved version
                </Button>
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* ── The canvas. The essay's title and deck are CONTEXT — plain
             rendered text, not inputs; nothing on this screen edits them. ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[52rem] px-4 pb-32 pt-10">
          <div className="editorial-column">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Brief · {essay.status === 'published' ? 'published essay' : 'draft essay'}
              {essay.date ? ` · ${essay.date}` : ''}
            </p>
            <h1 className="editorial-title mt-3">{essay.title}</h1>
            {essay.snippet && <p className="editorial-subtitle mt-3">{essay.snippet}</p>}

            <div className="mt-8 border-t border-border pt-8">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      {editor && linkState && (
        <LinkPopover editor={editor} state={linkState} onClose={() => setLinkState(null)} />
      )}

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
        .brief-prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
