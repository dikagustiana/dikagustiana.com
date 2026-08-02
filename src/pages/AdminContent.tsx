import { absoluteEssayUrl } from '@/lib/essayUrl';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedContent, useContentStats, useBulkPublishContent, useDeleteContent, useRestoreContent, useTogglePublishContent, useToggleSelectContent, ContentType } from '@/hooks/queries/useUnifiedContent';
import { useSections } from '@/hooks/queries/useSections';
import { LoadingState, ErrorState, EmptyState } from '@/components/states';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  FileText,
  RefreshCw,
  Plus,
  Calculator,
  ExternalLink,
  XCircle,
  Search,
  Pencil,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Inbox,
  Users,
  Star,
} from 'lucide-react';

// Section labels
const sectionLabels: Record<string, string> = {
  'next-big-thing': 'Next Big Thing',
  'green-transition': 'Green Transition',
  finance: 'Finance',
  accounting: 'Accounting',
  'critical-thinking': 'Critical Thinking',
  books: 'Books',
  ielts: 'IELTS',
  tools: 'Tools',
};


// Metadata warnings
function getMetadataWarnings(item: {
  snippet: string | null;
  status: string | null;
  voice_role: string | null;
  type: ContentType;
}): string[] {
  const warnings: string[] = [];
  if (item.type === 'fsli') return warnings;
  if (!item.snippet) warnings.push('No snippet/deck');
  if (!item.voice_role) warnings.push('No voice role');
  return warnings;
}

// Filter sections
const allSections = [
  { slug: 'all', name: 'All Sections' },
  { slug: 'accounting', name: 'Accounting' },
  { slug: 'finance', name: 'Finance' },
  { slug: 'green-transition', name: 'Green Transition' },
  { slug: 'next-big-thing', name: 'Next Big Thing' },
  { slug: 'critical-thinking', name: 'Critical Thinking' },
  { slug: 'books', name: 'Books' },
  { slug: 'ielts', name: 'IELTS' },
];

export default function AdminContent() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [needsWorkFilter, setNeedsWorkFilter] = useState(false);

  const { data: sections } = useSections();
  const { data: contentItems, isLoading, error, refetch } = useUnifiedContent({
    section: sectionFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery,
  });
  const { data: stats, refetch: refetchStats } = useContentStats();
  const togglePublish = useTogglePublishContent();
  const toggleSelect = useToggleSelectContent();
  const deleteContent = useDeleteContent();
  const restoreContent = useRestoreContent();

  // Apply "needs work" filter
  const filteredItems = useMemo(() => {
    if (!contentItems) return [];
    if (!needsWorkFilter) return contentItems;
    return contentItems.filter((item) => {
      const warnings = getMetadataWarnings(item);
      return warnings.length > 0 || item.status === 'draft';
    });
  }, [contentItems, needsWorkFilter]);

  const handleRefresh = () => {
    refetch();
    refetchStats();
  };

  if (!authLoading && !isAdmin) {
    return (
      <PageLayout variant="dashboard" role="manager" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Admin' }, { label: 'Content' }]}>
        <SEO title="Admin Content" description="Content management dashboard" />
        <div className="container py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">Admin access required.</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const handleTogglePublish = async (id: string, currentlyPublished: boolean, type: ContentType, title: string) => {
    if (type !== 'essay') return;
    try {
      const result = await togglePublish.mutateAsync({ id, currentlyPublished });
      toast({ title: result.published ? 'Published' : 'Unpublished', description: `"${title}" is now ${result.status}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle.', variant: 'destructive' });
    }
  };

  const handleToggleSelect = async (id: string, currentlySelected: boolean, title: string) => {
    try {
      const result = await toggleSelect.mutateAsync({ id, currentlySelected });
      toast({
        title: result.is_selected ? 'Featured' : 'Unfeatured',
        description: result.is_selected
          ? `"${title}" now appears in the selected sections (if published).`
          : `"${title}" removed from the selected sections.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle featuring.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, type: ContentType, title: string) => {
    // Essays are archived, never hard-deleted: the row and its whole revision
    // history stay, invisible to readers and restorable from this list. The
    // old wording ("cannot be undone") was true and is exactly why it changed.
    const message =
      type === 'essay'
        ? `Archive "${title}"? It disappears from the site but keeps its history, and you can restore it here.`
        : `Delete "${title}"? This cannot be undone.`;
    if (!confirm(message)) return;
    try {
      await deleteContent.mutateAsync({ id, type });
      toast({
        title: type === 'essay' ? 'Archived' : 'Deleted',
        description: type === 'essay' ? `"${title}" is archived and restorable.` : `"${title}" removed.`,
      });
      refetchStats();
    } catch {
      toast({ title: 'Error', description: 'Failed.', variant: 'destructive' });
    }
  };

  const handleRestore = async (id: string, title: string) => {
    try {
      await restoreContent.mutateAsync({ id });
      toast({ title: 'Restored', description: `"${title}" is a draft again.` });
      refetchStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to restore.', variant: 'destructive' });
    }
  };

  const getEditPath = (item: { id: string; type: ContentType; slug: string }) => {
    if (item.type === 'fsli') return `/accounting/${item.slug}`;
    return `/admin/writer/${item.slug}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <PageLayout
      variant="dashboard"
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Admin' }, { label: 'Content' }]}
    >
      <SEO title="Writer's Desk" description="Content management workspace" />

      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Writer's Desk</h1>
            <p className="text-muted-foreground mt-1">Your content at a glance. Write, review, publish.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/admin/writer/new">
                <Plus className="h-4 w-4 mr-2" />
                New Essay
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status cards — quick triage */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <button
            onClick={() => { setStatusFilter('all'); setNeedsWorkFilter(false); }}
            className={`text-left rounded-lg border p-4 transition-colors ${statusFilter === 'all' && !needsWorkFilter ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <span className="text-2xl font-semibold">{stats?.total ?? 0}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('draft'); setNeedsWorkFilter(false); }}
            className={`text-left rounded-lg border p-4 transition-colors ${statusFilter === 'draft' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Drafts</span>
            </div>
            <span className="text-2xl font-semibold">{stats?.draft ?? 0}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('tone_pending'); setNeedsWorkFilter(false); }}
            className={`text-left rounded-lg border p-4 transition-colors ${statusFilter === 'tone_pending' ? 'border-amber-500 bg-amber-500/5' : 'border-border hover:border-amber-500/30'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <span className="text-2xl font-semibold text-amber-600">{stats?.tonePending ?? 0}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('published'); setNeedsWorkFilter(false); }}
            className={`text-left rounded-lg border p-4 transition-colors ${statusFilter === 'published' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Published</span>
            </div>
            <span className="text-2xl font-semibold text-primary">{stats?.published ?? 0}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('all'); setNeedsWorkFilter(true); }}
            className={`text-left rounded-lg border p-4 transition-colors ${needsWorkFilter ? 'border-destructive bg-destructive/5' : 'border-border hover:border-destructive/30'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Needs Work</span>
            </div>
            <span className="text-2xl font-semibold text-destructive">
              {contentItems?.filter(i => getMetadataWarnings(i).length > 0 || i.status === 'draft').length ?? 0}
            </span>
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              {allSections.map((s) => (
                <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content list — card-based for fast scanning */}
        {isLoading ? (
          <LoadingState variant="table" count={5} />
        ) : error ? (
          <ErrorState onRetry={handleRefresh} />
        ) : !filteredItems || filteredItems.length === 0 ? (
          <EmptyState
            title="No content found"
            message={searchQuery ? `No results for "${searchQuery}"` : "No content matches the current filter."}
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
          />
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const warnings = getMetadataWarnings(item);
              const isEssay = item.type === 'essay';
              const sectionLabel = sectionLabels[item.section] || item.section;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="group flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/30 bg-background transition-colors"
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {item.status === 'published' ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" title="Published" />
                    ) : item.status === 'tone_pending' ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Pending" />
                    ) : item.status === 'archived' ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" title="Archived" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" title="Draft" />
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link
                        to={getEditPath(item)}
                        className="font-medium text-foreground hover:text-primary transition-colors truncate"
                      >
                        {item.title || '(Untitled)'}
                      </Link>
                      {item.type === 'fsli' && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          <Calculator className="h-3 w-3 mr-1" />
                          FSLI
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{sectionLabel}</span>
                      {item.phase && <span>{item.phase}</span>}
                      <span>{formatDate(item.updated_at)}</span>
                      {item.snippet && <span className="truncate max-w-[300px] hidden md:inline">{item.snippet}</span>}
                    </div>
                    {/* Metadata warnings */}
                    {warnings.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-amber-600">{warnings.join(' · ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Featured star — the is_selected toggle. Stays visible
                      when on (state must be readable without hovering);
                      appears on hover when off. */}
                  {isEssay && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-pressed={!!item.is_selected}
                      title={item.is_selected ? 'Remove from Selected' : 'Feature in Selected'}
                      className={
                        item.is_selected
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity'
                      }
                      onClick={() => handleToggleSelect(item.id, !!item.is_selected, item.title)}
                    >
                      <Star className={`h-4 w-4 ${item.is_selected ? 'fill-current' : ''}`} />
                    </Button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" asChild title="Edit">
                      <Link to={getEditPath(item)}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    {isEssay && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title={item.published ? 'Unpublish' : 'Publish'}
                        onClick={() => handleTogglePublish(item.id, item.published, item.type, item.title)}
                      >
                        {item.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="View public"
                    >
                      <a
                        href={absoluteEssayUrl({
                          slug: item.slug,
                          section: item.section,
                          phase: item.phase,
                          track: item.finance_modules?.track_slug ?? item.finance_section ?? null,
                          moduleSlug: item.finance_modules?.slug ?? null,
                          fsliSlug: item.fsli_slug,
                          topic: item.topic,
                        }) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    {isEssay && item.status === 'archived' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Restore"
                        onClick={() => handleRestore(item.id, item.title)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id, item.type, item.title)}
                        title={isEssay ? 'Archive' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
