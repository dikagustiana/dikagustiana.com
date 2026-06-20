/**
 * WriterStudio — The single canonical editor for all essays.
 *
 * Three-panel layout:
 *   Left: Heading outline, word count, reading time
 *   Center: Title, Deck, TipTap editor
 *   Right: Section, Category, Slug, Tags, Status, Meta, Preview
 *
 * Hierarchy: Section → Category → Essay (strict FK)
 * No fallback logic. No default assignments.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { JSONContent } from '@tiptap/core';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedEditor } from '@/components/admin/UnifiedEditor';
import { LivePreviewPanel } from '@/components/admin/LivePreviewPanel';
import { LoadingState, ErrorState } from '@/components/states';
import { SEO } from '@/components/SEO';
import { parseTiptapJson } from '@/lib/tiptap/serialize';
import { useWriterEssay, useSaveEssay, generateUniqueSlug } from './hooks/useWriterEssay';
import { useWriterCategories } from './hooks/useWriterCategories';
import { useWriterSections } from './hooks/useWriterSections';
import { resolvePlacementFields } from './schema/placement';
import { slugify, validateForPublish, canAutosave } from './schema/types';
import type { EssayStatus, PublishValidationError, SaveStatus } from './schema/types';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { XCircle } from 'lucide-react';

export default function WriterStudio() {
  const { id: slugParam } = useParams<{ id: string }>();
  const isNew = slugParam === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();

  // Data fetching
  const {
    data: essayData,
    isLoading: essayLoading,
    error: essayError,
    refetch: refetchEssay,
  } = useWriterEssay(isNew ? '' : (slugParam || ''), { enabled: !isNew && !!slugParam });
  const { data: sections = [], isLoading: sectionsLoading } = useWriterSections();
  const saveEssay = useSaveEssay();

  // ── Form state ──
  const [essayId, setEssayId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [deck, setDeck] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [sectionId, setSectionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<EssayStatus>('draft');
  const [author, setAuthor] = useState('Dika Gustiana');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [financeSection, setFinanceSection] = useState('');
  const [financeOrder, setFinanceOrder] = useState<number | null>(null);
  const [lessonType, setLessonType] = useState<string>('concept');
  const [fsliSlug, setFsliSlug] = useState('');
  const [topic, setTopic] = useState('');
  const [contentJson, setContentJson] = useState<JSONContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const isInitialLoad = useRef(true);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Categories filtered by section
  const { data: categories = [], isLoading: categoriesLoading } = useWriterCategories(sectionId || undefined);

  // Publish validation (computed live)
  const publishErrors = useMemo<PublishValidationError[]>(() => {
    return validateForPublish({
      title,
      deck,
      slug,
      body: contentJson ? JSON.stringify(contentJson) : null,
      category_id: categoryId,
      section_id: sectionId,
      tags: [],
      status,
      meta_description: '',
      author,
    });
  }, [title, deck, slug, contentJson, categoryId, sectionId, status, author]);

  // ── Load essay data when editing ──
  useEffect(() => {
    if (essayData && !isNew) {
      isInitialLoad.current = true;
      setEssayId(essayData.id);
      setTitle(essayData.title || '');
      setDeck(essayData.snippet || '');
      setSlug(essayData.slug || '');
      setSlugManuallyEdited(true); // Existing essays have manual slugs
      setAuthor(essayData.author || 'Dika Gustiana');
      setStatus((essayData.status as EssayStatus) || 'draft');
      const placementMeta = essayData as typeof essayData & {
        finance_section?: string | null;
        finance_order?: number | null;
        lesson_type?: string | null;
        fsli_slug?: string | null;
        topic?: string | null;
      };
      setModuleId(essayData.module_id || null);
      setFinanceSection(placementMeta.finance_section || '');
      setFinanceOrder(placementMeta.finance_order ?? null);
      setLessonType(placementMeta.lesson_type || 'concept');
      setFsliSlug(placementMeta.fsli_slug || '');
      setTopic(placementMeta.topic || '');

      // Set category and section from joined data
      if (essayData.categories) {
        setCategoryId(essayData.categories.id);
        setSectionId(essayData.categories.section_id);
      } else if (essayData.category_id) {
        setCategoryId(essayData.category_id);
      }

      // Fallback: if no category but has section slug, find section by slug
      if (!essayData.categories && essayData.section) {
        const sec = sections.find(s => s.slug === essayData.section);
        if (sec) setSectionId(sec.id);
      }

      // Parse content
      const rawContent = essayData.content || '';
      const parsed = parseTiptapJson(rawContent);
      setContentJson(parsed);

      setTimeout(() => {
        isInitialLoad.current = false;
        setIsDirty(false);
      }, 100);
    }
  }, [essayData, isNew, sections]);

  // ── Auto-generate slug from title (only if not manually edited) ──
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    const sectionSlug = sections.find(s => s.id === sectionId)?.slug || '';
    if (sectionSlug !== 'finance') {
      setModuleId(null);
      setFinanceSection('');
      setFinanceOrder(null);
    }
    if (sectionSlug !== 'accounting') {
      setFsliSlug('');
      setTopic('');
    }
  }, [sectionId, sections]);

  // ── Track dirty state ──
  useEffect(() => {
    if (isInitialLoad.current) return;
    setIsDirty(true);
    setSaveStatus('unsaved');
  }, [title, deck, slug, sectionId, categoryId, status, contentJson, moduleId, financeOrder, lessonType, fsliSlug, topic]);

  // ── Beforeunload guard ──
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

  // ── Slug change handler ──
  const handleSlugChange = useCallback((newSlug: string) => {
    setSlug(newSlug);
    setSlugManuallyEdited(true);
  }, []);

  // ── Image upload handler ──
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'png';
    const filename = `drafts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('essay-images')
      .upload(filename, file, { cacheControl: '31536000', upsert: false });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from('essay-images').getPublicUrl(filename);
    toast({ title: 'Image uploaded' });
    return urlData.publicUrl;
  }, [toast]);

  // ── Content change handler ──
  const handleContentChange = useCallback((json: JSONContent) => {
    setContentJson(json);
  }, []);

  // ── Resolve section slug from section ID ──
  const getSectionSlug = useCallback(() => {
    const sec = sections.find(s => s.id === sectionId);
    return sec?.slug || '';
  }, [sections, sectionId]);

  // ── Resolve phase from category ──
  const getPhaseFromCategory = useCallback(() => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return null;
    const sectionSlug = getSectionSlug();
    // Extract phase by removing section prefix from category slug
    if (cat.slug.startsWith(sectionSlug + '-')) {
      return cat.slug.slice(sectionSlug.length + 1);
    }
    return cat.slug;
  }, [categories, categoryId, getSectionSlug]);

  // ── Save ──
  // `silent` is used by autosave: it skips toasts and the publish gate and just
  // persists the latest content under the current status.
  const handleSave = useCallback(
    async (targetStatus: EssayStatus = 'draft', opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    if (!title.trim()) {
      if (!silent) toast({ title: 'Title required', description: 'Add a title before saving.', variant: 'destructive' });
      return;
    }

    // `essays.category_id` is NOT NULL with an FK RESTRICT, so a save without a
    // section/category is rejected by the DB. Validate up-front on every save
    // (not just publish) to give a clear message and avoid an orphan reference.
    if (!sectionId || !categoryId) {
      if (!silent) toast({
        title: 'Placement required',
        description: 'Choose a section and category before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (targetStatus === 'published' && !silent) {
      const errors = validateForPublish({
        title, deck, slug,
        body: contentJson ? JSON.stringify(contentJson) : null,
        category_id: categoryId,
        section_id: sectionId,
        tags: [], status: targetStatus, meta_description: '', author,
      });

      if (errors.length > 0) {
        toast({
          title: 'Cannot publish',
          description: errors.map(e => e.message).join(' '),
          variant: 'destructive',
        });
        return;
      }
    }

    // Ensure slug uniqueness
    let finalSlug = slug.trim() || slugify(title);
    finalSlug = await generateUniqueSlug(finalSlug, essayId || undefined);

    const contentString = contentJson ? JSON.stringify(contentJson) : '';
    const sectionSlug = getSectionSlug();
    const placement = resolvePlacementFields({
      sectionSlug,
      categorySlug: categories.find(c => c.id === categoryId)?.slug || null,
      slug: finalSlug,
      moduleId,
      financeSection,
      financeOrder,
      lessonType,
      fsliSlug,
      topic,
    });

    setSaveStatus('saving');
    try {
      const result = await saveEssay.mutateAsync({
        id: essayId,
        data: {
          title: title.trim(),
          slug: finalSlug,
          snippet: deck.trim() || null,
          content: contentString,
          category_id: categoryId,
          status: targetStatus,
          author: author || null,
          published: targetStatus === 'published',
          date: targetStatus === 'published' ? new Date().toISOString().split('T')[0] : null,
          ...placement,
        },
      });

      setIsDirty(false);
      setSaveStatus('saved');
      setSlug(finalSlug);

      if (isNew && result?.id) {
        if (!silent) toast({ title: 'Created', description: 'Essay created.' });
        navigate(`/admin/writer/${result.slug}`, { replace: true });
      } else if (!silent) {
        toast({ title: 'Saved', description: 'Essay updated.' });
      }
    } catch (error: unknown) {
      setSaveStatus('error');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (!silent) toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  },
    [title, sectionId, categoryId, deck, slug, contentJson, author, essayId, getSectionSlug,
     categories, moduleId, financeSection, financeOrder, lessonType, fsliSlug, topic, isNew,
     saveEssay, navigate, toast],
  );

  // ── Silent autosave (debounced) ──
  useEffect(() => {
    if (isInitialLoad.current || !isDirty) return;
    if (!canAutosave({ essayId, title, sectionId, categoryId })) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void handleSave(status, { silent: true });
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [isDirty, essayId, title, sectionId, categoryId, status, handleSave]);

  // ── Access denied ──
  if (!authLoading && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (!isNew && essayLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingState />
      </div>
    );
  }

  if (!isNew && essayError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ErrorState onRetry={() => void refetchEssay()} />
      </div>
    );
  }

  // Compute initial content for editor
  const editorInitialContent = (() => {
    if (contentJson) return contentJson;
    if (!isNew && essayData?.content) return essayData.content;
    return undefined;
  })();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <SEO
        title={isNew ? 'New Essay — Writer Studio' : `Edit: ${title} — Writer Studio`}
        description="Writer Studio"
      />

      {/* Top Bar */}
      <TopBar
        saveStatus={saveStatus}
        isSaving={saveEssay.isPending}
        publishErrors={publishErrors}
        onSave={() => handleSave('draft')}
        onPublish={() => handleSave('published')}
        essayTitle={title}
      />

      {/* Three-panel layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar: Outline */}
        <LeftSidebar contentJson={contentJson} />

        {/* Main Editor */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
            {/* Title */}
            <input
              id="editor-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
              autoFocus={isNew}
              className="w-full text-3xl md:text-4xl font-display font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground/40"
            />

            {/* Deck */}
            <input
              id="editor-deck"
              type="text"
              value={deck}
              onChange={e => setDeck(e.target.value)}
              placeholder="Deck — one-line summary"
              className="w-full text-lg text-muted-foreground bg-transparent border-0 outline-none placeholder:text-muted-foreground/30"
            />

            {/* TipTap Editor */}
            <UnifiedEditor
              key={`essay-${essayId || 'new'}`}
              initialContent={editorInitialContent}
              onChange={handleContentChange}
              onImageUpload={handleImageUpload}
              placeholder="Start writing..."
              autoFocus={!isNew}
              minHeight="50vh"
            />
          </div>

          {/* Preview panel (toggled) */}
          {showPreview && (
            <div className="max-w-3xl mx-auto px-6 pb-6">
              <div className="border border-border rounded-md overflow-hidden bg-background">
                <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                  Desktop Preview
                </div>
                <LivePreviewPanel
                  title={title}
                  snippet={deck}
                  author={author}
                  date={null}
                  readTime={null}
                  phase={getPhaseFromCategory()}
                  sectionSlug={getSectionSlug()}
                  contentJson={contentJson}
                  economistFields={null}
                />
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar: Metadata */}
        <RightSidebar
          sections={sections}
          sectionsLoading={sectionsLoading}
          sectionId={sectionId}
          onSectionChange={setSectionId}
          categories={categories}
          categoriesLoading={categoriesLoading}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          slug={slug}
          onSlugChange={handleSlugChange}
          status={status}
          onStatusChange={setStatus}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview(p => !p)}
          moduleId={moduleId}
          onModuleIdChange={setModuleId}
          financeSection={financeSection}
          onFinanceSectionChange={setFinanceSection}
          financeOrder={financeOrder}
          onFinanceOrderChange={setFinanceOrder}
          lessonType={lessonType}
          onLessonTypeChange={setLessonType}
          fsliSlug={fsliSlug}
          onFsliSlugChange={setFsliSlug}
          topic={topic}
          onTopicChange={setTopic}
          currentSectionSlug={getSectionSlug()}
        />
      </div>
    </div>
  );
}
