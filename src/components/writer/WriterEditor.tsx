import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { JSONContent } from '@tiptap/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EssayEditor, getPlainTextFromHtml } from '@/components/editorial/EssayEditor';
import { WriterPreview } from './WriterPreview';
import { WriterValidation, ValidationResult, validateEssay } from './WriterValidation';
import { WriterMetadata } from './WriterMetadata';
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
  Save,
  Eye,
  EyeOff,
  Send,
  Clock,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  CloudOff,
  Cloud,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWriterSections, useWriterCategories } from '@/domains/writing/hooks';
import { useAllFinanceModules } from '@/hooks/queries/useFinance';
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

  // Editor state
  const [showPreview, setShowPreview] = useState(true);
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
        const financeMeta = data as typeof data & {
          finance_section?: string | null;
          finance_order?: number | null;
          lesson_type?: string | null;
        };
        setModuleId(data.module_id || null);
        setFinanceSection(financeMeta.finance_section || '');
        setFinanceOrder(financeMeta.finance_order ?? null);
        setLessonType(financeMeta.lesson_type || 'concept');

        // Presentation payload (deck / references / key takeaways / captions).
        // resolvePresentation falls back to the legacy persona columns for any
        // row the backfill missed, so an older essay still loads its references.
        const pres = resolvePresentation(data);
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
  }, [title, slug, phase, categoryId, author, date, deck, heroImageUrl, heroCaption, content, keyTakeaways, references, authorBio, moduleId, financeOrder, lessonType]);

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
      categoryId,
    });
  }, [title, deck, keyTakeaways, wordCount, references, section, content, categoryId]);

  // ── Autosave: debounced backup into essay_revisions ──
  // Deliberately does NOT write the essays row. A backup is not a save, and a
  // failed backup must never be able to touch what is already published.
  const {
    autosaveStatus,
    lastBackupAt,
    autosaveError,
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
    enabled: !isLoading,
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const essayData: any = {
        title,
        slug: finalSlug,
        section,
        phase: phase || null,
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
        // Update existing
        const { error } = await supabase
          .from('essays')
          .update({ ...essayData, updated_at: new Date().toISOString() })
          .eq('id', essayDbId);

        if (error) throw error;
        setUpdatedAt(new Date().toISOString());
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
        revisionType = 'create';
        toast({ title: 'Essay created!' });
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

  const selectedFinanceModule = useMemo(() => allFinanceModules.find(mod => mod.id === moduleId), [allFinanceModules, moduleId]);

  useEffect(() => {
    if (section === 'finance' && selectedFinanceModule) {
      setFinanceSection(selectedFinanceModule.track_slug);
    }
  }, [section, selectedFinanceModule]);

  const getPublicUrl = () => {
    if (section === 'next-big-thing') {
      return `/the-next-big-thing/${slug}`;
    }
    if (section === 'finance' && moduleId && selectedFinanceModule) {
      return `/finance/${financeSection || selectedFinanceModule.track_slug}/${selectedFinanceModule.slug}/${slug}`;
    }
    if (section === 'finance') {
      return `/finance/${slug}`;
    }
    if (phase) {
      return `/${section}/${phase}/${slug}`;
    }
    return `/${section}/${slug}`;
  };

  const getPreviewUrl = () => {
    // Draft preview uses same URL but protected by auth
    return getPublicUrl();
  };

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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/admin/writer/${section}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-semibold">
                  {isNew ? 'New Essay' : 'Edit Essay'}
                </h1>
                <Badge variant="outline" className="text-xs">
                  {sectionLabel}
                </Badge>
                <Badge 
                  variant={status === 'published' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {status}
                </Badge>
              </div>
              {!isNew && slug && (
                <p className="text-xs text-muted-foreground">{slug}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Backup state. Distinct from "Saved": autosave writes a backup
                revision, not the essay row, so the wording must not imply the
                published essay changed. A failure is loud by design. */}
            {autosaveStatus === 'error' ? (
              <span
                className="text-sm font-medium text-destructive flex items-center gap-1"
                title={autosaveError ?? undefined}
              >
                <CloudOff className="h-4 w-4" />
                Backup failed
              </span>
            ) : autosaveStatus === 'saving' ? (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Backing up…
              </span>
            ) : lastBackupAt ? (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Cloud className="h-3.5 w-3.5" />
                Backed up {lastBackupAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}

            {isDirty && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {readTime} • {wordCount} words
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showPreview ? 'Focus' : 'Preview'}
            </Button>

            {status === 'published' && slug && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </a>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save Draft
            </Button>

            <Button
              onClick={() => handleSave('published')}
              disabled={isSaving || !validation.canPublish}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Publish
            </Button>
          </div>
        </div>
      </header>

      {/* Recovery: an autosaved backup that never made it into the essay row.
          Offered, never applied — restoring and discarding are both the
          author's call, so neither version is destroyed behind their back. */}
      {recovery && (
        <div className="flex-shrink-0 border-b border-border bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <Alert className="border-0 bg-transparent p-0">
            <History className="h-4 w-4" />
            <AlertTitle>Unsaved draft recovered from backup</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                An autosaved version from{' '}
                {new Date(recovery.savedAt).toLocaleString()} differs from the saved essay.
                It was probably captured after the last save.
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

      {/* Main Editor Area */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={55} minSize={40}>
              <div className="h-full overflow-y-auto p-6 space-y-6">
                <WriterMetadata
                  title={title}
                  setTitle={setTitle}
                  slug={slug}
                  setSlug={setSlug}
                  phase={phase}
                  setPhase={setPhase}
                  phaseOptions={PHASE_OPTIONS[section] || []}
                  categoryId={categoryId}
                  setCategoryId={setCategoryId}
                  categories={categories}
                  author={author}
                  setAuthor={setAuthor}
                  date={date}
                  setDate={setDate}
                  deck={deck}
                  setDeck={setDeck}
                  heroImageUrl={heroImageUrl}
                  setHeroImageUrl={setHeroImageUrl}
                  heroCaption={heroCaption}
                  setHeroCaption={setHeroCaption}
                  keyTakeaways={keyTakeaways}
                  setKeyTakeaways={setKeyTakeaways}
                  references={references}
                  setReferences={setReferences}
                  authorBio={authorBio}
                  setAuthorBio={setAuthorBio}
                  isNew={isNew}
                  moduleId={moduleId}
                  setModuleId={setModuleId}
                  financeOrder={financeOrder}
                  setFinanceOrder={setFinanceOrder}
                  lessonType={lessonType}
                  setLessonType={setLessonType}
                  isFinanceSection={section === 'finance'}
                />

                {/* Body Editor with Figure Support */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Body Content</label>
                  <EssayEditor
                    content={content}
                    onChange={setContent}
                    onChangeJson={setContentJson}
                    section={section as 'finance' | 'green-transition' | 'next-big-thing'}
                    distractionFree={false}
                    minHeight="400px"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use H2 and H3 for headings. Click the image button to insert figures.
                  </p>
                </div>

                {/* Validation Checklist */}
                <WriterValidation validation={validation} />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={45} minSize={30}>
              <div className="h-full overflow-y-auto bg-muted/20">
                <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground font-medium border-b border-border">
                  Live Preview (Aeon Style)
                </div>
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
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          /* Distraction-free mode */
          <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
              {/* Title */}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Essay Title..."
                className="text-3xl font-display font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 h-auto py-2"
              />

              {/* Deck */}
              <Textarea
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
                placeholder="Write a one-sentence thesis (the deck line)..."
                className="text-xl text-muted-foreground border-0 border-b rounded-none px-0 focus-visible:ring-0 resize-none min-h-[60px]"
              />

              {/* Body with Figure Support */}
              <EssayEditor
                content={content}
                onChange={setContent}
                onChangeJson={setContentJson}
                section={section as 'finance' | 'green-transition' | 'next-big-thing'}
                distractionFree={true}
                minHeight="500px"
              />

              {/* Quick validation indicator */}
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                {validation.canPublish ? (
                  <span className="flex items-center gap-1 text-sm text-primary">
                    <CheckCircle className="h-4 w-4" />
                    Ready to publish
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    {validation.errors.length} issue{validation.errors.length !== 1 ? 's' : ''} to fix
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
