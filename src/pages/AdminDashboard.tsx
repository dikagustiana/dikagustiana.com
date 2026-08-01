import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminEssays } from '@/hooks/queries/useAdminEssays';
import { useSections } from '@/hooks/queries/useSections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Edit3,
  Eye,
  Clock,
  TrendingUp,
  BookOpen,
  XCircle,
  ArrowRight,
  PenLine,
} from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const { data: essays, isLoading: essaysLoading } = useAdminEssays();
  const { data: sections } = useSections();

  // Redirect non-admins
  if (!authLoading && !isAdmin) {
    return (
      <PageLayout
        variant="dashboard"
        role="manager"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Writer\'s Studio' },
        ]}
      >
        <SEO title="Writer's Studio" description="Content creation dashboard" />
        <div className="container py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You must be an admin to access the Writer's Studio.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Calculate stats with status
  const stats = essays
    ? {
        total: essays.length,
        published: essays.filter((e) => e.status === 'published' || (e.published && !e.status)).length,
        tonePending: essays.filter((e) => e.status === 'tone_pending').length,
        drafts: essays.filter((e) => !e.published && (!e.status || e.status === 'draft')).length,
        thisWeek: essays.filter((e) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(e.updated_at) > weekAgo;
        }).length,
      }
    : { total: 0, published: 0, tonePending: 0, drafts: 0, thisWeek: 0 };

  // Recent drafts (last 5 unpublished, sorted by updated_at)
  const recentDrafts = essays
    ?.filter((e) => !e.published)
    .slice(0, 5) || [];

  // Recent published (last 5)
  const recentPublished = essays
    ?.filter((e) => e.published)
    .slice(0, 5) || [];

  return (
    <PageLayout
      variant="dashboard"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Writer\'s Studio' },
      ]}
    >
      <SEO
        title="Writer's Studio"
        description="Your content creation dashboard"
      />

      <div className="container py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Writer's Studio</h1>
          <p className="text-muted-foreground">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}. What would you like to create today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="group hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-accent">
            <Link to="/admin/writer/new">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">New Essay</h3>
                  <p className="text-sm text-muted-foreground">Start writing from scratch</p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/admin/content">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Manage Content</h3>
                  <p className="text-sm text-muted-foreground">Edit, publish, or delete</p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-md transition-shadow cursor-pointer">
            <Link to="/admin/audit-log">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-full bg-muted text-foreground group-hover:bg-muted/80 transition-colors">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Audit Log</h3>
                  <p className="text-sm text-muted-foreground">Who edited what, and when</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Essays
              </CardDescription>
              <CardTitle className="text-3xl">
                {essaysLoading ? '...' : stats.total}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Published
              </CardDescription>
              <CardTitle className="text-3xl text-primary">
                {essaysLoading ? '...' : stats.published}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Tone Pending
              </CardDescription>
              <CardTitle className="text-3xl text-amber-600">
                {essaysLoading ? '...' : stats.tonePending}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-muted-foreground" />
                Drafts
              </CardDescription>
              <CardTitle className="text-3xl text-muted-foreground">
                {essaysLoading ? '...' : stats.drafts}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Active This Week
              </CardDescription>
              <CardTitle className="text-3xl text-accent">
                {essaysLoading ? '...' : stats.thisWeek}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Drafts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-amber-600" />
                  Continue Writing
                </CardTitle>
                <Link to="/admin/content?status=draft">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDrafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No drafts yet. Start writing!</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {recentDrafts.map((draft) => (
                    <li key={draft.id}>
                      <Link
                        to={`/admin/writer/${draft.section || 'finance'}/${draft.slug}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-accent transition-colors">
                            {draft.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs">
                              {draft.section}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(draft.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recently Published */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Recently Published
                </CardTitle>
                <Link to="/admin/content?status=published">
                  <Button variant="ghost" size="sm">
                    View all <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription>Your latest content live on the site</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPublished.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nothing published yet</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {recentPublished.map((essay) => (
                    <li key={essay.id}>
                      <Link
                        to={`/admin/writer/${essay.section || 'finance'}/${essay.slug}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-accent transition-colors">
                            {essay.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
                              Published
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(essay.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sections Overview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Content by Section</CardTitle>
            <CardDescription>Distribution of essays across your site sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sections?.map((section) => {
                const count = essays?.filter((e) => e.section === section.slug).length || 0;
                return (
                  <Link
                    key={section.id}
                    to={`/admin/content?section=${section.slug}`}
                    className="p-4 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-center group"
                  >
                    <p className="text-2xl font-bold text-foreground group-hover:text-accent transition-colors">
                      {count}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {section.name}
                    </p>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
