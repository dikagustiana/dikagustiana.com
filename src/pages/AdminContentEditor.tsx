import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout, VoiceRole } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useEssay } from '@/hooks/queries/useEssays';
import { useSections } from '@/hooks/queries/useSections';
import { useUpdateEssay, useCreateEssay } from '@/hooks/queries/useAdminEssays';
import { LoadingState, ErrorState } from '@/components/states';
import { EssayTemplateForm } from '@/components/admin/EssayTemplateForm';
import { ContentHealthIndicator } from '@/components/admin/ContentHealthIndicator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, XCircle } from 'lucide-react';

export default function AdminContentEditor() {
  const { id } = useParams<{ id: string }>();
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

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [section, setSection] = useState('');
  const [phase, setPhase] = useState('');
  const [voiceRole, setVoiceRole] = useState<VoiceRole>('hybrid');
  const [published, setPublished] = useState(false);
  const [author, setAuthor] = useState('Dika Gustiana');
  const [date, setDate] = useState('');
  const [readTime, setReadTime] = useState('');
  const [templateValues, setTemplateValues] = useState<Record<string, string | string[]>>({});
  const [isValid, setIsValid] = useState(true);
  const [violations, setViolations] = useState<string[]>([]);

  // Load essay data when editing
  useEffect(() => {
    if (essay && !isNew) {
      setTitle(essay.title || '');
      setSlug(essay.slug || '');
      setSection(essay.section || '');
      setPhase(essay.phase || '');
      setVoiceRole((essay.voice_role as VoiceRole) || 'hybrid');
      setPublished(essay.published || false);
      setAuthor(essay.author || 'Dika Gustiana');
      setDate(essay.date || '');
      setReadTime(essay.read_time || '');
      
      // Parse content into template values
      setTemplateValues({
        snippet: essay.snippet || '',
        content: essay.content || '',
        prerequisites: essay.prerequisites || [],
        learning_outcomes: essay.learning_outcomes || [],
      });
    }
  }, [essay, isNew]);

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

  const handleSave = async () => {
    if (!title || !slug || !section) {
      toast({
        title: 'Missing required fields',
        description: 'Title, slug, and section are required.',
        variant: 'destructive',
      });
      return;
    }

    const essayData = {
      title,
      slug,
      section,
      phase: phase || null,
      voice_role: voiceRole,
      published,
      author,
      date: date || null,
      read_time: readTime || null,
      snippet: (templateValues.snippet as string) || null,
      content: (templateValues.content as string) || null,
      prerequisites: (templateValues.prerequisites as string[]) || null,
      learning_outcomes: (templateValues.learning_outcomes as string[]) || null,
    };

    try {
      if (isNew) {
        await createEssay.mutateAsync(essayData);
        toast({ title: 'Created', description: 'Essay created successfully.' });
      } else {
        await updateEssay.mutateAsync({ id: id!, data: essayData });
        toast({ title: 'Saved', description: 'Essay updated successfully.' });
      }
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
            <ContentHealthIndicator
              content={templateValues}
              fullText={`${templateValues.snippet || ''} ${templateValues.content || ''}`}
              role={voiceRole}
            />
            <Button onClick={handleSave} disabled={updateEssay.isPending || createEssay.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isNew ? 'Create' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="flex items-center gap-3 pt-2">
                <Switch id="published" checked={published} onCheckedChange={setPublished} />
                <Label htmlFor="published" className="cursor-pointer">
                  Published
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Voice-Specific Template Form */}
          <EssayTemplateForm
            role={voiceRole}
            initialValues={templateValues}
            onValuesChange={setTemplateValues}
            onContentValidation={(valid, viols) => {
              setIsValid(valid);
              setViolations(viols);
            }}
          />

          {/* Validation Warnings */}
          {violations.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive text-base">Content Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
