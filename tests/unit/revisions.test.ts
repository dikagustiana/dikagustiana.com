import { describe, it, expect } from 'vitest';
import {
  REVISION_ROLLUP_MS,
  canAutosave,
  canonicalJson,
  docsDiffer,
  findRecoveryCandidate,
  isEmptyDoc,
  nextRevisionNo,
  shouldRollUpRevision,
  type RevisionSummary,
} from '@/lib/revisions';

function revision(overrides: Partial<RevisionSummary> = {}): RevisionSummary {
  return {
    id: 'r1',
    revision_no: 4,
    change_type: 'autosave',
    created_at: new Date('2026-08-01T10:00:00Z').toISOString(),
    content_json: { type: 'doc', content: [] },
    title: 'Draft',
    ...overrides,
  };
}

const NOW = new Date('2026-08-01T10:00:10Z').getTime(); // 10s after the revision

describe('canonicalJson', () => {
  it('is insensitive to object key order', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  it('preserves array order (document order is meaningful)', () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });

  it('sorts nested keys too', () => {
    const a = { type: 'doc', content: [{ attrs: { level: 2 }, type: 'heading' }] };
    const b = { content: [{ type: 'heading', attrs: { level: 2 } }], type: 'doc' };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });
});

describe('docsDiffer', () => {
  // The reason canonicalJson exists: Postgres jsonb does not preserve key
  // order, so a round-tripped document comes back reordered. A naive
  // stringify comparison would call it changed on every single load and the
  // recovery prompt would never stop firing.
  it('treats a jsonb-reordered round-trip as unchanged', () => {
    const fromEditor = { type: 'doc', content: [{ type: 'paragraph', attrs: { id: 'x' } }] };
    const fromJsonb = { content: [{ attrs: { id: 'x' }, type: 'paragraph' }], type: 'doc' };
    expect(JSON.stringify(fromEditor)).not.toBe(JSON.stringify(fromJsonb));
    expect(docsDiffer(fromEditor, fromJsonb)).toBe(false);
  });

  it('detects a real content change', () => {
    const a = { type: 'doc', content: [{ type: 'paragraph' }] };
    const b = { type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] };
    expect(docsDiffer(a, b)).toBe(true);
  });

  it('treats two empty sides as equal', () => {
    expect(docsDiffer(null, undefined)).toBe(false);
  });

  it('treats a document against nothing as a difference', () => {
    expect(docsDiffer({ type: 'doc', content: [{ type: 'paragraph' }] }, null)).toBe(true);
  });
});

describe('isEmptyDoc', () => {
  it('is empty for null, no content, and a lone blank paragraph', () => {
    expect(isEmptyDoc(null)).toBe(true);
    expect(isEmptyDoc({ type: 'doc', content: [] })).toBe(true);
    expect(isEmptyDoc({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(true);
  });

  it('is not empty once there is text', () => {
    expect(
      isEmptyDoc({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
      }),
    ).toBe(false);
  });
});

describe('canAutosave', () => {
  const ok = { essayId: 'e1', title: 'Hello', sectionId: 's1', categoryId: 'c1' };

  it('allows autosave when the essay exists and has required placement', () => {
    expect(canAutosave(ok)).toBe(true);
  });

  it('blocks autosave for not-yet-created essays (no id)', () => {
    expect(canAutosave({ ...ok, essayId: null })).toBe(false);
  });

  it('blocks autosave without a section or category (NOT NULL FK)', () => {
    expect(canAutosave({ ...ok, sectionId: '' })).toBe(false);
    expect(canAutosave({ ...ok, categoryId: '' })).toBe(false);
  });

  it('blocks autosave with a blank title', () => {
    expect(canAutosave({ ...ok, title: '   ' })).toBe(false);
  });
});

describe('shouldRollUpRevision', () => {
  it('rolls up our own recent autosave', () => {
    expect(shouldRollUpRevision(revision(), 'r1', NOW)).toBe(true);
  });

  it('never rolls up a row this session did not write (another tab)', () => {
    expect(shouldRollUpRevision(revision({ id: 'other' }), 'r1', NOW)).toBe(false);
  });

  it('never rolls up after a reload, when we own nothing yet', () => {
    expect(shouldRollUpRevision(revision(), null, NOW)).toBe(false);
  });

  it('never rolls up an explicit save marker', () => {
    expect(shouldRollUpRevision(revision({ change_type: 'manual_save' }), 'r1', NOW)).toBe(false);
  });

  it('appends a new revision once the rollup window has passed', () => {
    const past = NOW + REVISION_ROLLUP_MS + 1;
    expect(shouldRollUpRevision(revision(), 'r1', past)).toBe(false);
  });

  it('handles an empty history', () => {
    expect(shouldRollUpRevision(null, 'r1', NOW)).toBe(false);
  });
});

describe('nextRevisionNo', () => {
  it('starts at 1 and increments monotonically', () => {
    expect(nextRevisionNo(null)).toBe(1);
    expect(nextRevisionNo(revision({ revision_no: 7 }))).toBe(8);
  });
});

describe('findRecoveryCandidate', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph' }] };

  it('offers recovery when the backup differs from the saved essay', () => {
    const latest = revision({ content_json: doc });
    expect(findRecoveryCandidate(latest, { type: 'doc', content: [] })).not.toBeNull();
  });

  it('stays quiet when the backup matches the saved essay', () => {
    const latest = revision({ content_json: doc });
    expect(findRecoveryCandidate(latest, doc)).toBeNull();
  });

  it('stays quiet when the backup only differs by jsonb key order', () => {
    const editorDoc = { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 } }] };
    const storedDoc = { content: [{ attrs: { level: 2 }, type: 'heading' }], type: 'doc' };
    expect(findRecoveryCandidate(revision({ content_json: storedDoc }), editorDoc)).toBeNull();
  });

  it('ignores explicit saves — those are already in the essay row', () => {
    const latest = revision({ change_type: 'manual_save', content_json: doc });
    expect(findRecoveryCandidate(latest, null)).toBeNull();
  });

  it('handles no history at all', () => {
    expect(findRecoveryCandidate(null, doc)).toBeNull();
  });
});
