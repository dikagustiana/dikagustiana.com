/**
 * FinanceWorkspace — Admin hub for finance content management.
 *
 * Provides:
 *   - Featured essay selector
 *   - Finance section (domain) metadata editor
 *   - Fundamentals core content editor
 *   - Quick links to tools
 */

import { useState } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { BarChart3, Calculator, Star, Layers, BookOpen, Save, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFinanceSettings,
  useUpdateFinanceSetting,
  useFinanceSections,
  useUpdateFinanceSection,
  useFinanceFundamentals,
  useUpdateFundamental,
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
  const { data: fundamentals, isLoading: fundamentalsLoading } = useFinanceFundamentals();

  // Mutations
  const updateSetting = useUpdateFinanceSetting();
  const updateSection = useUpdateFinanceSection();
  const updateFundamental = useUpdateFundamental();

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

  return (
    <PageLayout variant="content" role="manager" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Finance Workspace' }]}>
      <main className="flex-1 container py-8 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          Finance Workspace
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Manage finance content, sections, and fundamentals.
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

          {/* Fundamentals Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Fundamentals
              </CardTitle>
              <CardDescription>
                Edit core content for each of the 12 foundational concepts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fundamentalsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : fundamentals && fundamentals.length > 0 ? (
                <div className="space-y-6">
                  {fundamentals.map((f) => (
                    <FundamentalEditor
                      key={f.id}
                      title={f.title}
                      initialContent={f.framing_content || ''}
                      sortOrder={f.sort_order}
                      onSave={async (framingContent) => {
                        await updateFundamental.mutateAsync({
                          id: f.id,
                          data: { framing_content: framingContent },
                        });
                        toast({ title: `${f.title} updated` });
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No fundamentals found.</p>
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

function FundamentalEditor({ title, initialContent, sortOrder, onSave }: {
  title: string;
  initialContent: string;
  sortOrder: number;
  onSave: (coreContent: string) => Promise<void>;
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const dirty = content !== initialContent;

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground tabular-nums">
            {String(sortOrder).padStart(2, '0')}
          </span>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {dirty && (
          <Button size="sm" variant="outline" onClick={async () => {
            setSaving(true);
            try { await onSave(content); } finally { setSaving(false); }
          }} disabled={saving}>
            {saving ? <Check className="h-3 w-3 mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save
          </Button>
        )}
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Core content for this fundamental..."
        rows={3}
      />
    </div>
  );
}
