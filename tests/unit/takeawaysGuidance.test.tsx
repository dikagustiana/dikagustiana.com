/**
 * The publish gate and the guidance beside it must agree.
 *
 * The regression this locks down: the Key Takeaways card said takeaways were
 * optional for certain lesson types, but `WriterEditor` only forwards a lesson
 * type for MODULE-PLACED finance essays — every editorial essay and every
 * unplaced finance essay sends `lessonType: null`, which `validateEssay` treats
 * strictly. Authors in those contexts were told the opposite of what the
 * Publish button would do.
 *
 * The guidance moved from the metadata panel to the publish modal when the
 * writing surface was reshaped; the copy — and this test — followed it there,
 * because the invariant is about the words next to the gate, not the panel
 * that used to hold them.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { validateEssay } from '@/components/writer/WriterValidation';
import { PublishModal } from '@/components/writer/PublishModal';
import { renderWithRouter } from './helpers/renderWithProviders';

vi.mock('@/hooks/queries/useFinance', () => ({
  useAllFinanceModules: () => ({ data: [] }),
}));

const publishable = {
  title: 'A title',
  deck: 'A deck line that says what the piece argues.',
  wordCount: 900,
  references: [{ label: 'A source' }],
  section: 'finance',
  content: '<p>body</p>',
  categoryId: 'cat-1',
};

const blocksOnTakeaways = (r: ReturnType<typeof validateEssay>) =>
  r.errors.some(e => e.field === 'keyTakeaways');

describe('key-takeaways gate: strict unless the lesson type says otherwise', () => {
  it('blocks publishing with zero takeaways when lessonType is null (editorial, unplaced finance)', () => {
    for (const lessonType of [null, undefined]) {
      const result = validateEssay({ ...publishable, keyTakeaways: ['', '', ''], lessonType });
      expect(blocksOnTakeaways(result), `lessonType=${String(lessonType)}`).toBe(true);
    }
  });

  it('stays strict for an unknown lesson type rather than failing open', () => {
    const result = validateEssay({ ...publishable, keyTakeaways: [], lessonType: 'some-future-type' });
    expect(blocksOnTakeaways(result)).toBe(true);
  });

  it('blocks concept and framework lessons with zero takeaways', () => {
    for (const lessonType of ['concept', 'framework']) {
      const result = validateEssay({ ...publishable, keyTakeaways: [], lessonType });
      expect(blocksOnTakeaways(result), lessonType).toBe(true);
    }
  });

  it('warns but does not block artefact-shaped lessons with zero takeaways', () => {
    for (const lessonType of ['case-study', 'exercise', 'model-walkthrough']) {
      const result = validateEssay({ ...publishable, keyTakeaways: ['', '', ''], lessonType });
      expect(blocksOnTakeaways(result), lessonType).toBe(false);
      expect(result.warnings.some(w => w.field === 'keyTakeaways'), lessonType).toBe(true);
    }
  });

  it('treats one or two takeaways as an error under every lesson type', () => {
    for (const lessonType of [null, 'concept', 'case-study', 'exercise']) {
      const result = validateEssay({ ...publishable, keyTakeaways: ['one', 'two', ''], lessonType });
      expect(blocksOnTakeaways(result), String(lessonType)).toBe(true);
    }
  });
});

function renderMetadata(
  overrides: Partial<Parameters<typeof PublishModal>[0]>,
) {
  const noop = () => {};
  return renderWithRouter(
    <PublishModal
      open
      onOpenChange={noop}
      isPublished={false}
      isFinanceSection={false}
      modules={[]}
      moduleId={null} setModuleId={noop}
      financeOrder={null} setFinanceOrder={noop}
      lessonType="concept" setLessonType={noop}
      categories={[]}
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

describe('key-takeaways guidance copy matches the gate', () => {
  it('says three are required for an editorial essay', () => {
    renderMetadata({ isFinanceSection: false, moduleId: null });
    expect(screen.getByText(/Three are required to publish/i)).toBeInTheDocument();
  });

  it('says three are required for a finance essay with no module', () => {
    renderMetadata({ isFinanceSection: true, moduleId: null });
    expect(screen.getByText(/Three are required to publish/i)).toBeInTheDocument();
  });

  it('explains the per-lesson-type rule only for a module-placed finance lesson', () => {
    renderMetadata({ isFinanceSection: true, moduleId: 'mod-1' });
    expect(screen.getByText(/optional \(but all-or-nothing\) for case studies/i)).toBeInTheDocument();
  });
});
