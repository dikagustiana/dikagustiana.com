import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { WhatChangedPanel } from '@/components/tracker/WhatChangedPanel';
import { trackerIssues, SECTION_META } from '@/data/trackerIssues';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeft, ArrowRight } from 'lucide-react';



export default function GreenTransitionTrackerDetail() {
  const { issueSlug } = useParams<{ issueSlug: string }>();
  const navigate = useNavigate();

  const issueIndex = trackerIssues.findIndex((i) => i.slug === issueSlug);
  const issue = issueIndex >= 0 ? trackerIssues[issueIndex] : null;
  const prevIssue = issueIndex > 0 ? trackerIssues[issueIndex - 1] : null;
  const nextIssue = issueIndex >= 0 && issueIndex < trackerIssues.length - 1 ? trackerIssues[issueIndex + 1] : null;

  if (!issue) {
    return (
      <PageLayout
        role="economist"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Green Transition', path: '/green-transition' },
          { label: 'Transition Tracker', path: '/green-transition/tracker' },
          { label: 'Not Found' },
        ]}
        subNav={{ tabs: GREEN_TRANSITION_TABS }}
      >
        <div className="container max-w-4xl py-16 text-center">
          <p className="text-muted-foreground mb-4">Issue not found.</p>
          <Link
            to="/green-transition/tracker"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Transition Tracker
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Transition Tracker', path: '/green-transition/tracker' },
        { label: issue.label },
      ]}
      subNav={{ tabs: GREEN_TRANSITION_TABS }}
    >
      <SEO
        title={`${issue.label} — Green Transition Tracker`}
        description={issue.strategicImplicationPreview || issue.directionalReading}
      />

      <div className="container max-w-4xl py-10 space-y-10">
        {/* Back link */}
        <Link
          to="/green-transition/tracker"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Transition Tracker
        </Link>

        {/* Issue header */}
        <div className="space-y-2">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            {issue.label} · {issue.publishedAt}
          </p>
          <p className="text-xl font-semibold text-foreground">
            Directional Reading: {issue.directionalReading}
          </p>
        </div>

        {/* What Changed */}
        <WhatChangedPanel
          changed={issue.whatChanged?.changed ?? []}
          held={issue.whatChanged?.held ?? []}
          reversed={issue.whatChanged?.reversed ?? []}
          previousReading={issue.previousReading}
          currentReading={issue.directionalReading}
          issueLabel={issue.label}
          previousLabel={trackerIssues[issueIndex + 1]?.label}
        />

        {/* Section-grouped feed */}
        <div className="max-w-[680px] mx-auto">
          {SECTION_META.map((meta) => {
            const entries = issue.sections[meta.key] ?? [];
            if (entries.length === 0) return null;

            return (
              <div key={meta.key} className="mb-12">
                {/* Section group header */}
                <div className="border-t border-border/50 pt-10 mb-6">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.18em]">
                    {meta.label}
                  </p>
                  <p className="text-sm text-muted-foreground italic mt-1">
                    {meta.desc}
                  </p>
                </div>

                {/* Feed cards */}
                <div>
                  {entries.map((entry) => (
                    <Link
                      key={entry.slug}
                      to={`/green-transition/tracker/${issue.slug}/${meta.key}/${entry.slug}`}
                    >
                      <div className="group py-5 border-b border-border/40 last:border-0 hover:bg-muted/30 -mx-4 px-4 transition-colors cursor-pointer">
                        <h3 className="text-[17px] font-semibold text-foreground leading-snug mb-1.5 group-hover:text-foreground/80 transition-colors">
                          {entry.title}
                        </h3>
                        <p className="text-[15px] text-muted-foreground leading-snug mb-3">
                          {entry.subtitle}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground/70">
                            {formatDate(entry.publishedAt)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Prev / Next issue */}
        <div className="mt-16 pt-6 border-t border-border flex items-center justify-between">
          {prevIssue ? (
            <button
              onClick={() => navigate(`/green-transition/tracker/${prevIssue.slug}`)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>
          ) : (
            <span />
          )}
          {nextIssue ? (
            <button
              onClick={() => navigate(`/green-transition/tracker/${nextIssue.slug}`)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
