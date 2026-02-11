import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedContent, useContentStats, useBulkPublishContent, useDeleteContent, useTogglePublishContent, ContentType } from '@/hooks/queries/useUnifiedContent';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Eye,
  EyeOff,
  Trash2,
  FileText,
  RefreshCw,
  Plus,
  Calculator,
  ExternalLink,
  XCircle,
  Search,
  Copy,
  Check,
} from 'lucide-react';

// Content type labels and icons
const contentTypeConfig: Record<ContentType, { label: string; icon: React.ReactNode; color: string }> = {
  essay: { label: 'Essay', icon: <FileText className="h-3 w-3" />, color: 'bg-primary/10 text-primary border-primary/20' },
  fsli: { label: 'FSLI', icon: <Calculator className="h-3 w-3" />, color: 'bg-accent/10 text-accent-foreground border-accent/20' },
};

// Extended sections for filtering
const allSections = [
  { slug: 'all', name: 'All Sections' },
  { slug: 'accounting', name: 'Accounting (FSLI)' },
  { slug: 'finance', name: 'Finance' },
  { slug: 'green-transition', name: 'Green Transition' },
  { slug: 'next-big-thing', name: 'The Next Big Thing' },
  { slug: 'critical-thinking', name: 'Critical Thinking' },
  { slug: 'books', name: 'Books' },
  { slug: 'ielts', name: 'IELTS' },
  { slug: 'tools', name: 'Tools' },
];

// Get public URL for an essay
const getPublicUrl = (section: string, slug: string, phase?: string, fsliSlug?: string, topic?: string) => {
  const baseUrl = window.location.origin;
  switch (section) {
    case 'green-transition': {
      // Map DB phase to URL segment
      const phaseUrlMap: Record<string, string> = {
        'where-we-are-now': 'now',
        'challenges-ahead': 'gaps',
        'pathways-forward': 'future',
      };
      const phaseUrl = phase ? (phaseUrlMap[phase] || phase) : 'now';
      return `${baseUrl}/green-transition/${phaseUrl}/${slug}`;
    }
    case 'next-big-thing':
      return `${baseUrl}/the-next-big-thing/${slug}`;
    case 'critical-thinking':
      return `${baseUrl}/critical-thinking-research/${phase || 'clarify'}/${slug}`;
    case 'accounting':
      if (phase === 'fsli' && fsliSlug) return `${baseUrl}/accounting/fsli/${fsliSlug}`;
      if (phase === 'consolidated-reporting' && topic) return `${baseUrl}/accounting/consolidation/${topic}`;
      if (phase === 'statutory-reporting') return `${baseUrl}/accounting/statutory-reporting`;
      return `${baseUrl}/accounting`;
    case 'finance':
      if (phase === 'financial-analytics' && topic) return `${baseUrl}/finance-101/financial-analytics/${topic}`;
      if (phase === 'financial-planning-forecasting') return `${baseUrl}/finance-101/financial-planning-forecasting`;
      if (phase === 'budgeting') return `${baseUrl}/finance-101/budgeting`;
      if (phase === 'cfa-prep') return `${baseUrl}/finance-101/cfa-prep`;
      return `${baseUrl}/finance-101`;
    case 'ielts':
      return `${baseUrl}/english-ielts`;
    case 'books':
      return `${baseUrl}/books-academia`;
    default:
      return `${baseUrl}/${section}/${slug}`;
  }
};

export default function AdminContent() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<{ id: string; type: ContentType }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: sections } = useSections();
  const { data: contentItems, isLoading, error, refetch } = useUnifiedContent({
    section: sectionFilter,
    contentType: typeFilter,
    status: statusFilter,
    search: searchQuery,
  });
  const { data: stats, refetch: refetchStats } = useContentStats();
  const bulkPublish = useBulkPublishContent();
  const togglePublish = useTogglePublishContent();
  const deleteContent = useDeleteContent();

  const handleRefresh = () => {
    refetch();
    refetchStats();
  };

  // Redirect non-admins
  if (!authLoading && !isAdmin) {
    return (
      <PageLayout
        variant="dashboard"
        role="manager"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Admin' },
          { label: 'Content' },
        ]}
      >
        <SEO title="Admin Content" description="Content management dashboard" />
        <div className="container py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You must be an admin to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && contentItems) {
      setSelectedIds(contentItems.map((item) => ({ id: item.id, type: item.type })));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, type: ContentType, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, { id, type }]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleBulkPublish = async (published: boolean) => {
    const essayIds = selectedIds.filter(item => item.type === 'essay').map(item => item.id);
    
    if (essayIds.length === 0) {
      toast({ 
        title: 'No essays selected', 
        description: 'Only essays can be published/unpublished. FSLI pages are always public.',
        variant: 'destructive' 
      });
      return;
    }

    try {
      await bulkPublish.mutateAsync({ ids: essayIds, published });
      toast({
        title: published ? 'Published' : 'Unpublished',
        description: `${essayIds.length} essays updated. Status synced.`,
      });
      setSelectedIds([]);
    } catch {
      toast({ title: 'Error', description: 'Failed to update items.', variant: 'destructive' });
    }
  };

  const handleTogglePublish = async (id: string, currentlyPublished: boolean, type: ContentType, title: string) => {
    if (type !== 'essay') {
      toast({ title: 'Cannot toggle', description: 'FSLI pages are always public.', variant: 'destructive' });
      return;
    }

    try {
      const result = await togglePublish.mutateAsync({ id, currentlyPublished });
      toast({
        title: result.published ? 'Published' : 'Unpublished',
        description: `"${title}" is now ${result.status}.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle publish status.', variant: 'destructive' });
    }
  };

  const handleCopyUrl = async (item: { section: string; slug: string; phase?: string | null; fsli_slug?: string | null; topic?: string | null }) => {
    const url = getPublicUrl(item.section, item.slug, item.phase || undefined, item.fsli_slug || undefined, item.topic || undefined);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(item.slug);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Copied', description: 'Public URL copied to clipboard.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy URL.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, type: ContentType, title: string) => {
    const typeLabel = type === 'fsli' ? 'FSLI page' : 'essay';
    if (!confirm(`Delete "${title}"? This ${typeLabel} will be permanently removed.`)) return;

    try {
      await deleteContent.mutateAsync({ id, type });
      toast({ title: 'Deleted', description: `"${title}" has been deleted.` });
      refetchStats();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete item.', variant: 'destructive' });
    }
  };

  const getEditPath = (item: { id: string; type: ContentType; slug: string }) => {
    if (item.type === 'fsli') {
      return `/accounting/${item.slug}`;
    }
    return `/admin/content/${item.slug}`;
  };

  // Merge database sections with static sections for filter
  const filterSections = allSections.map(s => {
    const dbSection = sections?.find(sec => sec.slug === s.slug);
    return dbSection ? { ...s, name: dbSection.name } : s;
  });

  return (
    <PageLayout
      variant="dashboard"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Admin' },
        { label: 'Content' },
      ]}
      showManifesto
      manifesto="Unified content management. All essays and FSLI pages in one place."
    >
      <SEO title="Admin Content" description="Content management dashboard for Dika's Digital Studio" />

      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Content Dashboard</h1>
            <p className="text-muted-foreground">
              Manage all content: essays, FSLI pages, and more.
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button asChild>
              <Link to="/admin/content/new">
                <Plus className="h-4 w-4 mr-2" />
                New Essay
              </Link>
            </Button>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats?.total ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Published</CardDescription>
              <CardTitle className="text-2xl text-primary">{stats?.published ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tone Pending</CardDescription>
              <CardTitle className="text-2xl text-amber-600">{stats?.tonePending ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Draft</CardDescription>
              <CardTitle className="text-2xl text-muted-foreground">{stats?.draft ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Essays</CardDescription>
              <CardTitle className="text-2xl">{stats?.essays ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>FSLI Pages</CardDescription>
              <CardTitle className="text-2xl">{stats?.fsliPages ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search title or slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>

                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by section" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterSections.map((section) => (
                      <SelectItem key={section.slug} value={section.slug}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | ContentType)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="essay">Essays Only</SelectItem>
                    <SelectItem value="fsli">FSLI Only</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="tone_pending">Tone Pending</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                {selectedIds.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selected
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkPublish(true)}
                  disabled={selectedIds.length === 0 || bulkPublish.isPending}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Publish Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkPublish(false)}
                  disabled={selectedIds.length === 0 || bulkPublish.isPending}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Table */}
        {isLoading ? (
          <LoadingState variant="table" count={5} />
        ) : error ? (
          <ErrorState onRetry={handleRefresh} />
        ) : !contentItems || contentItems.length === 0 ? (
          <EmptyState
            title="No content found"
            message={searchQuery ? `No results for "${searchQuery}"` : "No content matches the current filter."}
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === contentItems.length && contentItems.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentItems.map((item) => {
                  const config = contentTypeConfig[item.type];
                  const isSelected = selectedIds.some(s => s.id === item.id);

                  return (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectOne(item.id, item.type, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">/{item.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.section}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {item.voice_role || 'hybrid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === 'published' ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Published
                          </Badge>
                        ) : item.status === 'tone_pending' ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Tone Pending
                          </Badge>
                        ) : item.status === 'archived' ? (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Archived
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Toggle Publish */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePublish(item.id, item.published, item.type, item.title)}
                            title={item.published ? 'Unpublish' : 'Publish'}
                            disabled={item.type !== 'essay'}
                          >
                            {item.published ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {/* Copy URL */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyUrl(item)}
                            title="Copy public URL"
                          >
                            {copiedId === item.slug ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={getEditPath(item)}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(item.id, item.type, item.title)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
