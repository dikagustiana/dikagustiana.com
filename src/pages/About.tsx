import { EssayCardLink } from '@/components/EssayCardLink';
import { IndustryChainSection } from '@/components/industry-chain';
import { ReadingPath } from '@/components/argument/ReadingPath';
import { ChangedMind } from '@/components/argument/ChangedMind';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';
import { Link } from 'react-router-dom';

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
        description="What this site argues, how it is written, and what it does not yet cover. Finance, capital, and the green transition."
      />

      {/* Header. The page used to open on one italic line and go straight to
          the map: a reader who arrived wanting to know whether to trust the
          work found a diagram and a bookshelf. The two paragraphs below are
          about METHOD, not credentials — the biography is the author's to
          write and is not invented here. */}
      <section className="py-16 border-b border-border">
        <div className="container max-w-3xl">
          <p className="text-xl md:text-2xl font-display text-muted-foreground italic leading-relaxed">
            Finance, capital, and the green transition. A record of thinking.
          </p>
          <div className="mt-8 space-y-4 text-[17px] leading-relaxed text-foreground">
            <p>
              I write for someone deciding whether my account of an Indonesian industrial or
              energy-transition problem is worth their attention. They may be a practitioner or an
              assessor; they do not know my biography, my earlier essays, or every Indonesian
              institution I name.
            </p>
            <p>
              So the standing rules here are these. State the question, the position, its scope and
              its consequence early. Keep observed evidence, inference and judgment visibly apart. A
              policy argument names who can act, who pays, who benefits, the strongest objection,
              and what would change the conclusion. Where a claim is unchecked, say so rather than
              writing around it — which is why the{' '}
              <Link to="/green-transition/tracker" className="text-primary underline underline-offset-2">
                transition tracker
              </Link>{' '}
              carries dated corrections rather than a tidy archive.
            </p>
          </div>
        </div>
      </section>

      {/* The argument in full: the case, the comparison, the objection, the
          limits, and the ordered path through what exists. */}
      <ReadingPath />

      <ChangedMind />

      {/* The industry chain map — the artefact this page carries, sitting
          directly under the narrative it belongs to. */}
      <IndustryChainSection />

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
                      {/* One colour for every section label. The per-section
                          hue map that used to live here was the same six-hue
                          rainbow as the homepage grid. */}
                      <span className="font-medium text-muted-foreground">{label}</span>
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
                className="border-l-2 border-border pl-4 py-1"
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
