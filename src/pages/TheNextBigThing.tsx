import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { EditorialFeed } from '@/components/editorial';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { essayUrl } from '@/lib/essayUrl';

const TOPICS = [
  { id: 'technology', label: 'Technology' },
  { id: 'economy', label: 'Economy' },
  { id: 'society', label: 'Society' },
  { id: 'environment', label: 'Environment' },
  { id: 'governance', label: 'Governance' },
];

const NEXT_BIG_THING_TABS = [
  { label: 'Technology', path: '/the-next-big-thing?theme=technology' },
  { label: 'Economy', path: '/the-next-big-thing?theme=economy' },
  { label: 'Society', path: '/the-next-big-thing?theme=society' },
  { label: 'Environment', path: '/the-next-big-thing?theme=environment' },
  { label: 'Governance', path: '/the-next-big-thing?theme=governance' },
];

export default function TheNextBigThing() {
  const { isAdmin } = useAuth();

  // One canonical builder — the local `/the-next-big-thing/${slug}` copy this
  // replaced was a second URL convention, and it flattened the theme out of
  // the address.
  const getEssayUrl = (essay: { slug: string; phase: string | null }) =>
    essayUrl({ slug: essay.slug, section: 'next-big-thing', phase: essay.phase }) ??
    `/the-next-big-thing/${essay.slug}`;

  return (
    <PageLayout
      role="economist"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'The Next Big Thing' },
      ]}
      subNav={{
        tabs: NEXT_BIG_THING_TABS,
      }}
    >
      <SEO
        title="The Next Big Thing"
        description="Speculative but reasoned essays on emerging forces in industry, finance, and policy. Critical questions, not predictions. Winners, losers, and second-order effects."
      />

      {/* Hero Section */}
      <div
        className="relative h-[40vh] min-h-[280px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80)',
        }}
      >
        <div className="absolute inset-0 bg-primary/70" />
        <div className="relative z-10 text-center px-4 max-w-3xl">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-display font-light text-white leading-tight italic">
            What's the next big thing that will reshape industries?
          </h1>
          <p className="mt-6 text-white/80 text-lg max-w-2xl mx-auto">
            Speculative but reasoned essays on emerging forces in industry, finance, and policy.
            Critical questions, not predictions.
          </p>
        </div>
      </div>

      {/* Intro section */}
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container max-w-3xl">
          <p className="text-muted-foreground text-center">
            This is an ideas laboratory—not a blog, not a prediction service. The goal is to think
            seriously about forces that might reshape how we work, invest, and organize. Some ideas
            will be wrong. The value is in the reasoning, not the conclusions.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-1">
              Essays & Analysis
            </h2>
            <p className="text-muted-foreground">
              Explorations of technology shifts, policy experiments, and market structure changes.
            </p>
          </div>

          {/* Writing happens in the studio — the one authoring surface with
              validation, revisions and the placement modal. The quick-add
              dialog this replaced inserted rows that dodged the category
              taxonomy (essays.category_id silently defaulted to
              finance-general). */}
          {isAdmin && (
            <Button asChild>
              <Link to="/admin/writer/next-big-thing/new">
                <PenLine className="h-4 w-4 mr-2" />
                Write essay
              </Link>
            </Button>
          )}
        </div>

        <EditorialFeed
          section="next-big-thing"
          topics={TOPICS}
          getEssayUrl={getEssayUrl}
        />
      </div>
    </PageLayout>
  );
}
