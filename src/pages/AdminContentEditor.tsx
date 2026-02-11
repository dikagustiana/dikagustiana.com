/**
 * AdminContentEditor — Writer-first authoring page.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  ← Back   [Section ▾]   (Unsaved)  [Save Draft] [Pub]  │
 *   ├──────────────────────────────────────────────────────────┤
 *   │                                                          │
 *   │  Title of the essay (large, inline input)                │
 *   │                                                          │
 *   │  ──────────────────────────────────────────────          │
 *   │  B I S ~ | H2 H3 | • # | ❝ — | 🖼 | 🔗 | ↶ ↷         │
 *   │  ──────────────────────────────────────────────          │
 *   │                                                          │
 *   │  Start writing here...                                   │
 *   │                                                          │
 *   ├──────────────────────────────────────────────────────────┤
 *   │  ▸ Post Settings (collapsed)                             │
 *   ├──────────────────────────────────────────────────────────┤
 *   │  ▸ Voice & Tone Fields (collapsed)                       │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Rules enforced:
 *   - Editor is visible immediately on load.
 *   - No section selection required to start writing.
 *   - No validation errors during drafting.
 *   - Validation runs only on Publish.
 *   - Section is changeable at any time without losing content.
 *   - Metadata is in a collapsed panel below the editor.
 *   - Canonical format: TipTap JSON.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import type { JSONContent } from '@tiptap/core';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useEssay } from '@/hooks/queries/useEssays';
import { useSections } from '@/hooks/queries/useSections';
import { useUpdateEssay, useCreateEssay } from '@/hooks/queries/useAdminEssays';
import { LoadingState, ErrorState } from '@/components/states';
import { ToneFieldsEditor } from '@/components/admin/ToneFieldsEditor';
import { UnifiedEditor } from '@/components/admin/UnifiedEditor';
import { PostSettingsPanel } from '@/components/admin/PostSettingsPanel';
import { resolveSectionSlug, normalizeSectionValue } from '@/lib/admin/sectionResolution';
import { validateForPublish } from '@/lib/admin/publishValidation';
import type { PublishError } from '@/lib/admin/publishValidation';
import { parseTiptapJson } from '@/lib/tiptap/serialize';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, XCircle, AlertTriangle, ChevronDown, ChevronRight, Mic } from 'lucide-react';
import {
  VoiceRole,
  ContentStatus,
  ManagerFields,
  EconomistFields,
  EducatorFields,
  CoachFields,
} from '@/lib/types/toneFields';
import { EssayTemplateType, applyTemplate, essayTemplates } from '@/lib/essayTemplates';
import { markdownToHtml } from '@/components/admin/RichTextEditor';

export default function AdminContentEditor() {
  const { id: slugParam } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = slugParam === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();

  // Internal database UUID
  const [essayId, setEssayId] = useState<string | null>(null);

  // Data fetching
  const { data: essay, isLoading: essayLoading, error: essayError, refetch: refetchEssay } = useEssay(
    isNew ? '' : (slugParam || ''),
    { enabled: !isNew && !!slugParam }
  );
  const { data: sections, isLoading: sectionsLoading } = useSections();
  const updateEssay = useUpdateEssay();
  const createEssay = useCreateEssay();

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [section, setSection] = useState('');
  const [phase, setPhase] = useState('');
  const [voiceRole, setVoiceRole] = useState<VoiceRole>('hybrid');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [author, setAuthor] = useState('Dika Gustiana');
  const [date, setDate] = useState('');
  const [readTime, setReadTime] = useState('');
  const [snippet, setSnippet] = useState('');
  const [contentJson, setContentJson] = useState<JSONContent | null>(null);

  // Tone fields
  const [managerFields, setManagerFields] = useState<Partial<ManagerFields>>({});
  const [economistFields, setEconomistFields] = useState<Partial<EconomistFields>>({});
  const [educatorFields, setEducatorFields] = useState<Partial<EducatorFields>>({});
  const [coachFields, setCoachFields] = useState<Partial<CoachFields>>({});

  // Template (new essays only)
  const [selectedTemplate, setSelectedTemplate] = useState<EssayTemplateType>('blank');

  // Template HTML for initial editor content (only used for template application)
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const isInitialLoad = useRef(true);

  // Publish validation (only computed on demand)
  const [publishErrors, setPublishErrors] = useState<PublishError[]>([]);
  const [publishWarnings, setPublishWarnings] = useState<PublishError[]>([]);
  const [showPublishErrors, setShowPublishErrors] = useState(false);

  // Tone fields panel
  const [toneOpen, setToneOpen] = useState(false);

  // ── Section resolution ──
  const sectionValue = useMemo(() => normalizeSectionValue(section), [section]);
  const resolvedSlug = useMemo(() => resolveSectionSlug(sectionValue, sections), [sectionValue, sections]);
  const sectionValidated = useMemo(() => {
    if (!resolvedSlug) return false;
    if (!sections || sections.length === 0) return false;
    return sections.some((s) => s.slug === resolvedSlug);
  }, [resolvedSlug, sections]);

  // ── Initialize from URL params (deep-linking) ──
  useEffect(() => {
    if (isNew) {
      const urlSection = searchParams.get('section');
      const urlPhase = searchParams.get('phase');
      if (urlSection) setSection(urlSection.trim());
      if (urlPhase) setPhase(urlPhase.trim());
    }
  }, [isNew, searchParams]);

  // ── Sync section ID → slug when sections list loads ──
  useEffect(() => {
    if (!isNew || !sections || sections.length === 0) return;
    if (!sectionValue || !resolvedSlug || sectionValue === resolvedSlug) return;
    setSection(resolvedSlug);
  }, [isNew, sectionValue, resolvedSlug, sections]);

  // ── Set voice role from section default ──
  useEffect(() => {
    if (resolvedSlug && sections && !essay?.voice_role) {
      const sectionData = sections.find((s) => s.slug === resolvedSlug);
      if (sectionData) {
        setVoiceRole(sectionData.voice_role as VoiceRole);
      }
    }
  }, [resolvedSlug, sections, essay?.voice_role]);

  // ── Load essay data when editing ──
  useEffect(() => {
    if (essay && !isNew) {
      isInitialLoad.current = true;
      setEssayId(essay.id);
      setTitle(essay.title || '');
      setSlug(essay.slug || '');
      setSection(normalizeSectionValue(essay.section));
      setPhase((essay.phase || '').trim());
      setVoiceRole((essay.voice_role as VoiceRole) || 'hybrid');
      setStatus((essay.status as ContentStatus) || (essay.published ? 'published' : 'draft'));
      setAuthor(essay.author || 'Dika Gustiana');
      setDate(essay.date || '');
      setReadTime(essay.read_time || '');
      setSnippet(essay.snippet || '');

      // Parse content: might be TipTap JSON or legacy HTML
      const rawContent = essay.content || '';
      const parsed = parseTiptapJson(rawContent);
      if (parsed) {
        setContentJson(parsed);
      } else {
        // Legacy HTML — will be loaded into TipTap editor which parses HTML natively
        setContentJson(null);
      }

      setManagerFields(essay.manager_fields as Partial<ManagerFields> || {});
      setEconomistFields(essay.economist_fields as Partial<EconomistFields> || {});
      setEducatorFields(essay.educator_fields as Partial<EducatorFields> || {});
      setCoachFields(essay.coach_fields as Partial<CoachFields> || {});

      setTimeout(() => {
        isInitialLoad.current = false;
        setIsDirty(false);
      }, 100);
    }
  }, [essay, isNew]);

  // ── Auto-generate slug from title (new essays only) ──
  useEffect(() => {
    if (isNew && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [title, isNew]);

  // ── Track dirty state ──
  useEffect(() => {
    if (isInitialLoad.current) return;
    setIsDirty(true);
    // Clear publish errors when content changes
    if (showPublishErrors) setShowPublishErrors(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, section, phase, voiceRole, status, author, date, readTime, snippet, contentJson, managerFields, economistFields, educatorFields, coachFields]);

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

  // ── Template handling ──
  const handleTemplateSelect = (templateId: EssayTemplateType) => {
    setSelectedTemplate(templateId);
    if (templateId === 'blank') return;
    const template = essayTemplates[templateId];
    const { title: tTitle, snippet: tSnippet, content: tContent } = applyTemplate(
      templateId,
      template.keyPoints || [],
      template.steps || [],
    );
    setTitle(tTitle);
    setSnippet(tSnippet);
    // Template content is markdown — convert to HTML for TipTap to parse
    const html = markdownToHtml(tContent);
    setContentJson(null);
    setTemplateHtml(html);
  };

  // ── Image upload handler ──
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'png';
    const folder = resolvedSlug || 'drafts';
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('essay-images')
      .upload(filename, file, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      toast({
        title: 'Upload failed',
        description: uploadError.message,
        variant: 'destructive',
      });
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('essay-images')
      .getPublicUrl(filename);

    toast({ title: 'Image uploaded!' });
    return urlData.publicUrl;
  }, [resolvedSlug, toast]);

  // ── Content change handler ──
  const handleContentChange = useCallback((json: JSONContent) => {
    setContentJson(json);
    if (templateHtml) setTemplateHtml(null);
  }, [templateHtml]);

  // ── Helpers for tone fields ──
  const hasContent = (fields: Record<string, unknown> | null | undefined): boolean => {
    if (!fields || typeof fields !== 'object') return false;
    return Object.values(fields).some(v =>
      v !== null && v !== undefined && v !== '' &&
      (Array.isArray(v) ? v.length > 0 : true)
    );
  };

  // ── Save / Publish ──
  const handleSave = async (targetStatus: ContentStatus = status) => {
    // For save-as-draft: only require title
    if (targetStatus !== 'published' && !title.trim()) {
      toast({
        title: 'Title required',
        description: 'Add a title before saving.',
        variant: 'destructive',
      });
      return;
    }

    // For publish: run full validation
    if (targetStatus === 'published') {
      const result = validateForPublish({
        title,
        slug,
        resolvedSection: resolvedSlug,
        sectionValidated,
        contentJson,
        voiceRole,
        managerFields,
        economistFields,
        educatorFields,
        coachFields,
      });

      if (!result.canPublish) {
        setPublishErrors(result.errors);
        setPublishWarnings(result.warnings);
        setShowPublishErrors(true);

        // Scroll to the first error target
        const firstTarget = result.errors[0]?.scrollTarget;
        if (firstTarget) {
          const el = document.querySelector(firstTarget);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        toast({
          title: 'Cannot publish',
          description: `${result.errors.length} issue${result.errors.length === 1 ? '' : 's'} must be fixed.`,
          variant: 'destructive',
        });
        return;
      }

      setPublishWarnings(result.warnings);
    }

    // Serialize content to canonical TipTap JSON string
    const contentString = contentJson ? JSON.stringify(contentJson) : '';

    // Build tone fields payload
    const getToneFieldsData = () => ({
      manager_fields: hasContent(managerFields) ? managerFields : null,
      economist_fields: hasContent(economistFields) ? economistFields : null,
      educator_fields: hasContent(educatorFields) ? educatorFields : null,
      coach_fields: hasContent(coachFields) ? coachFields : null,
    });

    const isPublished = targetStatus === 'published';

    // Generate slug from title if empty
    const finalSlug = slug.trim() || title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const essayData = {
      title: title.trim(),
      slug: finalSlug,
      section: resolvedSlug || sectionValue || '',
      phase: phase || null,
      voice_role: voiceRole,
      status: targetStatus,
      published: isPublished,
      author,
      date: date || null,
      read_time: readTime || null,
      snippet: snippet || null,
      content: contentString,
      ...getToneFieldsData(),
    };

    try {
      if (isNew) {
        await createEssay.mutateAsync(essayData);
        toast({ title: 'Created', description: 'Essay created successfully.' });
      } else if (essayId) {
        await updateEssay.mutateAsync({ id: essayId, data: essayData });
        toast({ title: 'Saved', description: 'Essay updated successfully.' });
      } else {
        toast({ title: 'Error', description: 'Essay ID not found.', variant: 'destructive' });
        return;
      }
      setIsDirty(false);
      setShowPublishErrors(false);
      navigate('/admin/content');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  // ── Access denied ──
  if (!authLoading && !isAdmin) {
    return (
      <PageLayout variant="dashboard" role="manager" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Admin' }, { label: 'Content', path: '/admin/content' }, { label: isNew ? 'New' : 'Edit' }]}>
        <SEO title="Admin Content Editor" description="Edit content" />
        <div className="container py-12">
          <div className="max-w-md mx-auto py-12 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You must be an admin to access this page.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ── Loading existing essay ──
  if (!isNew && essayLoading) {
    return (
      <PageLayout variant="dashboard" role="manager" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Admin' }, { label: 'Content', path: '/admin/content' }, { label: 'Loading...' }]}>
        <SEO title="Loading..." description="Loading content editor" />
        <div className="container py-8">
          <LoadingState />
        </div>
      </PageLayout>
    );
  }

  if (!isNew && essayError) {
    return (
      <PageLayout variant="dashboard" role="manager" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Admin' }, { label: 'Content', path: '/admin/content' }, { label: 'Error' }]}>
        <SEO title="Error" description="Error loading content" />
        <div className="container py-8">
          <ErrorState onRetry={() => void refetchEssay()} />
        </div>
      </PageLayout>
    );
  }

  // Compute initial content for the editor
  const editorInitialContent = (() => {
    if (templateHtml) return templateHtml;
    if (contentJson) return contentJson;
    if (!isNew && essay?.content) return essay.content;
    return undefined;
  })();

  return (
    <PageLayout
      variant="dashboard"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Admin' },
        { label: 'Content', path: '/admin/content' },
        { label: isNew ? 'New Essay' : title || 'Edit' },
      ]}
    >
      <SEO
        title={isNew ? 'New Essay' : `Edit: ${title}`}
        description="Content editor"
      />

      <div className="container py-4 max-w-4xl">
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/content')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Section selector — always visible, never blocking */}
            <div className="min-w-[160px]">
              {sectionsLoading ? (
                <div className="h-9 rounded-md bg-muted animate-pulse w-40" />
              ) : (
                <Select value={sectionValue} onValueChange={(v) => setSection(v.trim())}>
                  <SelectTrigger className="h-9 text-sm" id="section-selector">
                    <SelectValue placeholder="Section (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections?.map((s) => (
                      <SelectItem key={s.id} value={s.slug}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave('draft')}
              disabled={updateEssay.isPending || createEssay.isPending}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave('published')}
              disabled={updateEssay.isPending || createEssay.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>

        {/* ── Publish validation errors (shown ONLY after clicking Publish) ── */}
        {showPublishErrors && publishErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Publish</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {publishErrors.map((err, i) => (
                  <li
                    key={i}
                    className="cursor-pointer hover:underline"
                    onClick={() => {
                      if (err.scrollTarget) {
                        const el = document.querySelector(err.scrollTarget);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    {err.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {showPublishErrors && publishWarnings.length > 0 && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-600">Warnings</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              <ul className="list-disc list-inside mt-1 space-y-1">
                {publishWarnings.map((warn, i) => (
                  <li key={i}>{warn.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Title (large, writer-first) ── */}
        <input
          id="editor-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          autoFocus={isNew}
          className="w-full text-3xl md:text-4xl font-display font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 mb-4 px-0"
        />

        {/* ── Editor (occupies 70%+ of viewport) ── */}
        <UnifiedEditor
          key={templateHtml ? `tpl-${selectedTemplate}` : `essay-${essayId || 'new'}`}
          initialContent={editorInitialContent}
          onChange={handleContentChange}
          onImageUpload={handleImageUpload}
          placeholder="Start writing..."
          autoFocus={!isNew}
          minHeight="60vh"
        />

        {/* ── Post Settings (collapsed by default) ── */}
        <div className="mt-6 space-y-4">
          <PostSettingsPanel
            sections={sections}
            sectionsLoading={sectionsLoading}
            sectionValue={sectionValue}
            onSectionChange={(v) => setSection(v)}
            phase={phase}
            onPhaseChange={setPhase}
            voiceRole={voiceRole}
            onVoiceRoleChange={setVoiceRole}
            status={status}
            onStatusChange={setStatus}
            slug={slug}
            onSlugChange={setSlug}
            author={author}
            onAuthorChange={setAuthor}
            date={date}
            onDateChange={setDate}
            readTime={readTime}
            onReadTimeChange={setReadTime}
            snippet={snippet}
            onSnippetChange={setSnippet}
            isNew={isNew}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />

          {/* ── Tone Fields (collapsed by default) ── */}
          <Collapsible open={toneOpen} onOpenChange={setToneOpen} id="tone-fields">
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-border transition-colors">
              <Mic className="h-4 w-4" />
              <span className="flex-1 text-left">Voice & Tone Fields</span>
              {toneOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ToneFieldsEditor
                role={voiceRole}
                managerFields={managerFields}
                economistFields={economistFields}
                educatorFields={educatorFields}
                coachFields={coachFields}
                onManagerFieldsChange={setManagerFields}
                onEconomistFieldsChange={setEconomistFields}
                onEducatorFieldsChange={setEducatorFields}
                onCoachFieldsChange={setCoachFields}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </PageLayout>
  );
}
