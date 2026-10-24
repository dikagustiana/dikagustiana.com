/**
 * /admin/toolkits (docs/prd/finance-restructure §1 E, §3), behind RequireAdmin: the toolkits with their
 * status and versions on one side, the publish form on the other (a new toolkit, or a new version of the
 * chosen one). RLS is what stops anyone else: every write is admin-only, and the database refuses a
 * publish whose attestations are not both true.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToolkitForm } from '@/components/toolkits/ToolkitForm';
import { TOOLKITS_PATH, formatDate, useAdminToolkits, useFinanceModuleOptions } from '@/hooks/queries/useToolkits';

export default function AdminToolkits() {
  const { data: toolkits, isLoading, error, refetch } = useAdminToolkits();
  const { data: modules } = useFinanceModuleOptions();
  const [selected, setSelected] = useState<string | null>(null);
  // Bumped after each publish so the form remounts empty, the boxes unticked again.
  const [round, setRound] = useState(0);
  const toolkit = toolkits?.find((t) => t.id === selected) ?? null;
  const takenSlugs = useMemo(() => toolkits?.map((t) => t.slug) ?? [], [toolkits]);

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Admin', path: '/admin/dashboard' }, { label: 'Toolkits' }]}
    >
      <SEO title="Toolkits — Admin" description="Publish toolkit files." noindex />
      <div className="container max-w-5xl py-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Toolkits</h1>
          <Link to={TOOLKITS_PATH} className="text-sm text-accent hover:underline">
            Open /finance/toolkits
          </Link>
        </div>
        {error ? (
          <ErrorState title="Couldn't load the toolkits" message="The list could not be fetched just now." onRetry={() => refetch()} />
        ) : isLoading ? (
          <LoadingState />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <section aria-labelledby="toolkits-list">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="toolkits-list" className="text-lg font-semibold">
                  All toolkits
                </h2>
                <Button type="button" size="sm" variant="outline" onClick={() => setSelected(null)}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden /> New toolkit
                </Button>
              </div>
              {toolkits && toolkits.length > 0 ? (
                <ul className="divide-y divide-border border-y border-border">
                  {toolkits.map((t) => {
                    const latest = t.toolkit_versions[0];
                    return (
                      <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-medium">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {latest ? `v${latest.version} · ${formatDate(latest.published_at)} · ${t.toolkit_versions.length} version(s)` : 'No version yet'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={t.status === 'published' ? 'default' : 'outline'}>{t.status === 'published' ? 'Published' : 'Draft'}</Badge>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(t.id)} aria-label={`New version of ${t.title}`}>
                            New version
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm italic text-muted-foreground">No toolkit yet.</p>
              )}
            </section>
            <section aria-labelledby="toolkit-form">
              <h2 id="toolkit-form" className="mb-3 text-lg font-semibold">
                {toolkit ? `New version of ${toolkit.title}` : 'New toolkit'}
              </h2>
              <ToolkitForm
                key={`${toolkit?.id ?? 'new'}-${round}`}
                toolkit={toolkit}
                modules={modules ?? []}
                takenSlugs={takenSlugs}
                onDone={() => {
                  setSelected(null);
                  setRound((r) => r + 1);
                }}
              />
            </section>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
