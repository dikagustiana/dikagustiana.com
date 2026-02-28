import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { trackerIssues, SECTION_META, SectionKey } from '@/data/trackerIssues';
import { formatDate } from '@/lib/formatDate';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function GreenTransitionTrackerEssay() {
  const { issueSlug, sectionKey, entrySlug } = useParams<{
    issueSlug: string;
    sectionKey: string;
    entrySlug: string;
  }>();
  const navigate = useNavigate();

  const issue = trackerIssues.find((i) => i.slug === issueSlug);
  const sectionMeta = SECTION_META.find((m) => m.key === sectionKey);
  const entries = issue && sectionKey ? issue.sections[sectionKey as SectionKey] ?? [] : [];
  const entryIndex = entries.findIndex((e) => e.slug === entrySlug);
  const entry = entryIndex >= 0 ? entries[entryIndex] : null;
  const prevEntry = entryIndex > 0 ? entries[entryIndex - 1] : null;
  const nextEntry = entryIndex >= 0 && entryIndex < entries.length - 1 ? entries[entryIndex + 1] : null;

  if (!issue || !entry || !sectionMeta) {
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
          <p className="text-muted-foreground mb-4">Entry not found.</p>
          <Link
            to={`/green-transition/tracker/${issueSlug || ''}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to issue
          </Link>
        </div>
      </PageLayout>
    );
  }

  const paragraphs = entry.body.split('\n\n').filter(Boolean);

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Transition Tracker', path: '/green-transition/tracker' },
        { label: issue.label, path: `/green-transition/tracker/${issue.slug}` },
        { label: entry.title },
      ]}
      subNav={{ tabs: GREEN_TRANSITION_TABS }}
    >
      <SEO
        title={`${entry.title} — ${issue.label}`}
        description={entry.subtitle}
      />

      <div className="container max-w-4xl py-10">
        <div className="max-w-[680px] mx-auto">
          {/* Back link */}
          <Link
            to={`/green-transition/tracker/${issue.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {issue.label}
          </Link>

          {/* Section label */}
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.18em] mb-3">
            {sectionMeta.label}
          </p>

          {/* Title */}
          <h1 className="text-2xl font-display font-semibold text-foreground leading-tight mb-4 max-w-[620px]">
            {entry.title}
          </h1>

          {/* Subtitle */}
          <p className="text-[17px] text-muted-foreground leading-relaxed mb-2 max-w-[620px]">
            {entry.subtitle}
          </p>

          {/* Meta */}
          <p className="text-xs font-mono text-muted-foreground mb-10">
            {issue.label} · {formatDate(entry.publishedAt)}
          </p>

          {/* Divider */}
          <div className="border-t border-border/50 mb-10" />

          {/* Body */}
          <div>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[17px] leading-[1.75] text-foreground mb-5 max-w-[620px]">
                {p}
              </p>
            ))}
          </div>

          {/* Key Observation */}
          {entry.keyObservation && (
            <div className="mt-10 pl-4 border-l-2 border-foreground/20">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                Key Observation
              </p>
              <p className="text-[15px] text-foreground font-medium leading-snug">
                {entry.keyObservation}
              </p>
            </div>
          )}

          {/* Prev / Next within section */}
          <div className="mt-16 pt-6 border-t border-border flex items-start justify-between gap-8">
            {prevEntry ? (
              <button
                onClick={() =>
                  navigate(
                    `/green-transition/tracker/${issue.slug}/${sectionKey}/${prevEntry.slug}`
                  )
                }
                className="text-left max-w-[45%]"
              >
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Previous
                </span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {prevEntry.title}
                </p>
              </button>
            ) : (
              <span />
            )}
            {nextEntry ? (
              <button
                onClick={() =>
                  navigate(
                    `/green-transition/tracker/${issue.slug}/${sectionKey}/${nextEntry.slug}`
                  )
                }
                className="text-right max-w-[45%]"
              >
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {nextEntry.title}
                </p>
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
