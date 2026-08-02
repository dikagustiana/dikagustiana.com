/**
 * The publish modal's placement fork.
 *
 * One placement control, switching on the essay's section: finance places by
 * module, editorial sections place by category. The regression class this
 * pins: an editorial essay offered module selection (or no placement at all),
 * and a URL preview drifting from the canonical builder. The preview is
 * asserted EQUAL to essayUrl's output, not to a hand-written string, so the
 * two can never disagree without this file noticing.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PublishModal } from '@/components/writer/PublishModal';
import { essayUrl } from '@/lib/essayUrl';
import { renderWithRouter } from './helpers/renderWithProviders';

vi.mock('@/hooks/queries/useFinance', () => ({
  useAllFinanceModules: () => ({ data: [] }),
}));

const NBT_CATEGORIES = [
  { id: 'cat-tech', name: 'Technology', slug: 'next-big-thing-technology' },
  { id: 'cat-econ', name: 'Economy', slug: 'next-big-thing-economy' },
  { id: 'cat-soc', name: 'Society', slug: 'next-big-thing-society' },
  { id: 'cat-env', name: 'Environment', slug: 'next-big-thing-environment' },
  { id: 'cat-gov', name: 'Governance', slug: 'next-big-thing-governance' },
];

function renderModal(overrides: Partial<Parameters<typeof PublishModal>[0]>) {
  const noop = () => {};
  return renderWithRouter(
    <PublishModal
      open
      onOpenChange={noop}
      isPublished={false}
      sectionSlug="next-big-thing"
      isFinanceSection={false}
      modules={[]}
      moduleId={null} setModuleId={noop}
      financeOrder={null} setFinanceOrder={noop}
      lessonType="concept" setLessonType={noop}
      categories={NBT_CATEGORIES}
      categoryId="" setCategoryId={noop}
      keyTakeaways={['', '', '']} setKeyTakeaways={noop}
      references={[]} setReferences={noop}
      author="" setAuthor={noop}
      date="" setDate={noop}
      authorBio="" setAuthorBio={noop}
      heroImageUrl="" setHeroImageUrl={noop}
      heroCaption="" setHeroCaption={noop}
      validation={{ canPublish: true, errors: [], warnings: [], figureCount: 0 }}
      isSaving={false}
      onPublish={noop}
      onSaveDraft={noop}
      {...overrides}
    />,
  );
}

describe('publish modal placement fork', () => {
  it('editorial section: a Placement block with the category select, and no module controls', () => {
    renderModal({});
    expect(screen.getByText('Placement')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.queryByLabelText('Module')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Track')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Order in module')).not.toBeInTheDocument();
  });

  it('editorial section with a category chosen: the URL preview IS the canonical builder output', () => {
    renderModal({ categoryId: 'cat-tech' });
    const expected = essayUrl({ slug: '…', section: 'next-big-thing', phase: 'technology' });
    expect(expected).toBe('/the-next-big-thing/technology/…');
    expect(screen.getByText(expected!)).toBeInTheDocument();
  });

  it('no category chosen yet: no URL is promised', () => {
    renderModal({ categoryId: '' });
    expect(screen.queryByText(/\/the-next-big-thing\//)).not.toBeInTheDocument();
  });

  it('a category from another section (the DB catch-all default) does not produce a preview', () => {
    // Loaded editorial essays can carry finance-general's id; it is not in
    // this section's list, so the modal must treat it as "not chosen".
    renderModal({ categoryId: 'finance-general-uuid-not-in-list' });
    expect(screen.queryByText(/\/the-next-big-thing\//)).not.toBeInTheDocument();
  });

  it('finance section: module placement renders, the editorial Placement block does not', () => {
    renderModal({
      sectionSlug: 'finance',
      isFinanceSection: true,
      categories: [{ id: 'cat-general', name: 'General', slug: 'finance-general' }],
    });
    expect(screen.getByLabelText('Module')).toBeInTheDocument();
    expect(screen.getByLabelText('Track')).toBeInTheDocument();
    // The plain category select still exists (the DB requires a category)…
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    // …but not the editorial placement copy.
    expect(
      screen.queryByText(/The category decides where the essay appears/i),
    ).not.toBeInTheDocument();
  });
});
