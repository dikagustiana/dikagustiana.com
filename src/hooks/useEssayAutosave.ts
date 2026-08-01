/**
 * useEssayAutosave — debounced backup of the working draft into
 * `essay_revisions`, plus the load-time recovery check.
 *
 * What it does NOT do: touch the `essays` row. Autosave is a backup, not a
 * save; promoting a draft to the live row (and to `published`) stays an
 * explicit, validated action. That separation is why a failed autosave can
 * never corrupt what is already published.
 *
 * Failures are surfaced, never swallowed — a backup you believe in but that
 * is not happening is worse than no backup at all.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { supabase } from '@/integrations/supabase/client';
import {
  AUTOSAVE_DEBOUNCE_MS,
  canAutosave,
  docsDiffer,
  findRecoveryCandidate,
  isEmptyDoc,
  nextRevisionNo,
  shouldRollUpRevision,
  type RecoveryCandidate,
  type RevisionChangeType,
  type RevisionSummary,
} from '@/lib/revisions';

/** Postgres unique-violation — another writer took our revision number. */
const UNIQUE_VIOLATION = '23505';
const MAX_INSERT_ATTEMPTS = 3;

const REVISION_COLUMNS = 'id, revision_no, change_type, created_at, content_json, title';

export type AutosaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

export interface EssayRevisionInput {
  essayId: string;
  doc: JSONContent | null;
  title: string;
  snippet: string | null;
  status: 'draft' | 'published';
  changeType: RevisionChangeType;
  changeSummary?: string | null;
}

/** Fetch the newest revision for an essay (highest revision_no). */
async function fetchLatestRevision(essayId: string): Promise<RevisionSummary | null> {
  const { data, error } = await supabase
    .from('essay_revisions')
    .select(REVISION_COLUMNS)
    .eq('essay_id', essayId)
    .order('revision_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as RevisionSummary | null) ?? null;
}

/**
 * Append a revision, or roll up into `ownRevisionId` when this is a continuing
 * autosave burst. Returns the id of the row written.
 *
 * `revision_no` is assigned by the app (max + 1) and guarded by a UNIQUE
 * constraint; a concurrent writer therefore loses the race with 23505 rather
 * than silently reusing a number, and we retry with a recomputed value.
 * `changed_by` is deliberately omitted — it defaults to auth.uid(), which is
 * exactly what the INSERT policy requires it to equal.
 */
export async function writeRevision(
  input: EssayRevisionInput,
  ownRevisionId: string | null,
): Promise<string> {
  const latest = await fetchLatestRevision(input.essayId);
  const doc = input.doc as unknown as null;

  if (input.changeType === 'autosave' && shouldRollUpRevision(latest, ownRevisionId, Date.now())) {
    const { error } = await supabase
      .from('essay_revisions')
      .update({
        content_json: doc,
        title: input.title,
        snippet: input.snippet,
        status: input.status,
        created_at: new Date().toISOString(),
      })
      .eq('id', latest!.id);

    if (error) throw error;
    return latest!.id;
  }

  let attempt = 0;
  let candidate = nextRevisionNo(latest);

  while (true) {
    attempt += 1;
    const { data, error } = await supabase
      .from('essay_revisions')
      .insert({
        essay_id: input.essayId,
        revision_no: candidate,
        change_type: input.changeType,
        title: input.title,
        snippet: input.snippet,
        content_json: doc,
        status: input.status,
        change_summary: input.changeSummary ?? null,
      })
      .select('id')
      .single();

    if (!error) return (data as { id: string }).id;

    if (error.code !== UNIQUE_VIOLATION || attempt >= MAX_INSERT_ATTEMPTS) throw error;
    candidate = nextRevisionNo(await fetchLatestRevision(input.essayId));
  }
}

interface UseEssayAutosaveArgs {
  essayId: string | null;
  title: string;
  sectionId: string;
  categoryId: string;
  snippet: string | null;
  status: 'draft' | 'published';
  /** Current editor document. Autosave fires when this changes. */
  doc: JSONContent | null;
  /** False while the essay is still loading, to keep load from looking like an edit. */
  enabled: boolean;
}

export interface UseEssayAutosaveResult {
  autosaveStatus: AutosaveStatus;
  lastBackupAt: Date | null;
  autosaveError: string | null;
  /**
   * Write a non-autosave revision immediately (manual save, publish…).
   *
   * `essayId` can be overridden because the caller may have just created the
   * row: React state (and therefore the hook's ref) has not re-rendered yet at
   * that point, so the freshly returned id has to be passed in explicitly.
   */
  recordRevision: (
    changeType: RevisionChangeType,
    overrides?: Partial<
      Pick<EssayRevisionInput, 'title' | 'snippet' | 'status' | 'doc' | 'essayId'>
    >,
  ) => Promise<void>;
  /** Force a pending autosave to run now. */
  flush: () => void;
}

export function useEssayAutosave({
  essayId,
  title,
  sectionId,
  categoryId,
  snippet,
  status,
  doc,
  enabled,
}: UseEssayAutosaveArgs): UseEssayAutosaveResult {
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [lastBackupAt, setLastBackupAt] = useState<Date | null>(null);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownRevisionId = useRef<string | null>(null);
  // The doc as last backed up, so an unchanged doc never re-writes a revision.
  const backedUpDoc = useRef<unknown>(null);
  const inFlight = useRef(false);
  // Latest values, so the debounced callback never closes over stale state.
  const latestArgs = useRef({ essayId, title, snippet, status, doc, sectionId, categoryId });
  latestArgs.current = { essayId, title, snippet, status, doc, sectionId, categoryId };

  const runAutosave = useCallback(async () => {
    const args = latestArgs.current;
    if (inFlight.current) return;
    if (!canAutosave(args)) return;
    if (isEmptyDoc(args.doc)) return;
    if (!docsDiffer(args.doc, backedUpDoc.current)) return;

    inFlight.current = true;
    setAutosaveStatus('saving');
    try {
      const id = await writeRevision(
        {
          essayId: args.essayId!,
          doc: args.doc,
          title: args.title,
          snippet: args.snippet,
          status: args.status,
          changeType: 'autosave',
        },
        ownRevisionId.current,
      );
      ownRevisionId.current = id;
      backedUpDoc.current = args.doc;
      setLastBackupAt(new Date());
      setAutosaveError(null);
      setAutosaveStatus('saved');
    } catch (error: unknown) {
      // Loud on purpose: the author must know the net is not catching them.
      setAutosaveError(error instanceof Error ? error.message : 'Unknown error');
      setAutosaveStatus('error');
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Debounced autosave on document change.
  useEffect(() => {
    if (!enabled) return;
    if (!canAutosave({ essayId, title, sectionId, categoryId })) return;
    if (isEmptyDoc(doc)) return;
    if (!docsDiffer(doc, backedUpDoc.current)) return;

    setAutosaveStatus(prev => (prev === 'saving' ? prev : 'unsaved'));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void runAutosave(), AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [doc, enabled, essayId, title, sectionId, categoryId, runAutosave]);

  // A backup in the tab's dying moments is better than none. keepalive-style
  // best effort: fire the pending write without awaiting it.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void runAutosave();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [runAutosave]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    void runAutosave();
  }, [runAutosave]);

  const recordRevision = useCallback<UseEssayAutosaveResult['recordRevision']>(
    async (changeType, overrides) => {
      const args = latestArgs.current;
      const targetId = overrides?.essayId ?? args.essayId;
      if (!targetId) return;
      const nextDoc = overrides?.doc !== undefined ? overrides.doc : args.doc;
      try {
        const id = await writeRevision(
          {
            essayId: targetId,
            doc: nextDoc,
            title: overrides?.title ?? args.title,
            snippet: overrides?.snippet ?? args.snippet,
            status: overrides?.status ?? args.status,
            changeType,
          },
          null, // explicit saves always append; they are the history markers
        );
        ownRevisionId.current = id;
        backedUpDoc.current = nextDoc;
        setLastBackupAt(new Date());
        setAutosaveError(null);
        setAutosaveStatus('saved');
      } catch (error: unknown) {
        setAutosaveError(error instanceof Error ? error.message : 'Unknown error');
        setAutosaveStatus('error');
      }
    },
    [],
  );

  // A new essay resets the per-essay bookkeeping.
  useEffect(() => {
    ownRevisionId.current = null;
    backedUpDoc.current = null;
    setAutosaveStatus('idle');
    setAutosaveError(null);
    setLastBackupAt(null);
  }, [essayId]);

  return { autosaveStatus, lastBackupAt, autosaveError, recordRevision, flush };
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

export interface UseDraftRecoveryResult {
  candidate: RecoveryCandidate | null;
  dismiss: () => void;
}

/**
 * Look for an autosaved backup newer than what the essays row holds.
 *
 * Runs once per essay, right after load. The caller decides what to do with
 * the candidate — this never mutates the editor by itself.
 */
export function useDraftRecovery(
  essayId: string | null,
  essayDoc: unknown,
  ready: boolean,
): UseDraftRecoveryResult {
  const [candidate, setCandidate] = useState<RecoveryCandidate | null>(null);
  const checkedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !essayId || checkedFor.current === essayId) return;
    checkedFor.current = essayId;

    let cancelled = false;
    void (async () => {
      try {
        const latest = await fetchLatestRevision(essayId);
        if (cancelled) return;
        setCandidate(findRecoveryCandidate(latest, essayDoc));
      } catch {
        // A failed recovery probe must not block opening the editor; the
        // backup itself is unaffected and still in the table.
        if (!cancelled) setCandidate(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [essayId, essayDoc, ready]);

  const dismiss = useCallback(() => setCandidate(null), []);

  return { candidate, dismiss };
}
