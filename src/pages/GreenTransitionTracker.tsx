import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { trackerIssues } from '@/data/trackerIssues';
import { WhatChangedPanel } from '@/components/tracker/WhatChangedPanel';

export default function GreenTransitionTracker() {
  const latestIssue = trackerIssues[0] ?? null;
  const pastIssues = trackerIssues.slice(1);

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Transition Tracker' },
      ]}
      subNav={{ tabs: GREEN_TRANSITION_TABS }}
    >
      <SEO
        title="Indonesia Green Transition Tracker"
        description="Quarterly structured monitoring of policy architecture, capital positioning, and execution friction shaping Indonesia's energy transition."
      />

      {/* 1. Page Header */}
      <div className="border-b border-border py-10">
        <div className="container max-w-4xl">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Capital–Policy Intelligence
          </p>
          <h1 className="text-3xl font-display font-semibold text-foreground mb-3">
            Indonesia Green Transition Tracker
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Quarterly structured monitoring of the policy architecture, capital positioning,
            institutional incentive shifts, and execution friction shaping Indonesia's energy transition.
          </p>
        </div>
      </div>

      <div className="container max-w-4xl py-10 space-y-12">
        {/* 2. Latest Issue Panel */}
        {latestIssue ? (
          <section>
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Latest Issue
            </h2>
            <Card>
              <CardContent className="p-6 space-y-3">
                <p className="text-xs font-mono text-muted-foreground">
                  {latestIssue.label} · {latestIssue.publishedAt}
                </p>
                <h3 className="text-xl font-semibold text-foreground">
                  {latestIssue.directionalReading}
                </h3>
                <p className="text-muted-foreground">
                  {latestIssue.strategicImplicationPreview}
                </p>
                <Link
                  to={`/green-transition/tracker/${latestIssue.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
                >
                  Read this issue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section>
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Latest Issue
            </h2>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  First issue forthcoming — Q1 2025
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 3. What Changed Panel */}
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">
            What Changed
          </h2>
          <WhatChangedPanel
            changed={latestIssue?.whatChanged?.changed ?? []}
            held={latestIssue?.whatChanged?.held ?? []}
            reversed={latestIssue?.whatChanged?.reversed ?? []}
            previousReading={latestIssue?.previousReading ?? ''}
            currentReading={latestIssue?.directionalReading ?? ''}
            issueLabel={latestIssue?.label}
            previousLabel={trackerIssues[1]?.label}
          />
        </section>

        {/* 4. Issue Feed */}
        {pastIssues.length > 0 && (
          <section>
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Previous Issues
            </h2>
            <div className="divide-y divide-border/50">
              {pastIssues.map((issue: any) => (
                <Link
                  key={issue.slug}
                  to={`/green-transition/tracker/${issue.slug}`}
                >
                  <div className="group py-5 hover:bg-muted/30 -mx-4 px-4 transition-colors">
                    <p className="text-xs font-mono text-muted-foreground mb-1.5">
                      {issue.label} · {issue.publishedAt}
                    </p>
                    <h3 className="text-[16px] font-semibold text-foreground leading-snug mb-1 group-hover:text-foreground/80 transition-colors">
                      {issue.directionalReading}
                    </h3>
                    <p className="text-[14px] text-muted-foreground leading-snug line-clamp-2">
                      {issue.strategicImplicationPreview}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 5. Archive Link */}
        <div className="pt-4 border-t border-border">
          <Link
            to="/green-transition/tracker/archive"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
          >
            View full archive
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
