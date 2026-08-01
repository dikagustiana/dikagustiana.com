import { useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Star, Download } from 'lucide-react';
import { useFinanceModelBySlug, useUpdateFinanceModel, type FinanceModel } from '@/hooks/queries/useFinanceModels';
import { useAllFinanceModules, type FinanceModule } from '@/hooks/queries/useFinance';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceModelAdminPanel } from '@/components/finance-in-action/ModelAdminPanel';
import NotFound from './NotFound';

const depthLabel: Record<string, string> = {
  foundation: 'Foundation',
  executive: 'Executive',
  institutional: 'Institutional',
};

function ModuleRefList({ refIds, allModules }: { refIds: string[]; allModules: FinanceModule[] }) {
  if (!refIds.length) return <p className="text-sm text-muted-foreground italic">No module references linked yet.</p>;

  const matched = refIds
    .map(id => allModules.find(m => m.id === id))
    .filter(Boolean) as FinanceModule[];

  if (!matched.length) return <p className="text-sm text-muted-foreground italic">Referenced modules not found.</p>;

  return (
    <ul className="space-y-2">
      {matched.map(mod => (
        <li key={mod.id}>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {mod.track_slug.replace(/-/g, ' ')}
          </span>
          <a
            href={`/finance/${mod.track_slug}/${mod.slug}`}
            className="block text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {String(mod.sort_order).padStart(2, '0')}: {mod.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

function DocSection({ label, content }: { label: string; content?: string }) {
  if (!content) return null;
  return (
    <div className="mb-5">
      <h4 className="text-sm font-semibold text-foreground mb-1">{label}</h4>
      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{content}</p>
    </div>
  );
}

export default function FinanceModelDetail() {
  const { modelSlug } = useParams<{ modelSlug: string }>();
  const { data: model, isLoading, isError } = useFinanceModelBySlug(modelSlug || '');
  const { data: allModules } = useAllFinanceModules();
  const { isAdmin } = useAuth();

  if (!modelSlug) return <Navigate to="/finance/finance-in-action" replace />;
  // An unknown model slug is a wrong URL. Redirecting to the index hid that
  // and left the reader on a page they did not ask for (GATE 1f, same shape).
  if (!isLoading && (isError || !model)) return <NotFound />;

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Finance in Action', path: '/finance/finance-in-action' },
        { label: model?.name || modelSlug },
      ]}
    >
      <SEO title={model?.name || 'Model'} description={model?.description || ''} />

      <div className="py-8 container max-w-3xl">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : model ? (
          <>
            {/* Header */}
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary mb-2 inline-block">
              {model.number}
            </span>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              {model.name}
              {model.is_flagship && (
                <Star className="inline-block h-5 w-5 ml-2 text-primary fill-primary" />
              )}
            </h1>
            {model.description && (
              <p className="text-lg text-muted-foreground mb-4">{model.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider border rounded px-1.5 py-0.5 ${
                model.depth === 'foundation' ? 'border-primary/30 text-primary' :
                model.depth === 'executive' ? 'border-accent/30 text-accent' :
                'border-muted-foreground/40 text-muted-foreground'
              }`}>
                {depthLabel[model.depth]}
              </span>
              <span>Version — {model.version}</span>
              <span>Last updated {model.last_updated}</span>
            </div>

            {model.is_flagship && (
              <div className="mt-3 mb-2 px-3 py-2 rounded border border-primary/30 bg-primary/5 text-sm text-primary font-medium inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-primary" /> Flagship Model
              </div>
            )}

            <Separator className="my-8" />

            {/* Module References */}
            <h3 className="text-base font-semibold text-foreground mb-4">Draws From</h3>
            <ModuleRefList refIds={model.module_references || []} allModules={allModules || []} />

            <Separator className="my-8" />

            {/* Documentation */}
            <h3 className="text-base font-semibold text-foreground mb-4">Model Documentation</h3>
            {model.documentation && Object.values(model.documentation).some(v => !!v) ? (
              <>
                <DocSection label="Objective" content={model.documentation.objective} />
                <DocSection label="Core Mechanics" content={model.documentation.mechanics} />
                <DocSection label="Key Inputs" content={model.documentation.inputs} />
                <DocSection label="Key Outputs" content={model.documentation.outputs} />
                <DocSection label="Strategic Decision Supported" content={model.documentation.decision} />
                <DocSection label="Known Limitations" content={model.documentation.limitations} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Documentation not yet available.</p>
            )}

            <Separator className="my-8" />

            {/* Excel File */}
            <h3 className="text-base font-semibold text-foreground mb-4">Model File</h3>
            {model.excel_file_url ? (
              <a
                href={model.excel_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Model ({model.version})
              </a>
            ) : (
              <p className="text-sm text-muted-foreground italic">Model file not yet available.</p>
            )}

            {/* Admin Panel */}
            {isAdmin && (
              <>
                <Separator className="my-8" />
                <FinanceModelAdminPanel model={model} allModules={allModules || []} />
              </>
            )}
          </>
        ) : null}
      </div>
    </PageLayout>
  );
}
