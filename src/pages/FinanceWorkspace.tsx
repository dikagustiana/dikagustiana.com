/**
 * FinanceWorkspace — Admin hub for finance content management.
 *
 * Provides:
 *   - Featured essay selector
 *   - Finance section (domain) metadata editor
 *   - Quick links to tools
 */

import { useEffect, useMemo, useState } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Link } from 'react-router-dom';
import { BarChart3, Calculator, Star, Layers, Save, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  type FinanceModule,
  useAllFinanceModules,
  useFinanceSettings,
  useUpdateFinanceSetting,
  useFinanceSections,
  useUpdateFinanceSection,
  useFinanceEssaysForAdmin,
} from '@/hooks/queries/useFinance';

const toolLinks = [
  {
    title: 'Executive Dashboard',
    description: 'Key financial metrics and KPIs',
    icon: BarChart3,
    path: '/executive-dashboard',
  },
  {
    title: 'Forecasting',
    description: 'Financial planning and forecasting tools',
    icon: Calculator,
    path: '/forecasting/input',
  },
];

export default function FinanceWorkspace() {
  const { toast } = useToast();

  // Data
  const { data: settings, isLoading: settingsLoading } = useFinanceSettings();
  const { data: essays, isLoading: essaysLoading } = useFinanceEssaysForAdmin();
  const { data: sections, isLoading: sectionsLoading } = useFinanceSections();
  const { data: modules, isLoading: modulesLoading, refetch: refetchModules } = useAllFinanceModules();

  // Mutations
  const updateSetting = useUpdateFinanceSetting();
  const updateSection = useUpdateFinanceSection();

  // Featured essay state
  const currentFeaturedId = settings?.featured_finance_essay_id || '';

  const handleFeaturedChange = async (essayId: string) => {
    try {
      await updateSetting.mutateAsync({
        key: 'featured_finance_essay_id',
        value: essayId || null,
      });
      toast({ title: 'Featured essay updated' });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  // Tagline state
  const handleTaglineSave = async (value: string) => {
    try {
      await updateSetting.mutateAsync({
        key: 'finance_tagline',
        value: value || null,
      });
      toast({ title: 'Tagline updated' });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const modulesByTrack = useMemo(() => {
    if (!modules) return [] as Array<{ trackSlug: string; modules: FinanceModule[] }>;

    const groups = modules.reduce((acc, module) => {
      if (!acc[module.track_slug]) {
        acc[module.track_slug] = [];
      }
      acc[module.track_slug].push(module);
      return acc;
    }, {} as Record<string, FinanceModule[]>);

    return Object.entries(groups)
      .map(([trackSlug, trackModules]) => ({
        trackSlug,
        modules: trackModules,
      }))
      .sort((a, b) => a.trackSlug.localeCompare(b.trackSlug));
  }, [modules]);

  return (
    <PageLayout variant="content" role="manager" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Finance Workspace' }]}>
      <main className="flex-1 container py-8 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          Finance Workspace
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Manage finance content and sections.
        </p>

        <div className="space-y-8">
          {/* Featured Essay & Tagline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Landing Page Settings
              </CardTitle>
              <CardDescription>
                Configure the featured essay and tagline shown on /finance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Featured Essay Selector */}
              <div className="space-y-2">
                <Label>Featured Essay</Label>
                {settingsLoading || essaysLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={currentFeaturedId}
                    onValueChange={handleFeaturedChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select featured essay" />
                    </SelectTrigger>
                    <SelectContent>
                      {essays?.filter(e => e.published).map((essay) => (
                        <SelectItem key={essay.id} value={essay.id}>
                          {essay.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Shown prominently at the top of the Finance landing page.
                </p>
              </div>

              {/* Tagline Editor */}
              <TaglineEditor
                initialValue={settings?.finance_tagline || ''}
                loading={settingsLoading}
                onSave={handleTaglineSave}
              />
            </CardContent>
          </Card>

          {/* Modules Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Modules
              </CardTitle>
              <CardDescription>
                Edit module copy and ordering grouped by track.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modulesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : modulesByTrack.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-2">
                  {modulesByTrack.map((group) => (
                    <AccordionItem key={group.trackSlug} value={group.trackSlug} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <span className="font-semibold">{group.trackSlug}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pb-2">
                          {group.modules.map((module) => (
                            <ModuleEditor
                              key={module.id}
                              module={module}
                              onSaved={async () => {
                                await refetchModules();
                              }}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground italic">No modules found.</p>
              )}
            </CardContent>
          </Card>

          {/* Section Metadata Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Section Metadata
              </CardTitle>
              <CardDescription>
                Edit titles and descriptions for finance domain pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sectionsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : sections && sections.length > 0 ? (
                <div className="space-y-6">
                  {sections.map((sec) => (
                    <SectionEditor
                      key={sec.id}
                      initialTitle={sec.title}
                      initialDescription={sec.description || ''}
                      slug={sec.slug}
                      onSave={async (title, description) => {
                        await updateSection.mutateAsync({
                          id: sec.id,
                          data: { title, description },
                        });
                        toast({ title: `${title} updated` });
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No sections found.</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toolLinks.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Card className="h-full hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                    <CardHeader className="pb-2">
                      <item.icon className="h-8 w-8 text-primary mb-1" />
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="text-sm">{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}

/* ── Inline editors ── */

function TaglineEditor({ initialValue, loading, onSave }: {
  initialValue: string;
  loading: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const dirty = value !== initialValue;

  return (
    <div className="space-y-2">
      <Label>Tagline</Label>
      {loading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Finance exists to support decisions..."
          />
          {dirty && (
            <Button size="sm" onClick={async () => {
              setSaving(true);
              try { await onSave(value); } finally { setSaving(false); }
            }} disabled={saving}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function SectionEditor({ initialTitle, initialDescription, slug, onSave }: {
  initialTitle: string;
  initialDescription: string;
  slug: string;
  onSave: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const dirty = title !== initialTitle || description !== initialDescription;

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">/finance/{slug}</code>
        {dirty && (
          <Button size="sm" variant="outline" onClick={async () => {
            setSaving(true);
            try { await onSave(title, description); } finally { setSaving(false); }
          }} disabled={saving}>
            {saving ? <Check className="h-3 w-3 mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save
          </Button>
        )}
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="font-semibold"
        placeholder="Section title"
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short positioning line..."
        rows={2}
      />
    </div>
  );
}

function ModuleEditor({ module, onSaved }: {
  module: FinanceModule;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(module.title);
  const [thesis, setThesis] = useState(module.thesis || '');
  const [sortOrder, setSortOrder] = useState(String(module.sort_order));
  const [framingContent, setFramingContent] = useState(module.framing_content || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(module.title);
    setThesis(module.thesis || '');
    setSortOrder(String(module.sort_order));
    setFramingContent(module.framing_content || '');
  }, [module]);

  const dirty =
    title !== module.title ||
    thesis !== (module.thesis || '') ||
    sortOrder !== String(module.sort_order) ||
    framingContent !== (module.framing_content || '');

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          <code className="bg-muted px-2 py-0.5 rounded">{module.slug}</code>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || saving}
          onClick={async () => {
            setSaving(true);
            try {
              const parsedSortOrder = Number.parseInt(sortOrder, 10);
              if (Number.isNaN(parsedSortOrder)) {
                toast({ title: 'Sort order must be a valid number', variant: 'destructive' });
                return;
              }

              const { error } = await supabase
                .from('finance_fundamentals')
                .update({
                  title,
                  thesis: thesis || null,
                  sort_order: parsedSortOrder,
                  framing_content: framingContent || null,
                })
                .eq('id', module.id);

              if (error) throw error;

              await onSaved();
              toast({ title: `Saved ${title}` });
            } catch {
              toast({ title: 'Failed to save module', variant: 'destructive' });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? <Check className="h-3 w-3 mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Save
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Sort order</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Thesis</Label>
        <Input value={thesis} onChange={(e) => setThesis(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Framing content</Label>
        <Textarea
          rows={5}
          value={framingContent}
          onChange={(e) => setFramingContent(e.target.value)}
        />
      </div>
    </div>
  );
}
