import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { EditorialFeed } from '@/components/editorial';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { essayUrl } from '@/lib/essayUrl';
import { nextBigThingItems } from '@/config/navConfig';
import { NEXT_BIG_THING_THEMES } from '@/config/nextBigThingThemes';

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
      width="reading"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'The Next Big Thing' },
      ]}
      subNav={{
        // The header dropdown's items, reused: the tabs used to be a second
        // hand-written copy of the same five links.
        tabs: nextBigThingItems,
      }}
    >
      <SEO
        title="The Next Big Thing"
        description="Essays that reason through big structural shifts while they are still taking shape."
      />

      {/* Page header. Was a 40vh third-party stock photograph, hot-linked at
          runtime, under a 70% scrim — and it was the SAME photograph the
          now-deleted EssayModule used as its default card thumbnail, so this
          page showed one image as its hero and again on every essay card
          below it. Replaced with the text header FinanceLanding.tsx:40-50
          uses. */}
      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          The Next Big Thing
        </h1>
        <p className="mb-2 max-w-2xl text-base text-muted-foreground leading-relaxed">
          Essays that reason through big structural shifts while they are still taking shape.
        </p>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl py-12">
        {/* Writing happens in the studio — the one authoring surface with
            validation, revisions and the placement modal. The quick-add
            dialog this replaced inserted rows that dodged the category
            taxonomy (essays.category_id silently defaulted to
            finance-general). */}
        {isAdmin && (
          <div className="mb-8 flex justify-end">
            <Button asChild>
              <Link to="/admin/writer/next-big-thing/new">
                <PenLine className="h-4 w-4 mr-2" />
                Write essay
              </Link>
            </Button>
          </div>
        )}

        <EditorialFeed
          section="next-big-thing"
          topics={NEXT_BIG_THING_THEMES}
          getEssayUrl={getEssayUrl}
        />
      </div>
    </PageLayout>
  );
}
