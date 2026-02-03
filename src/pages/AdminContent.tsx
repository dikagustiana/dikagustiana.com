import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminEssays, useBulkPublish, useDeleteEssay } from '@/hooks/queries/useAdminEssays';
import { useSections } from '@/hooks/queries/useSections';
import { LoadingState, ErrorState, EmptyState } from '@/components/states';
import { contentTemplates, validateContentAgainstTemplate } from '@/components/admin/ContentTemplates';
import { VoiceRole } from '@/components/layouts/PageLayout';
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
import { useToast } from '@/hooks/use-toast';
import {
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface ContentHealth {
  score: number;
  missingFields: string[];
  violations: string[];
}

function calculateContentHealth(
  essay: { content: string | null; voice_role: string | null; snippet: string | null },
  sectionVoiceRole: VoiceRole
): ContentHealth {
  const role = (essay.voice_role as VoiceRole) || sectionVoiceRole || 'hybrid';
  const template = contentTemplates[role];
  const content = essay.content || '';
  const snippet = essay.snippet || '';
  const fullText = `${snippet} ${content}`;

  const missingFields: string[] = [];
  const violations: string[] = [];

  // Check for required field indicators in content
  template.fields.forEach((field) => {
    if (field.required) {
      const fieldLabel = field.label.toLowerCase();
      if (!fullText.toLowerCase().includes(fieldLabel.split(' ')[0])) {
        missingFields.push(field.label);
      }
    }
  });

  // Check for forbidden patterns
  const validation = validateContentAgainstTemplate(fullText, role);
  violations.push(...validation.violations);

  // Calculate score (0-100)
  const totalChecks = template.fields.filter((f) => f.required).length + template.forbiddenPatterns.length;
  const passedChecks = totalChecks - missingFields.length - violations.length;
  const score = Math.max(0, Math.round((passedChecks / totalChecks) * 100));

  return { score, missingFields, violations };
}

function getHealthBadge(score: number) {
  if (score >= 80) {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {score}%
      </Badge>
    );
  }
  if (score >= 50) {
    return (
      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
        <AlertCircle className="h-3 w-3 mr-1" />
        {score}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="bg-destructive/10">
      <XCircle className="h-3 w-3 mr-1" />
      {score}%
    </Badge>
  );
}

export default function AdminContent() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: essays, isLoading, error, refetch } = useAdminEssays(sectionFilter);
  const { data: sections } = useSections();
  const bulkPublish = useBulkPublish();
  const deleteEssay = useDeleteEssay();

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

  const sectionVoiceMap: Record<string, VoiceRole> = {};
  sections?.forEach((s) => {
    sectionVoiceMap[s.slug] = s.voice_role as VoiceRole;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && essays) {
      setSelectedIds(essays.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkPublish = async (published: boolean) => {
    if (selectedIds.length === 0) {
      toast({ title: 'No items selected', variant: 'destructive' });
      return;
    }

    try {
      await bulkPublish.mutateAsync({ ids: selectedIds, published });
      toast({
        title: published ? 'Published' : 'Unpublished',
        description: `${selectedIds.length} items updated.`,
      });
      setSelectedIds([]);
    } catch {
      toast({ title: 'Error', description: 'Failed to update items.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    try {
      await deleteEssay.mutateAsync(id);
      toast({ title: 'Deleted', description: `"${title}" has been deleted.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete item.', variant: 'destructive' });
    }
  };

  // Calculate stats
  const stats = essays
    ? {
        total: essays.length,
        published: essays.filter((e) => e.published).length,
        draft: essays.filter((e) => !e.published).length,
        healthy: essays.filter((e) => {
          const health = calculateContentHealth(e, sectionVoiceMap[e.section] || 'hybrid');
          return health.score >= 80;
        }).length,
      }
    : { total: 0, published: 0, draft: 0, healthy: 0 };

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
      manifesto="Content must match its voice. Check health scores. Fix violations before publishing."
    >
      <SEO title="Admin Content" description="Content management dashboard for Dika's Digital Studio" />

      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Content Dashboard</h1>
            <p className="text-muted-foreground">
              Manage essays, check content health, publish/unpublish in bulk.
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button asChild>
              <Link to="/admin/content/new">
                <Plus className="h-4 w-4 mr-2" />
                New Essay
              </Link>
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Published</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.published}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Draft</CardDescription>
              <CardTitle className="text-2xl text-amber-600">{stats.draft}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Healthy (80%+)</CardDescription>
              <CardTitle className="text-2xl text-primary">{stats.healthy}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections?.map((section) => (
                      <SelectItem key={section.id} value={section.slug}>
                        {section.name}
                      </SelectItem>
                    ))}
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
          <ErrorState onRetry={() => refetch()} />
        ) : !essays || essays.length === 0 ? (
          <EmptyState
            title="No content found"
            message="No essays match the current filter."
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === essays.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {essays.map((essay) => {
                  const voiceRole = (essay.voice_role as VoiceRole) || sectionVoiceMap[essay.section] || 'hybrid';
                  const health = calculateContentHealth(essay, voiceRole);

                  return (
                    <TableRow key={essay.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(essay.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(essay.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{essay.title}</div>
                          <div className="text-xs text-muted-foreground">/{essay.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {essay.section}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {voiceRole}
                        </Badge>
                      </TableCell>
                      <TableCell>{getHealthBadge(health.score)}</TableCell>
                      <TableCell>
                        {essay.published ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(essay.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(essay.id, essay.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
