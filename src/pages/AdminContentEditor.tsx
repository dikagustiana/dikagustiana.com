import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useEssay } from '@/hooks/queries/useEssays';
import { useSections } from '@/hooks/queries/useSections';
import { useUpdateEssay, useCreateEssay } from '@/hooks/queries/useAdminEssays';
import { LoadingState, ErrorState } from '@/components/states';
import { ToneFieldsEditor } from '@/components/admin/ToneFieldsEditor';
import { ContentHealthIndicator } from '@/components/admin/ContentHealthIndicator';
import { TemplateSelector } from '@/components/admin/TemplateSelector';
import { DynamicListEditor } from '@/components/admin/DynamicListEditor';
import { RichTextEditor, markdownToHtml, htmlToMarkdown } from '@/components/admin/RichTextEditor';
import { ContentPreview } from '@/components/admin/ContentPreview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, XCircle, AlertTriangle, CheckCircle, Eye, Edit3, Columns } from 'lucide-react';
import { 
  VoiceRole, 
  ContentStatus,
  ManagerFields, 
  EconomistFields, 
  EducatorFields, 
  CoachFields,
  validateToneFields 
} from '@/lib/types/toneFields';
import { EssayTemplateType, applyTemplate, essayTemplates } from '@/lib/essayTemplates';

export default function AdminContentEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const { data: essay, isLoading: essayLoading, error: essayError } = useEssay(
    isNew ? '' : (id || ''),
    { enabled: !isNew && !!id }
  );
  const { data: sections } = useSections();
  const updateEssay = useUpdateEssay();
  const createEssay = useCreateEssay();

  // Template state (only for new essays)
  const [selectedTemplate, setSelectedTemplate] = useState<EssayTemplateType>('blank');
  const [templateApplied, setTemplateApplied] = useState(false);

  // Dynamic lists for templates
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  // Form state
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
  const [content, setContent] = useState('');

  // Tone fields
  const [managerFields, setManagerFields] = useState<Partial<ManagerFields>>({});
  const [economistFields, setEconomistFields] = useState<Partial<EconomistFields>>({});
  const [educatorFields, setEducatorFields] = useState<Partial<EducatorFields>>({});
  const [coachFields, setCoachFields] = useState<Partial<CoachFields>>({});

  // Editor mode state
  const [editorMode, setEditorMode] = useState<'rich' | 'markdown'>('rich');
  const [showPreview, setShowPreview] = useState(true);

  // Validation state
  const [toneValidation, setToneValidation] = useState<{ valid: boolean; missing: string[] }>({ valid: true, missing: [] });

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  const isInitialLoad = useRef(true);

  // Initialize from URL params (for Add Essay from section pages)
  useEffect(() => {
    if (isNew) {
      const urlSection = searchParams.get('section');
      const urlPhase = searchParams.get('phase');
      if (urlSection) setSection(urlSection);
      if (urlPhase) setPhase(urlPhase);
    }
  }, [isNew, searchParams]);

  // Handle template selection
  const handleTemplateSelect = (templateId: EssayTemplateType) => {
    setSelectedTemplate(templateId);
    
    if (templateId === 'blank') {
      // Clear all template-generated content
      setTitle('');
      setSnippet('');
      setContent('');
      setKeyPoints([]);
      setSteps([]);
      setTemplateApplied(false);
      return;
    }

    // Get template defaults for key points and steps
    const template = essayTemplates[templateId];
    const initialKeyPoints = template.keyPoints || [];
    const initialSteps = template.steps || [];
    
    setKeyPoints(initialKeyPoints);
    setSteps(initialSteps);

    // Apply template with initial values
    const { title: tTitle, snippet: tSnippet, content: tContent } = applyTemplate(
      templateId,
      initialKeyPoints,
      initialSteps
    );
    
    setTitle(tTitle);
    setSnippet(tSnippet);
    setContent(tContent);
    setTemplateApplied(true);
  };

  // Update content when key points or steps change (only if template is applied)
  useEffect(() => {
    if (!templateApplied || selectedTemplate === 'blank') return;

    const { content: updatedContent } = applyTemplate(
      selectedTemplate,
      keyPoints,
      steps
    );
    setContent(updatedContent);
  }, [keyPoints, steps, selectedTemplate, templateApplied]);

  // Validate tone fields whenever they change
  useEffect(() => {
    const validation = validateToneFields(voiceRole, managerFields, economistFields, educatorFields, coachFields);
    setToneValidation(validation);
  }, [voiceRole, managerFields, economistFields, educatorFields, coachFields]);

  // Load essay data when editing
  useEffect(() => {
    if (essay && !isNew) {
      // Mark as initial load to prevent dirty tracking
      isInitialLoad.current = true;
      
      setTitle(essay.title || '');
      setSlug(essay.slug || '');
      setSection(essay.section || '');
      setPhase(essay.phase || '');
      setVoiceRole((essay.voice_role as VoiceRole) || 'hybrid');
      setStatus((essay.status as ContentStatus) || (essay.published ? 'published' : 'draft'));
      setAuthor(essay.author || 'Dika Gustiana');
      setDate(essay.date || '');
      setReadTime(essay.read_time || '');
      setSnippet(essay.snippet || '');
      setContent(essay.content || '');
      
      // Load tone fields from database
      if (essay.manager_fields) {
        setManagerFields(essay.manager_fields as Partial<ManagerFields>);
      }
      if (essay.economist_fields) {
        setEconomistFields(essay.economist_fields as Partial<EconomistFields>);
      }
      if (essay.educator_fields) {
        setEducatorFields(essay.educator_fields as Partial<EducatorFields>);
      }
      if (essay.coach_fields) {
        setCoachFields(essay.coach_fields as Partial<CoachFields>);
      }
      
      // Reset dirty state after a short delay to allow state to settle
      setTimeout(() => {
        isInitialLoad.current = false;
        setIsDirty(false);
      }, 100);
    }
  }, [essay, isNew]);

  // Track dirty state when form fields change
  useEffect(() => {
    if (isInitialLoad.current) {
      return;
    }
    setIsDirty(true);
  }, [title, slug, section, phase, voiceRole, status, author, date, readTime, snippet, content, managerFields, economistFields, educatorFields, coachFields]);

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

  // Auto-generate slug from title
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

  // Get voice role from section if not explicitly set
  useEffect(() => {
    if (section && sections && !essay?.voice_role) {
      const sectionData = sections.find(s => s.slug === section);
      if (sectionData) {
        setVoiceRole(sectionData.voice_role as VoiceRole);
      }
    }
  }, [section, sections, essay?.voice_role]);

  const canPublish = toneValidation.valid || voiceRole === 'hybrid';

  const handleSave = async (targetStatus: ContentStatus = status) => {
    if (!title || !slug || !section) {
      toast({
        title: 'Missing required fields',
        description: 'Title, slug, and section are required.',
        variant: 'destructive',
      });
      return;
    }

    // Block publishing without valid tone fields
    if (targetStatus === 'published' && !canPublish) {
      toast({
        title: 'Cannot publish',
        description: `Missing required tone fields: ${toneValidation.missing.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // Get the appropriate tone fields based on role (clears other roles)
    const getToneFieldsData = () => {
      const base = {
        manager_fields: null,
        economist_fields: null,
        educator_fields: null,
        coach_fields: null,
      };
      switch (voiceRole) {
        case 'manager':
          return { ...base, manager_fields: managerFields };
        case 'economist':
          return { ...base, economist_fields: economistFields };
        case 'educator':
          return { ...base, educator_fields: educatorFields };
        case 'coach':
          return { ...base, coach_fields: coachFields };
        default:
          return base;
      }
    };

    const essayData = {
      title,
      slug,
      section,
      phase: phase || null,
      voice_role: voiceRole,
      status: targetStatus,
      published: targetStatus === 'published',
      author,
      date: date || null,
      read_time: readTime || null,
      snippet: snippet || null,
      content: content || null,
      ...getToneFieldsData(),
    };

    try {
      if (isNew) {
        await createEssay.mutateAsync(essayData);
        toast({ title: 'Created', description: 'Essay created successfully.' });
      } else {
        await updateEssay.mutateAsync({ id: id!, data: essayData });
        toast({ title: 'Saved', description: 'Essay updated successfully.' });
      }
      setIsDirty(false);
      navigate('/admin/content');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isNew ? 'create' : 'save'} essay.`,
        variant: 'destructive',
      });
    }
  };

  // Access denied for non-admins
  if (!authLoading && !isAdmin) {
    return (
      <PageLayout
        variant="dashboard"
        role="manager"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Admin' },
          { label: 'Content', path: '/admin/content' },
          { label: isNew ? 'New' : 'Edit' },
        ]}
      >
        <SEO title="Admin Content Editor" description="Edit content" />
        <div className="container py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You must be an admin to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (!isNew && essayLoading) {
    return (
      <PageLayout
        variant="dashboard"
        role="manager"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Admin' },
          { label: 'Content', path: '/admin/content' },
          { label: 'Loading...' },
        ]}
      >
        <SEO title="Loading..." description="Loading content editor" />
        <div className="container py-8">
          <LoadingState />
        </div>
      </PageLayout>
    );
  }

  if (!isNew && essayError) {
    return (
      <PageLayout
        variant="dashboard"
        role="manager"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Admin' },
          { label: 'Content', path: '/admin/content' },
          { label: 'Error' },
        ]}
      >
        <SEO title="Error" description="Error loading content" />
        <div className="container py-8">
          <ErrorState onRetry={() => window.location.reload()} />
        </div>
      </PageLayout>
    );
  }

  // Determine if we should show dynamic lists based on template
  const showKeyPoints = selectedTemplate === 'essay' && isNew;
  const showSteps = selectedTemplate === 'tutorial' && isNew;

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
        description="Content editor for essays"
      />

      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/content')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">
                {isNew ? 'Create New Essay' : 'Edit Essay'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isNew ? 'Fill in the required fields to create a new essay.' : `Editing: ${slug}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isDirty && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            )}
            <ContentHealthIndicator
              content={{ snippet, content }}
              fullText={`${snippet || ''} ${content || ''}`}
              role={voiceRole}
            />
            <Button 
              variant="outline"
              onClick={() => handleSave(status)} 
              disabled={updateEssay.isPending || createEssay.isPending}
            >
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSave('published')} 
              disabled={updateEssay.isPending || createEssay.isPending || !canPublish}
            >
              <Save className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>

        {/* Tone Validation Warning */}
        {!toneValidation.valid && voiceRole !== 'hybrid' && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Publish</AlertTitle>
            <AlertDescription>
              The following tone fields are required for {voiceRole} content: {toneValidation.missing.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {canPublish && voiceRole !== 'hybrid' && (
          <Alert className="mb-6 border-accent/50 bg-accent/10">
            <CheckCircle className="h-4 w-4 text-accent-foreground" />
            <AlertTitle className="text-accent-foreground">Ready to Publish</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              All required tone fields are complete.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Template Selector - Only for new essays */}
          {isNew && (
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              onTemplateSelect={handleTemplateSelect}
            />
          )}

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core metadata for the essay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Essay title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="url-friendly-slug"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="section">Section *</Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections?.map((s) => (
                        <SelectItem key={s.id} value={s.slug}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phase">Phase</Label>
                  <Input
                    id="phase"
                    value={phase}
                    onChange={(e) => setPhase(e.target.value)}
                    placeholder="e.g., now, transition"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voiceRole">Voice Role</Label>
                  <Select value={voiceRole} onValueChange={(v) => setVoiceRole(v as VoiceRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="economist">Economist</SelectItem>
                      <SelectItem value="educator">Educator</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="tone_pending">Tone Pending</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="e.g., January 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="readTime">Read Time</Label>
                  <Input
                    id="readTime"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    placeholder="e.g., 5 min read"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Key Points - Only for Essay template */}
          {showKeyPoints && (
            <DynamicListEditor
              title="Key Points"
              description="Add unlimited key points for your essay. These will be inserted into the content."
              items={keyPoints}
              onItemsChange={setKeyPoints}
              itemLabel="Point"
              placeholder="Enter a key point..."
            />
          )}

          {/* Dynamic Steps - Only for Tutorial template */}
          {showSteps && (
            <DynamicListEditor
              title="Steps"
              description="Add unlimited steps for your tutorial. These will be inserted into the content."
              items={steps}
              onItemsChange={setSteps}
              itemLabel="Step"
              placeholder="Enter a step..."
            />
          )}

          {/* Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>
                    The main content of the essay.
                    {templateApplied && selectedTemplate !== 'blank' && (
                      <span className="text-primary ml-2">
                        (Pre-filled from {essayTemplates[selectedTemplate].name} template)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Editor Mode Toggle */}
                  <div className="flex items-center border border-border rounded-md overflow-hidden">
                    <Button
                      variant={editorMode === 'rich' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setEditorMode('rich')}
                      className="rounded-none border-0 gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      Rich
                    </Button>
                    <Button
                      variant={editorMode === 'markdown' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setEditorMode('markdown')}
                      className="rounded-none border-0 gap-1"
                    >
                      Markdown
                    </Button>
                  </div>
                  <Button
                    variant={showPreview ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="snippet">Snippet (Preview Text)</Label>
                <Textarea
                  id="snippet"
                  value={snippet}
                  onChange={(e) => setSnippet(e.target.value)}
                  placeholder="A brief preview of the content..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Full Content</Label>
                
                {showPreview ? (
                  <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border border-border">
                    <ResizablePanel defaultSize={55} minSize={35}>
                      <div className="h-full">
                        {editorMode === 'rich' ? (
                          <RichTextEditor
                            content={content.startsWith('<') ? content : markdownToHtml(content)}
                            onChange={(html) => {
                              setContent(html);
                              if (templateApplied) setTemplateApplied(false);
                            }}
                            placeholder="Start writing your content..."
                            minHeight="500px"
                            className="border-0 rounded-none"
                          />
                        ) : (
                          <Textarea
                            value={content.startsWith('<') ? htmlToMarkdown(content) : content}
                            onChange={(e) => {
                              setContent(e.target.value);
                              if (templateApplied) setTemplateApplied(false);
                            }}
                            placeholder="Write in markdown..."
                            className="h-full min-h-[500px] font-mono text-sm resize-none border-0 rounded-none focus-visible:ring-0"
                          />
                        )}
                      </div>
                    </ResizablePanel>
                    
                    <ResizableHandle withHandle />
                    
                    <ResizablePanel defaultSize={45} minSize={30}>
                      <div className="h-full overflow-y-auto p-6 bg-muted/30">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-4 font-medium">
                          Live Preview
                        </div>
                        <ContentPreview
                          title={title}
                          snippet={snippet}
                          content={content.startsWith('<') ? content : markdownToHtml(content)}
                          author={author}
                          date={date}
                          readTime={readTime}
                        />
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <div className="min-h-[500px]">
                    {editorMode === 'rich' ? (
                      <RichTextEditor
                        content={content.startsWith('<') ? content : markdownToHtml(content)}
                        onChange={(html) => {
                          setContent(html);
                          if (templateApplied) setTemplateApplied(false);
                        }}
                        placeholder="Start writing your content..."
                        minHeight="500px"
                      />
                    ) : (
                      <Textarea
                        value={content.startsWith('<') ? htmlToMarkdown(content) : content}
                        onChange={(e) => {
                          setContent(e.target.value);
                          if (templateApplied) setTemplateApplied(false);
                        }}
                        placeholder="Write in markdown..."
                        className="min-h-[500px] font-mono text-sm"
                      />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tone-Specific Fields */}
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
        </div>
      </div>
    </PageLayout>
  );
}
