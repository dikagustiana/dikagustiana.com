import { EssayCardLink } from '@/components/EssayCardLink';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const sectionColors: Record<string, string> = {
  'green-transition': 'text-accent',
  'development-finance': 'text-sky-500',
  finance: 'text-blue-500',
  accounting: 'text-purple-500',
  'next-big-thing': 'text-amber-500',
};

const sectionLabels: Record<string, string> = {
  'green-transition': 'Green Transition',
  'development-finance': 'Development Finance',
  finance: 'Finance',
  accounting: 'Accounting',
  'next-big-thing': 'The Next Big Thing',
};

const phaseLabels: Record<string, string> = {
  'climate-finance': 'Climate Finance',
  'where-we-are-now': 'Where We Are Now',
  'challenges-ahead': 'Challenges Ahead',
  'pathways-forward': 'Pathways Forward',
  'sovereign-wealth-funds': 'Sovereign Wealth Funds',
  'multilateral-development-banks': 'Multilateral Development Banks',
  'blended-finance': 'Blended Finance',
  'indonesia-capital-architecture': 'Indonesia\'s Capital Architecture',
};


const readingStack = [
  {
    title: 'The Age of Sustainable Development',
    author: 'Jeffrey Sachs',
    annotation: 'The foundational text on how development economics intersects with climate and capital.',
  },
  {
    title: 'Blended Finance in the Poorest Countries',
    author: 'OECD / Convergence',
    annotation: 'How concessional capital is structured to crowd in private investment in frontier markets.',
  },
  {
    title: 'Indonesia\'s JETP Investment Plan',
    author: 'Government of Indonesia / IPG',
    annotation: 'The actual policy document — what Indonesia committed, what it costs, who pays.',
  },
  {
    title: 'The Economics of Climate Change (Stern Review)',
    author: 'Nicholas Stern',
    annotation: 'Still the most rigorous case for why the cost of inaction exceeds the cost of transition.',
  },
  {
    title: 'IFC\'s Blended Finance Handbook',
    author: 'IFC',
    annotation: 'How the world\'s largest development finance institution structures climate-aligned deals.',
  },
  {
    title: 'Sovereign Wealth Funds: Legitimacy, Governance, and Policy',
    author: 'Gordon Clark et al.',
    annotation: 'The academic framework for understanding how SWFs are governed and what mandates they carry.',
  },
  {
    title: 'The Green Swan',
    author: 'BIS / Bolton et al.',
    annotation: 'Central bank and financial stability implications of climate risk — how finance regulators think.',
  },
  {
    title: 'Indonesia Energy Transition Outlook',
    author: 'IESR',
    annotation: 'Annual tracker of Indonesia\'s energy mix, coal phase-out trajectory, and renewable pipeline.',
  },
  {
    title: 'Financial Statement Analysis',
    author: 'Penman',
    annotation: 'The technical foundation — how to read capital structure, earnings quality, and valuation through financial statements.',
  },
  {
    title: 'Principles of Project Finance',
    author: 'Yescombe',
    annotation: 'The mechanics of how large infrastructure and energy projects are financed — essential for DFI deal analysis.',
  },
];

export default function About() {
  const { data: selectedEssays } = useSelectedEssays(8);

  const formatDate = (dateStr: string | null, createdAt: string) => {
    const d = dateStr || createdAt;
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <PageLayout
      variant="content"
      role="hybrid"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'About' },
      ]}
    >
      <SEO
        title="About"
        description="Finance, capital, and the green transition. A record of thinking."
      />

      {/* Header */}
      <section className="py-16 border-b border-border">
        <div className="container max-w-3xl">
          <p className="text-xl md:text-2xl font-display text-muted-foreground italic leading-relaxed">
            Finance, capital, and the green transition. A record of thinking.
          </p>
        </div>
      </section>

      {/* Selected Essays */}
      {selectedEssays && selectedEssays.length > 0 && (
        <section className="py-12 border-b border-border">
          <div className="container max-w-3xl">
            <h2 className="text-lg font-display font-semibold text-foreground mb-8">
              Selected Essays
            </h2>
            <div className="divide-y divide-border">
              {selectedEssays.map((essay) => {
                const sectionLabel = sectionLabels[essay.section] || essay.section;
                const pLabel = essay.phase ? phaseLabels[essay.phase] : null;
                const label = pLabel ? `${sectionLabel} · ${pLabel}` : sectionLabel;
                const colorClass = sectionColors[essay.section] || 'text-muted-foreground';

                return (
                  <EssayCardLink
                    key={essay.id}
                    essay={essay}
                    className="block py-4 first:pt-0 last:pb-0 group"
                  >
                    <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors mb-1">
                      {essay.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={cn('font-medium', colorClass)}>{label}</span>
                      <span className="text-muted-foreground">
                        {formatDate(essay.date, essay.created_at)}
                      </span>
                    </div>
                  </EssayCardLink>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Reading Stack */}
      <section className="py-12">
        <div className="container max-w-3xl">
          <h2 className="text-lg font-display font-semibold text-foreground mb-8">
            On the shelf
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {readingStack.map((item) => (
              <div
                key={item.title}
                className="border-l-2 border-sky-500/40 pl-4 py-1"
              >
                <h3 className="font-medium text-foreground text-sm leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{item.author}</p>
                <p className="text-xs text-muted-foreground italic mt-1">{item.annotation}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
