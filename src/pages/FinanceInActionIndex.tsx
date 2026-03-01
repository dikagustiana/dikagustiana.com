import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Star } from 'lucide-react';
import { useFinanceModels, type FinanceModel } from '@/hooks/queries/useFinanceModels';
import { Badge } from '@/components/ui/badge';

const depthLabel: Record<string, string> = {
  foundation: 'Foundation',
  executive: 'Executive',
  institutional: 'Institutional',
};

const depthColor: Record<string, string> = {
  foundation: 'border-primary/30 text-primary',
  executive: 'border-accent/30 text-accent',
  institutional: 'border-muted-foreground/40 text-muted-foreground',
};

function ModelRow({ model }: { model: FinanceModel }) {
  return (
    <Link
      to={`/finance/finance-in-action/${model.slug}`}
      className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-5 group hover:bg-muted/30 transition-colors -mx-3 px-3 rounded"
    >
      <span className="text-sm font-mono text-muted-foreground tabular-nums">
        {model.number}
      </span>
      <div className="min-w-0">
        <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors block leading-snug">
          {model.name}
          {model.is_flagship && (
            <Star className="inline-block h-3.5 w-3.5 ml-1.5 text-primary fill-primary" />
          )}
        </span>
        {model.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {model.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-[10px] font-mono uppercase tracking-wider border rounded px-1.5 py-0.5 ${depthColor[model.depth]}`}>
          {depthLabel[model.depth]}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          View Model <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

export default function FinanceInActionIndex() {
  const { data: models, isLoading } = useFinanceModels();
  const available = models?.filter(m => !!m.excel_file_url).length ?? 0;
  const total = models?.length ?? 0;

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Finance in Action' },
      ]}
    >
      <SEO
        title="Finance in Action"
        description="Institutional-grade financial models for CFO and board-level capital decisions."
      />

      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
          Finance in Action
        </h1>
        <p className="text-lg text-muted-foreground mb-4">
          Institutional-grade financial models for CFO and board-level capital decisions.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <span>{available} of {total} models available</span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : models && models.length > 0 ? (
          <div className="divide-y divide-border border-y border-border">
            {models.map(m => (
              <ModelRow key={m.id} model={m} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No models configured yet.</p>
        )}
      </div>
    </PageLayout>
  );
}
