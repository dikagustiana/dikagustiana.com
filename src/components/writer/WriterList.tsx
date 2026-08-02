import { essayUrl } from '@/lib/essayUrl';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  Edit3, 
  Eye, 
  Clock, 
  Calendar,
  ArrowLeft,
  FileText,
  Send,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WriterListProps {
  section: string;
}

interface Essay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  status: string | null;
  phase: string | null;
  category_id: string | null;
  section: string | null;
  finance_section: string | null;
  fsli_slug: string | null;
  topic: string | null;
  finance_modules: { slug: string; track_slug: string } | null;
  updated_at: string;
  created_at: string;
}

export function WriterList({ section }: WriterListProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: essays, isLoading } = useQuery({
    queryKey: ['writer-essays', section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        // Placement columns + the module join are what let essayUrl build the
        // four-segment finance URL for the View-live button.
        .select(`
          id, slug, title, snippet, author, date, read_time, status, phase,
          category_id, section, finance_section, fsli_slug, topic,
          updated_at, created_at,
          finance_modules!essays_module_id_fkey ( slug, track_slug )
        `)
        .eq('section', section)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Essay[];
    },
  });

  const filteredEssays = essays?.filter(essay => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      essay.title.toLowerCase().includes(query) ||
      essay.slug.toLowerCase().includes(query) ||
      (essay.snippet && essay.snippet.toLowerCase().includes(query))
    );
  });

  // Archived essays are deliberately absent here: this list is the working
  // set. They stay visible — with a badge and a Restore button — in
  // /admin/content, which is the full inventory.
  const drafts = filteredEssays?.filter(e => e.status !== 'published' && e.status !== 'archived') || [];
  const published = filteredEssays?.filter(e => e.status === 'published') || [];

  const sectionLabelMap: Record<string, string> = {
    'next-big-thing': 'The Next Big Thing',
    'green-transition': 'Green Transition',
    finance: 'Finance',
    'critical-thinking': 'Critical Thinking',
  };
  const sectionPathMap: Record<string, string> = {
    'next-big-thing': '/the-next-big-thing',
    'green-transition': '/green-transition',
    finance: '/finance',
    'critical-thinking': '/critical-thinking-research',
  };
  const sectionLabel = sectionLabelMap[section] || section;
  const sectionPath = sectionPathMap[section] || `/${section}`;

  // One canonical builder — see src/lib/essayUrl.ts. Returns null when no
  // real route can be produced, and the card then hides its View-live link
  // rather than offering a dead one.
  const getPublicUrl = (essay: Essay) =>
    essayUrl({
      slug: essay.slug,
      section: essay.section ?? section,
      phase: essay.phase,
      track: essay.finance_modules?.track_slug ?? essay.finance_section ?? null,
      moduleSlug: essay.finance_modules?.slug ?? null,
      fsliSlug: essay.fsli_slug,
      topic: essay.topic,
    });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  if (!isAdmin) {
    return (
      <PageLayout role="manager" variant="dashboard">
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      role="manager"
      variant="dashboard"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Admin', path: '/admin/content' },
        { label: `Writer: ${sectionLabel}` },
      ]}
    >
      <SEO 
        title={`Writer: ${sectionLabel}`} 
        description={`Manage essays for ${sectionLabel}`} 
      />

      <div className="container max-w-5xl py-8">
        {/* Header */}
        {/* Wraps at narrow widths — the two action buttons plus the title were
            301px of unbreakable row and pushed /admin/writer/:section/list to
            466px on a 375px screen. */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/admin/content')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold break-words">{sectionLabel}</h1>
              <p className="text-muted-foreground text-sm">
                {essays?.length || 0} essays • {drafts.length} drafts • {published.length} published
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <a href={sectionPath} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" />
                View Section
              </a>
            </Button>
            <Button onClick={() => navigate(`/admin/writer/${section}/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Essay
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search essays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Drafts Section */}
            {drafts.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Drafts ({drafts.length})
                </h2>
                <div className="space-y-3">
                  {drafts.map(essay => (
                    <EssayCard 
                      key={essay.id} 
                      essay={essay} 
                      section={section}
                      getPublicUrl={getPublicUrl}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Published Section */}
            {published.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Published ({published.length})
                </h2>
                <div className="space-y-3">
                  {published.map(essay => (
                    <EssayCard 
                      key={essay.id} 
                      essay={essay} 
                      section={section}
                      getPublicUrl={getPublicUrl}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredEssays?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No essays yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first essay for {sectionLabel}.
                  </p>
                  <Button onClick={() => navigate(`/admin/writer/${section}/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Essay
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

interface EssayCardProps {
  essay: Essay;
  section: string;
  getPublicUrl: (essay: Essay) => string | null;
  formatDate: (dateStr: string) => string;
}

function EssayCard({ essay, section, getPublicUrl, formatDate }: EssayCardProps) {
  const publicUrl = getPublicUrl(essay);
  const navigate = useNavigate();
  const isPublished = essay.status === 'published';

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => navigate(`/admin/writer/${section}/${essay.slug}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {essay.title || 'Untitled'}
              </h3>
              <Badge 
                variant={isPublished ? 'default' : 'secondary'}
                className="text-xs flex-shrink-0"
              >
                {essay.status || 'draft'}
              </Badge>
            </div>
            
            {essay.snippet && (
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                {essay.snippet}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {essay.author && <span>{essay.author}</span>}
              {essay.read_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {essay.read_time}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Updated {formatDate(essay.updated_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/writer/${section}/${essay.slug}`);
              }}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            {/* View live. Rendered only when a real canonical URL exists —
                offering the button and landing on a 404 is worse than not
                offering it. */}
            {isPublished && publicUrl && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                onClick={(e) => e.stopPropagation()}
                title={`View live: ${publicUrl}`}
              >
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
