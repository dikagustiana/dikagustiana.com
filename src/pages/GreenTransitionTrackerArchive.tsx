import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { GREEN_TRANSITION_TABS } from '@/data/greenTransitionTabs';
import { trackerIssues, DirectionalReading } from '@/data/trackerIssues';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const READING_ORDER: DirectionalReading[] = [
  'Advancing',
  'Fragmenting',
  'Stalling',
  'Regressing',
];

type GroupMode = 'reading' | 'year';

function IssueCard({ issue }: { issue: (typeof trackerIssues)[number] }) {
  return (
    <article>
      <Card>
        <CardContent className="p-6 space-y-2">
          <p className="text-xs font-mono text-muted-foreground">
            {issue.label} · {issue.publishedAt}
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            {issue.directionalReading}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {issue.strategicImplicationPreview}
          </p>
          <Link
            to={`/green-transition/tracker/${issue.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
          >
            Read this issue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </article>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'text-sm text-foreground font-medium underline underline-offset-4'
          : 'text-sm text-muted-foreground hover:text-foreground transition-colors'
      }
    >
      {label}
    </button>
  );
}

export default function GreenTransitionTrackerArchive() {
  const [groupMode, setGroupMode] = useState<GroupMode>('reading');
  const [selectedReadings, setSelectedReadings] = useState<DirectionalReading[]>([]);
  const [selectedThreads, setSelectedThreads] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Derive filter options
  const allReadings = useMemo(
    () => READING_ORDER.filter((r) => trackerIssues.some((i) => i.directionalReading === r)),
    []
  );
  const allThreads = useMemo(
    () => [...new Set(trackerIssues.flatMap((i) => i.activeThreads))].sort(),
    []
  );
  const allYears = useMemo(
    () =>
      [...new Set(trackerIssues.map((i) => i.publishedAt.slice(0, 4)))].sort((a, b) =>
        b.localeCompare(a)
      ),
    []
  );

  const isFilterActive =
    selectedReadings.length > 0 || selectedThreads.length > 0 || selectedYear !== 'all';

  // Filter
  const filteredIssues = useMemo(() => {
    return trackerIssues.filter((issue) => {
      const readingMatch =
        selectedReadings.length === 0 || selectedReadings.includes(issue.directionalReading);
      const threadMatch =
        selectedThreads.length === 0 ||
        selectedThreads.some((t) => issue.activeThreads.includes(t));
      const yearMatch =
        selectedYear === 'all' || issue.publishedAt.startsWith(selectedYear);
      return readingMatch && threadMatch && yearMatch;
    });
  }, [selectedReadings, selectedThreads, selectedYear]);

  // Grouping on filtered results
  const readingGroups = useMemo(() => {
    const groups: { label: string; issues: typeof trackerIssues }[] = [];
    for (const reading of READING_ORDER) {
      const filtered = filteredIssues
        .filter((i) => i.directionalReading === reading)
        .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
      if (filtered.length > 0) {
        groups.push({ label: reading, issues: filtered });
      }
    }
    const annual = filteredIssues.filter((i) => i.slug.startsWith('annual-'));
    if (annual.length > 0) {
      groups.push({ label: 'Annual Synthesis', issues: annual });
    }
    return groups;
  }, [filteredIssues]);

  const yearGroups = useMemo(() => {
    const byYear = new Map<string, typeof trackerIssues>();
    for (const issue of filteredIssues) {
      const year = issue.publishedAt.slice(0, 4);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(issue);
    }
    return Array.from(byYear.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, issues]) => ({
        label: year,
        issues: [...issues].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
      }));
  }, [filteredIssues]);

  const groups = groupMode === 'reading' ? readingGroups : yearGroups;

  const toggleReading = (r: DirectionalReading) => {
    setSelectedReadings((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const toggleThread = (t: string) => {
    setSelectedThreads((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const clearAll = () => {
    setSelectedReadings([]);
    setSelectedThreads([]);
    setSelectedYear('all');
  };

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Green Transition', path: '/green-transition' },
        { label: 'Transition Tracker', path: '/green-transition/tracker' },
        { label: 'Archive' },
      ]}
      subNav={{ tabs: GREEN_TRANSITION_TABS }}
    >
      <SEO
        title="Archive — Indonesia Green Transition Tracker"
        description={`All tracker issues grouped by directional reading. ${trackerIssues.length} issues published.`}
      />

      {/* Page Header */}
      <div className="border-b border-border py-10">
        <div className="container max-w-4xl">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Capital–Policy Intelligence
          </p>
          <h1 className="text-3xl font-display font-semibold text-foreground mb-3">
            Archive — Indonesia Green Transition Tracker
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            All issues grouped by directional reading. {trackerIssues.length} issues published.
          </p>
        </div>
      </div>

      <div className="container max-w-4xl py-10 space-y-8">
        {/* Sub-navigation strip */}
        <div className="flex items-center gap-4 text-sm">
          <Link
            to="/green-transition/tracker"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Latest Issue
          </Link>
          <span className="text-foreground font-medium">Archive</span>
        </div>

        {/* Group by toggle */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Group by:</span>
          <button
            onClick={() => setGroupMode('reading')}
            className={
              groupMode === 'reading'
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground transition-colors'
            }
          >
            Reading
          </button>
          <button
            onClick={() => setGroupMode('year')}
            className={
              groupMode === 'year'
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground transition-colors'
            }
          >
            Year
          </button>
        </div>

        {/* Filter panel */}
        <div className="flex flex-wrap gap-6 py-4 border-b border-border">
          {/* Directional Reading */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Directional Reading
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ToggleChip
                label="All"
                active={selectedReadings.length === 0}
                onClick={() => setSelectedReadings([])}
              />
              {allReadings.map((r) => (
                <ToggleChip
                  key={r}
                  label={r}
                  active={selectedReadings.includes(r)}
                  onClick={() => toggleReading(r)}
                />
              ))}
            </div>
          </div>

          {/* Thread */}
          {allThreads.length > 0 && (
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Thread
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ToggleChip
                  label="All"
                  active={selectedThreads.length === 0}
                  onClick={() => setSelectedThreads([])}
                />
                {allThreads.map((t) => (
                  <ToggleChip
                    key={t}
                    label={t}
                    active={selectedThreads.includes(t)}
                    onClick={() => toggleThread(t)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Year */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Year
            </p>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-sm bg-transparent border border-border rounded px-2 py-1 text-foreground"
            >
              <option value="all">All years</option>
              {allYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter indicator */}
        {isFilterActive && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredIssues.length} of {trackerIssues.length} issues ·{' '}
            <button
              onClick={clearAll}
              className="text-primary hover:underline"
            >
              Clear all filters
            </button>
          </p>
        )}

        {/* Empty result */}
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">
              No issues match the selected filters.
            </p>
            <button
              onClick={clearAll}
              className="text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Grouped issue list */
          groups.map((group) => (
            <div key={group.label} className="mb-12 last:mb-0">
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {group.label}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({group.issues.length} {group.issues.length === 1 ? 'issue' : 'issues'})
                </span>
              </div>
              <hr className="border-t border-border mb-6" />
              <div className="space-y-4">
                {group.issues.map((issue) => (
                  <IssueCard key={issue.slug} issue={issue} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </PageLayout>
  );
}
