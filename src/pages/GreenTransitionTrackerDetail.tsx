import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { TrackerSixSections } from '@/components/tracker/TrackerSixSections';
import { WhatChangedPanel } from '@/components/tracker/WhatChangedPanel';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { trackerIssues } from '@/data/trackerIssues';

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
        description={issue.strategicImplication || issue.directionalReading}
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
            {issue.label} · {issue.publishedDate}
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
          previousReading={issue.whatChanged?.previousReading ?? ''}
          currentReading={issue.directionalReading}
        />

        {/* Divider */}
        <hr className="border-t border-border" />

        {/* Six Sections */}
        <TrackerSixSections sections={issue.sections} />

        {/* Prev / Next */}
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
