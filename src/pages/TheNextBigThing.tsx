import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { EditorialFeed } from '@/components/editorial';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EssayDialog } from '@/components/next-big-thing/EssayDialog';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const getEssayUrl = (essay: { slug: string }) => `/the-next-big-thing/${essay.slug}`;

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

      {/* Page header. Was a 40vh third-party stock photograph, hot-linked at
          runtime, under a 70% scrim — and it was the SAME photograph
          EssayModule used as its default card thumbnail, so this page showed
          one image as its hero and again on every essay card below it.
          Replaced with the text header FinanceLanding.tsx:40-50 uses. */}
      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          The Next Big Thing
        </h1>
        <div className="mb-2 max-w-2xl">
          <p className="text-base text-muted-foreground leading-relaxed">
            Speculative but reasoned essays on emerging forces in industry,
            finance, and policy. Critical questions, not predictions.
          </p>
          <p className="text-base text-muted-foreground mt-3">
            The goal is to think seriously about forces that might reshape how
            we work, invest, and organize. Some ideas will be wrong. The value
            is in the reasoning, not the conclusions.
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
          
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Essay
            </Button>
          )}
        </div>

        <EditorialFeed
          section="next-big-thing"
          topics={TOPICS}
          getEssayUrl={getEssayUrl}
        />
      </div>

      {/* Admin dialog */}
      <EssayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        essay={null}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['editorial-feed', 'next-big-thing'] });
        }}
      />
    </PageLayout>
  );
}
