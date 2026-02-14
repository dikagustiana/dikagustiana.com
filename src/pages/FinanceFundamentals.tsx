/**
 * FinanceFundamentals — Hybrid model: expandable concept panels + essay listings.
 *
 * 12 DB-managed fundamentals, each expandable inline.
 * Core content rendered with same typographic hierarchy as canonical essays.
 * Related essays listed below core content as headline-led items.
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinanceFundamentals, useFundamentalEssays } from '@/hooks/queries/useFinance';
import { format, parseISO } from 'date-fns';

/* ── Essay list for an expanded fundamental ── */
function FundamentalEssays({ fundamentalSlug }: { fundamentalSlug: string }) {
  const { data: essays, isLoading } = useFundamentalEssays(fundamentalSlug);

  if (isLoading) {
    return (
      <div className="mt-6 pt-6 border-t border-border space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!essays || essays.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Related Essays
      </h3>
      <div className="space-y-4">
        {essays.map((essay) => (
          <Link
            key={essay.id}
            to={`/finance-101/essays/${essay.slug}`}
            className="block group"
          >
            <h4 className="text-base font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
              {essay.title}
            </h4>
            {essay.snippet && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {essay.snippet}
              </p>
            )}
            {essay.date && (
              <time className="text-xs text-muted-foreground mt-1 block">
                {format(parseISO(essay.date), 'MMM d, yyyy')}
              </time>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function FinanceFundamentals() {
  const { data: fundamentals, isLoading } = useFinanceFundamentals();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (openSlug && panelRefs.current[openSlug]) {
      panelRefs.current[openSlug]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [openSlug]);

  const toggle = (slug: string) => {
    setOpenSlug((prev) => (prev === slug ? null : slug));
  };

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Fundamentals' },
      ]}
    >
      <SEO
        title="Fundamentals"
        description="The 12 foundational ideas that everything else in finance builds on."
      />

      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
          Fundamentals
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          The 12 foundational ideas that everything else builds on.
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : fundamentals && fundamentals.length > 0 ? (
          <div className="divide-y divide-border border-y border-border">
            {fundamentals.map((f, idx) => {
              const isOpen = openSlug === f.slug;
              return (
                <div
                  key={f.id}
                  ref={(el) => { panelRefs.current[f.slug] = el; }}
                >
                  <button
                    onClick={() => toggle(f.slug)}
                    className="w-full flex items-center justify-between py-5 text-left group"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="text-sm font-mono text-muted-foreground tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {f.title}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-muted-foreground transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="pb-6 pl-9">
                      {f.core_content ? (
                        <div
                          className="prose prose-sm max-w-none text-foreground"
                          dangerouslySetInnerHTML={{ __html: f.core_content }}
                        />
                      ) : (
                        <p className="text-muted-foreground italic text-sm">
                          Content coming soon.
                        </p>
                      )}
                      <FundamentalEssays fundamentalSlug={f.slug} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            No fundamentals configured yet.
          </p>
        )}
      </div>
    </PageLayout>
  );
}
