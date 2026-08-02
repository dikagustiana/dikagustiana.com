import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { JSONContent } from '@tiptap/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EssayEditor, getPlainTextFromHtml, type EditorSurface } from '@/components/editorial/EssayEditor';
import { EditorToolbar } from '@/components/editorial/toolbar/EditorToolbar';
import { WriterPreview } from './WriterPreview';
import { ValidationResult, validateEssay } from './WriterValidation';
import { PublishModal } from './PublishModal';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  Loader2,
  CloudOff,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWriterSections, useWriterCategories } from '@/domains/writing/hooks';
import { derivePhase } from '@/domains/writing/schema/placement';
import { useAllFinanceModules } from '@/hooks/queries/useFinance';
import { useFsliPages } from '@/hooks/queries/useFsliPages';
import { generateUniqueSlug } from '@/domains/writing/hooks/useWriterEssay';
import { useEssayAutosave, useDraftRecovery } from '@/hooks/useEssayAutosave';
import { tiptapJsonToHtml } from '@/lib/tiptap/serialize';
import { resolvePresentation, type EssayPresentation } from '@/lib/presentation';

interface WriterEditorProps {
  section: string;
  essayId?: string; // Database UUID for editing existing essays
  initialSlug?: string; // For loading by slug
}

interface EssayData {
  id?: string;
  title: string;
  slug: string;
  section: string;
  phase: string;
  category_id: string;
  author: string;
  date: string;
  read_time: string;
  snippet: string; // This is the deck line
  content: string;
  thumbnail_url: string;
  status: 'draft' | 'published';
  published: boolean;
  voice_role: string;
  presentation: EssayPresentation;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_AUTHOR = 'Dika Gustiana';

const PHASE_OPTIONS: Record<string, { id: string; label: string }[]> = {
  'next-big-thing': [
    { id: 'technology', label: 'Technology' },
    { id: 'economy', label: 'Economy' },
    { id: 'society', label: 'Society' },
    { id: 'environment', label: 'Environment' },
    { id: 'governance', label: 'Governance' },
  ],
  'green-transition': [
    { id: 'where-we-are-now', label: 'Where We Are Now' },
    { id: 'challenges-ahead', label: 'Challenges Ahead' },
    { id: 'pathways-forward', label: 'Pathways Forward' },
  ],
  finance: [
    { id: 'fundamentals', label: 'Fundamentals' },
    { id: 'strategic-finance', label: 'Strategic Finance' },
    { id: 'financial-planning', label: 'Financial Planning & Forecasting' },
    { id: 'financial-analytics', label: 'Financial Analytics' },
  ],
};

/**
 * Curriculum placement derives the editorial fields (DECISIONS.md 2026-08-01,
 * "Topic and Phase are required but redundant for curriculum essays").
 * The author sets ONE field — the module — and track/phase/topic follow:
 *   finance_section = module.track_slug
 *   phase           = the track, in the finance phase vocabulary
 *   topic           = the module slug (the module IS the topic)
 * fa-07-01 showed the drift this prevents: phase said 'fundamentals' while its
 * module sat in the analytics track.
 */
const TRACK_TO_PHASE: Record<string, string> = {
  fundamentals: 'fundamentals',
  'strategic-finance': 'strategic-finance',
  planning: 'financial-planning',
  analytics: 'financial-analytics',
};

function calculateReadTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  if (minutes < 1) return '1 min read';
  return `${minutes} min read`;
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function WriterEditor({ section, essayId, initialSlug }: WriterEditorProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Sections & categories
  const { data: sections = [] } = useWriterSections();
  const sectionObj = sections.find(s => s.slug === section);
  const sectionId = sectionObj?.id || '';
  const { data: categories = [] } = useWriterCategories(sectionId || undefined);
  const { data: allFinanceModules = [] } = useAllFinanceModules();
  // FSLI line items for accounting placement. FSLI prose is authored HERE —
  // as essays with fsli_slug — never edited inline on the public page.
  const { data: fsliPages = [] } = useFsliPages();

  // Editor state
  // The canvas is the default. Preview is a deliberate detour, not the
  // resting state — a split view means the writer is always half-reading.
  const [showPreview, setShowPreview] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  // The live editor + insert callbacks, surfaced by EssayEditor so the
  // persistent toolbar can mount here, page-wide under the top bar.
  const [surface, setSurface] = useState<EditorSurface | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!essayId || !!initialSlug);
  const [isDirty, setIsDirty] = useState(false);
  const isInitialLoad = useRef(true);

  // Form data
  const [essayDbId, setEssayDbId] = useState<string | null>(essayId || null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [phase, setPhase] = useState(searchParams.get('phase') || '');
  const [categoryId, setCategoryId] = useState('');
  const [author, setAuthor] = useState(DEFAULT_AUTHOR);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [readTime, setReadTime] = useState('');
  const [deck, setDeck] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroCaption, setHeroCaption] = useState('');
  const [content, setContent] = useState('');
  // Canonical body. `content` (HTML) is kept in step as the legacy fallback.
  const [contentJson, setContentJson] = useState<JSONContent | null>(null);
  // The row's updated_at as this tab last saw it, maintained across load,
  // manual save and autosave. Every essays UPDATE is guarded with
  // .eq('updated_at', <this>): if another tab or device wrote in between, the
  // guard matches zero rows and the write STOPS — loudly — instead of
  // overwriting newer work with older. (updated_at is trigger-maintained
  // server-side, so it moves on every successful write.)
  const serverUpdatedAtRef = useRef<string | null>(null);
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(['', '', '']);
  const [references, setReferences] = useState<{ label: string; url: string }[]>([]);
  const [authorBio, setAuthorBio] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [financeSection, setFinanceSection] = useState('');
  const [financeOrder, setFinanceOrder] = useState<number | null>(null);
  const [lessonType, setLessonType] = useState<string>('concept');
  // Accounting placement: which FSLI page this essay renders on.
  const [fsliSlug, setFsliSlug] = useState<string>(searchParams.get('fsli') || '');

  // Load existing essay
  useEffect(() => {
    if (!essayId && !initialSlug) {
      setIsLoading(false);
      return;
    }

    const loadEssay = async () => {
      try {
        let query = supabase.from('essays').select('*');

        if (essayId) {
          query = query.eq('id', essayId);
        } else if (initialSlug) {
          // Slug is globally unique — no need to filter by section
          query = query.eq('slug', initialSlug);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        if (!data) {
          toast({ title: 'Essay not found', variant: 'destructive' });
          navigate(`/admin/writer/${section}`);
          return;
        }

        // Populate form
        setEssayDbId(data.id);
        setTitle(data.title || '');
        setSlug(data.slug || '');
        setPhase(data.phase || '');
        setCategoryId(data.category_id || '');
        setAuthor(data.author || DEFAULT_AUTHOR);
        setDate(data.date || '');
        setReadTime(data.read_time || '');
        setDeck(data.snippet || '');
        setHeroImageUrl(data.thumbnail_url || '');
        setContent(data.content || '');
        // content_json is canonical; a null means this row predates the
        // backfill and the legacy HTML in `content` is still the only body.
        setContentJson((data.content_json as JSONContent | null) ?? null);
        setStatus(data.status === 'published' ? 'published' : 'draft');
        setCreatedAt(data.created_at);
        setUpdatedAt(data.updated_at);
        serverUpdatedAtRef.current = data.updated_at;
        const financeMeta = data as typeof data & {
          finance_section?: string | null;
          finance_order?: number | null;
          lesson_type?: string | null;
        };
        setModuleId(data.module_id || null);
        setFinanceSection(financeMeta.finance_section || '');
        setFinanceOrder(financeMeta.finance_order ?? null);
        setLessonType(financeMeta.lesson_type || 'concept');
        setFsliSlug(data.fsli_slug || '');

        // Presentation payload (deck / references / key takeaways / captions).
        // resolvePresentation falls back to the legacy persona columns for any
        // row the backfill missed, so an older essay still loads its references.
        // `data.presentation` is typed Json by the generated client; narrow it
        // at the boundary rather than widening EssayPresentation to accept Json.
        const pres = resolvePresentation({
          presentation: (data.presentation ?? null) as EssayPresentation | null,
        });
        setKeyTakeaways(pres.key_takeaways?.length ? pres.key_takeaways : ['', '', '']);
        setReferences(pres.references?.map(r =>
          typeof r === 'string' ? { label: r, url: '' } : { label: r.label, url: r.url || '' }
        ) || []);
        setHeroCaption(pres.hero_caption || '');
        setAuthorBio(pres.author_bio || '');

        setTimeout(() => {
          isInitialLoad.current = false;
          setIsDirty(false);
        }, 100);
      } catch (error) {
        console.error('Failed to load essay:', error);
        toast({ title: 'Failed to load essay', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    loadEssay();
  }, [essayId, initialSlug, section, navigate, toast]);

  // Track dirty state
  useEffect(() => {
    if (isInitialLoad.current) return;
    setIsDirty(true);
  }, [title, slug, phase, categoryId, author, date, deck, heroImageUrl, heroCaption, content, keyTakeaways, references, authorBio, moduleId, financeOrder, lessonType, fsliSlug]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!essayDbId && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [title, essayDbId]);

  // Auto-calculate reading time
  useEffect(() => {
    const plainText = getPlainTextFromHtml(content);
    const calculatedTime = calculateReadTime(plainText);
    setReadTime(calculatedTime);
  }, [content]);

  // Beforeunload guard
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

  // Word count
  const wordCount = useMemo(() => {
    const plainText = getPlainTextFromHtml(content);
    return getWordCount(plainText);
  }, [content]);

  // Editorial sections place by category; finance places by module and
  // accounting by FSLI leaf. The two flags below are the modal's fork.
  const isEditorialSection = section !== 'finance' && section !== 'accounting';
  const selectedCategory = useMemo(
    () => categories.find(c => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  // essays.category_id defaults to finance-general at the DB, so a loaded
  // editorial essay can carry a category from ANOTHER section (the tolerated
  // catch-all for sections without categories). Once a section has its own
  // categories, only one of them satisfies "Category is required" — the
  // catch-all must not quietly pass an essay the modal would file nowhere.
  const categoryBelongsToSection =
    categories.length === 0 || categories.some(c => c.id === categoryId);

  // Validation
  const validation = useMemo<ValidationResult>(() => {
    return validateEssay({
      title,
      deck,
      keyTakeaways: keyTakeaways.filter(k => k.trim()),
      wordCount,
      references: references.filter(r => r.label.trim()),
      section,
      content,
      categoryId: categoryBelongsToSection ? categoryId : '',
      // Only MODULE-PLACED finance essays carry a meaningful lesson type;
      // editorial essays and unplaced finance essays send null and stay on
      // the strict three-takeaways policy.
      lessonType: section === 'finance' && moduleId ? lessonType : null,
    });
  }, [title, deck, keyTakeaways, wordCount, references, section, content, categoryId, categoryBelongsToSection, lessonType, moduleId]);

  // ── Autosave: debounced backup into essay_revisions ──
  // Deliberately does NOT write the essays row. A backup is not a save, and a
  // failed backup must never be able to touch what is already published.
  // An essay that has never been live can autosave straight into its own row:
  // there is no published page to damage, so "Saved" can be literally true.
  // Once it is published, autosave drops back to backup-only and only an
  // explicit Save touches the live row.
  const persistDraftToEssay = status !== 'published';

  const {
    autosaveStatus,
    lastBackupAt,
    autosaveError,
    lastSavedTo,
    recordRevision,
    flush: flushAutosave,
  } = useEssayAutosave({
    essayId: essayDbId,
    title,
    sectionId,
    categoryId,
    snippet: deck || null,
    status,
    doc: contentJson,
    html: content,
    persistToEssay: persistDraftToEssay,
    serverUpdatedAtRef,
    // Never race a manual save: the two would write the same row with
    // different column sets and the later one would win arbitrarily.
    enabled: !isLoading && !isSaving,
  });

  // ── Recovery: an autosaved backup newer than the saved essay row ──
  const { candidate: recovery, dismiss: dismissRecovery } = useDraftRecovery(
    essayDbId,
    contentJson,
    !isLoading,
  );

  const handleRestoreRecovery = useCallback(() => {
    const doc = recovery?.revision.content_json as JSONContent | null | undefined;
    if (!doc) return;
    // Restore both representations so the editor, the preview and the legacy
    // fallback all agree. Nothing is persisted until the author saves.
    setContentJson(doc);
    setContent(tiptapJsonToHtml(doc));
    setIsDirty(true);
    dismissRecovery();
    toast({
      title: 'Draft recovered',
      description: 'The autosaved version is loaded. Save to keep it.',
    });
  }, [recovery, dismissRecovery, toast]);

  // Last line of defence: try to get a backup out as the tab goes away.
  useEffect(() => {
    const handler = () => flushAutosave();
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [flushAutosave]);

  const selectedFinanceModule = useMemo(() => allFinanceModules.find(mod => mod.id === moduleId), [allFinanceModules, moduleId]);

  const handleSave = async (targetStatus: 'draft' | 'published' = status) => {
    // Block publishing if validation fails
    if (targetStatus === 'published' && !validation.canPublish) {
      toast({
        title: 'Cannot publish',
        description: 'Please fix the validation errors before publishing.',
        variant: 'destructive',
      });
      return;
    }

    if (!title || !slug) {
      toast({
        title: 'Missing required fields',
        description: 'Title and slug are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Ensure slug uniqueness
      const finalSlug = await generateUniqueSlug(slug, essayDbId || undefined);

      // Single presentation payload. The four persona columns are legacy and
      // deliberately no longer written; they are dropped in a follow-up
      // migration once this read path is confirmed in production.
      const presentation = {
        deck: deck || null,
        key_takeaways: keyTakeaways.filter(k => k.trim()),
        references: references.filter(r => r.label.trim()).map(r => ({
          label: r.label,
          url: r.url || undefined,
        })),
        hero_caption: heroCaption || null,
        author_bio: authorBio || null,
      };

      // Placement-derived fields. For a finance essay with a module, phase and
      // topic come from the module; for an editorial essay, the theme comes
      // from the category (its slug minus the section prefix — the convention
      // derivePhase encodes and the reading side filters on). One choice, the
      // rest follows.
      const derivedPhase =
        section === 'finance' && selectedFinanceModule
          ? TRACK_TO_PHASE[selectedFinanceModule.track_slug] ?? selectedFinanceModule.track_slug
          : isEditorialSection && selectedCategory
            ? derivePhase(section, selectedCategory.slug)
            : phase || null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const essayData: any = {
        title,
        slug: finalSlug,
        section,
        phase: derivedPhase,
        author,
        date: date || null,
        read_time: readTime || null,
        snippet: deck || null,
        content: content || null,
        thumbnail_url: heroImageUrl || null,
        status: targetStatus,
        published: targetStatus === 'published',
        voice_role: 'economist',
        presentation,
        module_id: moduleId,
        finance_section: financeSection || null,
        finance_order: financeOrder,
        lesson_type: lessonType || null,
      };

      // topic mirrors the module slug for curriculum essays. Written only for
      // finance-with-module so accounting essays' hand-set topics (which drive
      // /accounting/consolidation/:topic) are never clobbered.
      if (section === 'finance' && selectedFinanceModule) {
        essayData.topic = selectedFinanceModule.slug;
      }

      // Accounting placement: the FSLI page this essay renders on. Written
      // only for accounting so other sections' rows are never touched.
      if (section === 'accounting') {
        essayData.fsli_slug = fsliSlug || null;
      }

      // Attach category_id if set
      if (categoryId) {
        essayData.category_id = categoryId;
      }

      // Only write content_json when we actually have a document. Sending null
      // for a title-only edit would wipe the canonical body and silently demote
      // the essay back to its legacy HTML.
      if (contentJson) {
        essayData.content_json = contentJson;
      }

      let savedId = essayDbId;
      let revisionType: 'create' | 'manual_save' | 'publish' | 'unpublish' = 'manual_save';

      if (essayDbId) {
        // Update existing — guarded. If the row's updated_at is no longer the
        // one this tab loaded/last wrote, someone else wrote in between; zero
        // rows match and nothing is overwritten.
        let update = supabase
          .from('essays')
          .update({ ...essayData, updated_at: new Date().toISOString() })
          .eq('id', essayDbId);
        if (serverUpdatedAtRef.current) {
          update = update.eq('updated_at', serverUpdatedAtRef.current);
        }
        const { data: updated, error } = await update.select('updated_at');

        if (error) throw error;
        if (!updated || updated.length === 0) {
          toast({
            title: 'Not saved — this essay changed somewhere else',
            description:
              'Another tab or device saved a newer version. Reload to get it; your text here is untouched until you do.',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }
        serverUpdatedAtRef.current = updated[0].updated_at;
        setUpdatedAt(updated[0].updated_at);
        if (targetStatus === 'published' && status !== 'published') revisionType = 'publish';
        else if (targetStatus === 'draft' && status === 'published') revisionType = 'unpublish';
        toast({ title: targetStatus === 'published' ? 'Published!' : 'Saved!' });
      } else {
        // Create new
        const { data, error } = await supabase
          .from('essays')
          .insert(essayData)
          .select()
          .single();

        if (error) throw error;
        savedId = data.id;
        setEssayDbId(data.id);
        setCreatedAt(data.created_at);
        serverUpdatedAtRef.current = data.updated_at;
        revisionType = 'create';
        toast({ title: 'Essay created!' });
        // Leave /new for the essay's own URL. Staying at /new meant a reload
        // showed a blank editor — the just-created essay looked gone — and
        // typing into that blank editor inserted a second row. `replace`
        // keeps Back from returning to the trap.
        navigate(`/admin/writer/${section}/${finalSlug}`, { replace: true });
      }

      setSlug(finalSlug);
      setStatus(targetStatus);
      setIsDirty(false);

      // Mark the save in history. Best-effort: the essay row is already
      // written, so a failed revision must not report the save as failed —
      // recordRevision surfaces it through the backup indicator instead.
      if (savedId) {
        void recordRevision(revisionType, {
          essayId: savedId,
          title,
          snippet: deck || null,
          status: targetStatus,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['finance-module-lesson-counts'] });
      await queryClient.invalidateQueries({ queryKey: ['essays-by-module-id'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error saving',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };


  useEffect(() => {
    if (section === 'finance' && selectedFinanceModule) {
      setFinanceSection(selectedFinanceModule.track_slug);
      // Derived, not asked for: the module decides the phase. Falls back to
      // the raw track slug for an unknown track, matching the save-time
      // derivedPhase computation so state and DB never disagree.
      setPhase(TRACK_TO_PHASE[selectedFinanceModule.track_slug] ?? selectedFinanceModule.track_slug);
    }
  }, [section, selectedFinanceModule]);

  // The editorial mirror of the module effect above: the category decides the
  // theme. Mirrored into state so the preview's topic chip and the modal's
  // URL line agree with what save will write.
  useEffect(() => {
    if (isEditorialSection && selectedCategory) {
      setPhase(derivePhase(section, selectedCategory.slug) ?? '');
    }
  }, [isEditorialSection, section, selectedCategory]);

  // NOTE: a local getPublicUrl() used to live here, duplicating
  // src/lib/essayUrl.ts — with a fallback (`/finance/${slug}`) that is not
  // even a route shape. Neither it nor its only caller was referenced by any
  // render path, so both are deleted rather than repaired. URL building has
  // exactly one home: `essayUrl` / `absoluteEssayUrl`, whose every branch is
  // asserted against the route list in tests/unit/essayUrl.test.ts.

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  const sectionLabel = section === 'next-big-thing'
    ? 'The Next Big Thing'
    : section === 'finance'
      ? 'Finance'
      : 'Green Transition';
  const isNew = !essayDbId;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ── The bar. Nearly invisible by design: back, state, and the two
             things you do when you stop writing. Nothing else belongs here —
             a word count in the corner is a number the writer will watch. ── */}
      <header className="flex-shrink-0 border-b border-border/60 bg-background">
        {/* The three groups shrink in a fixed order on a narrow screen: the
            back label goes first, then the status chip truncates. The two
            buttons on the right never shrink — they are the only things in
            the bar you press. Without this the row simply overflowed at
            375px and the page scrolled sideways. */}
        <div className="mx-auto flex h-12 w-full max-w-[52rem] items-center justify-between gap-2 px-4 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground sm:px-3"
            onClick={() => navigate(`/admin/writer/${section}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Posts</span>
            <span className="sr-only sm:hidden">Posts</span>
          </Button>

          {/* Draft · Saved — and never "Saved" when the text lives only in a
              backup. An unpublished essay autosaves into the essays row, so
              the word is literally true there; a published one does not. */}
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span>{status === 'published' ? 'Published' : 'Draft'}</span>
            <span aria-hidden>·</span>
            {autosaveStatus === 'error' ? (
              <span
                className="flex items-center gap-1 font-medium text-destructive"
                title={autosaveError ?? undefined}
              >
                <CloudOff className="h-3.5 w-3.5" />
                {persistDraftToEssay ? 'Save failed' : 'Backup failed'}
              </span>
            ) : autosaveStatus === 'saving' ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {persistDraftToEssay ? 'Saving…' : 'Backing up…'}
              </span>
            ) : isDirty && autosaveStatus === 'unsaved' ? (
              <span>Unsaved</span>
            ) : lastBackupAt ? (
              <span className="truncate">
                {lastSavedTo === 'essay' ? 'Saved' : 'Backed up'}
                <span className="hidden sm:inline">
                  {' '}
                  {lastBackupAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            ) : isDirty ? (
              <span>Unsaved</span>
            ) : (
              <span>Saved</span>
            )}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-muted-foreground hover:text-foreground sm:px-3"
              onClick={() => setShowPreview(v => !v)}
            >
              {showPreview ? 'Write' : 'Preview'}
            </Button>
            <Button size="sm" className="px-3" onClick={() => setShowPublish(true)}>
              Continue
            </Button>
          </div>
        </div>
      </header>

      {/* ── The persistent formatting toolbar — Substack's pattern, replacing
             the selection-only bubble menu (reversal recorded in
             docs/DECISIONS.md). Hidden in preview: preview is for reading. ── */}
      {!showPreview && surface && (
        <EditorToolbar
          editor={surface.editor}
          insertOptions={surface.insertOptions}
          className="flex-shrink-0"
        />
      )}

      {/* Recovery: an autosaved backup that never made it into the essay row.
          Offered, never applied — restoring and discarding are both the
          author's call, so neither version is destroyed behind their back. */}
      {recovery && (
        <div className="flex-shrink-0 border-b border-border bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
          <Alert className="mx-auto max-w-[52rem] border-0 bg-transparent p-0">
            <History className="h-4 w-4" />
            <AlertTitle>Unsaved draft recovered from backup</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                An autosaved version from {new Date(recovery.savedAt).toLocaleString()} differs
                from the saved essay. It was probably captured after the last save.
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

      {/* ── The canvas. One column, centred, and the rest of the screen left
             deliberately empty. ── */}
      <div className="flex-1 overflow-y-auto">
        {showPreview ? (
          <div className="mx-auto w-full max-w-[52rem] px-4 py-10">
            <WriterPreview
              title={title}
              deck={deck}
              author={author}
              date={date}
              readTime={readTime}
              phase={phase}
              phaseOptions={PHASE_OPTIONS[section]}
              heroImageUrl={heroImageUrl}
              heroCaption={heroCaption}
              content={content}
              keyTakeaways={keyTakeaways.filter(k => k.trim())}
              references={references.filter(r => r.label.trim())}
              authorBio={authorBio}
              section={section}
              updatedAt={updatedAt}
              createdAt={createdAt}
            />
          </div>
        ) : (
          // The left padding is the gutter the `+` lives in. It is 2.5rem even
          // on the narrowest screen, because a button overlapping the text is
          // worse than an asymmetric margin.
          <div className="mx-auto w-full max-w-[52rem] pb-32 pl-10 pr-4 pt-12 sm:pl-16 sm:pr-4">
            {/* Title and subtitle are the top of the document. Same database
                fields as before — `title` and `snippet`/presentation.deck —
                only the editing location has changed. They are inputs rather
                than editor nodes on purpose: making them document nodes would
                change the shape of every stored content_json. */}
            {/* The 728px column: width on the container, centred by margin —
                the same .editorial-column the body uses, so the title, the
                subtitle and the first body line share one left edge. Type
                comes from .editorial-title / .editorial-subtitle, the same
                classes the published header wears. */}
            <div className="editorial-column">
              <TextareaAutosize
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Title"
                aria-label="Title"
                rows={1}
                className="editorial-title w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground/40 focus:ring-0"
              />
              <TextareaAutosize
                value={deck}
                onChange={e => setDeck(e.target.value)}
                placeholder="Add a subtitle..."
                aria-label="Subtitle"
                rows={1}
                className="editorial-subtitle mt-3 w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground/30 focus:ring-0"
              />
            </div>

            <div className="mt-8">
              <EssayEditor
                content={content}
                onChange={setContent}
                onChangeJson={setContentJson}
                onSurfaceChange={setSurface}
                section={section as 'finance' | 'green-transition' | 'next-big-thing'}
                minHeight="55vh"
              />
            </div>
          </div>
        )}
      </div>

      <PublishModal
        open={showPublish}
        onOpenChange={setShowPublish}
        isPublished={status === 'published'}
        sectionSlug={section}
        isFinanceSection={section === 'finance'}
        isAccountingSection={section === 'accounting'}
        fsliPages={fsliPages}
        fsliSlug={fsliSlug}
        setFsliSlug={setFsliSlug}
        modules={allFinanceModules}
        moduleId={moduleId}
        setModuleId={setModuleId}
        financeOrder={financeOrder}
        setFinanceOrder={setFinanceOrder}
        lessonType={lessonType}
        setLessonType={setLessonType}
        categories={categories}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        keyTakeaways={keyTakeaways}
        setKeyTakeaways={setKeyTakeaways}
        references={references}
        setReferences={setReferences}
        author={author}
        setAuthor={setAuthor}
        date={date}
        setDate={setDate}
        authorBio={authorBio}
        setAuthorBio={setAuthorBio}
        heroImageUrl={heroImageUrl}
        setHeroImageUrl={setHeroImageUrl}
        heroCaption={heroCaption}
        setHeroCaption={setHeroCaption}
        validation={validation}
        isSaving={isSaving}
        onPublish={() => {
          void handleSave('published').then(() => setShowPublish(false));
        }}
        onSaveDraft={() => {
          void handleSave('draft').then(() => setShowPublish(false));
        }}
      />
    </div>
  );
}
