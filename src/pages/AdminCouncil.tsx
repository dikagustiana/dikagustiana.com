/**
 * AdminCouncil — brainstorm entry point for the Writing Council.
 *
 * Review mode lives inside Writer Studio (Council Review button); this page
 * is where rough essay ideas go before a draft exists.
 */

import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { CouncilPanel } from '@/components/admin/CouncilPanel';

export default function AdminCouncil() {
  return (
    <PageLayout
      variant="dashboard"
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Admin' }, { label: 'Writing Council' }]}
    >
      <SEO title="Writing Council" description="Brainstorm essay ideas with the council" />

      <div className="container py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">Writing Council</h1>
          <p className="text-muted-foreground mt-1">
            Pitch an essay idea to five advisors. They respond independently, peer-review each
            other anonymously, and the chairman rules on whether — and how — to write it.
          </p>
        </div>

        <CouncilPanel mode="brainstorm" />
      </div>
    </PageLayout>
  );
}
