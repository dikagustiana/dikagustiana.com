/**
 * The lecture-notes removal's transform (site cleanup 2026-10, WP3; scripts/content/lectureNotes.ts): an
 * edit replaces exactly one span and keeps the marks around it, a deleted reference renumbers the list and
 * every "ref. N" after it, a citation of the removed item or an ambiguous edit is refused, and the patterns
 * the acceptance counts are found.
 */
import { describe, expect, it } from 'vitest';
import { HARD_PATTERNS, applyEdits, citationProblems, findPatterns, textOf, type DocNode } from '../../scripts/content/lectureNotes';

const p = (...content: DocNode[]): DocNode => ({ type: 'paragraph', content });
const t = (text: string, marks?: DocNode['marks']): DocNode => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const li = (text: string): DocNode => ({ type: 'listItem', content: [p(t(text))] });

const doc = (): DocNode => ({
  type: 'doc',
  content: [
    p(t('The lecture notes say the credit is Cash; '), t('Kieso', [{ type: 'italic' }]), t(' disagrees (ref. 3).')),
    p(t('See ref. 1 and ref. 2.')),
    { type: 'heading', attrs: { level: 2 }, content: [t('References')] },
    { type: 'orderedList', attrs: { start: 1 }, content: [li('PHE FS 2024.'), li('Lecture notes this page follows, "Inter 2 – Chapter 14" (Rumpun Akuntansi Keuangan).'), li('Kieso, Intermediate Accounting.')] },
  ],
});

describe('the lecture-notes transform', () => {
  it('replaces one span, keeping the marks beside it, removes the notes reference and renumbers the citations after it', () => {
    const r = applyEdits('x', doc(), null, [
      { find: 'The lecture notes say the credit is Cash; ', replace: 'No cash moves, so the credit is Interest payable; ' },
      { find: 'See ref. 1 and ref. 2.', replace: 'See ref. 1.' },
      { deleteBlock: 'Lecture notes this page follows' },
    ]);
    const first = r.doc.content![0];
    expect(textOf(first)).toBe('No cash moves, so the credit is Interest payable; Kieso disagrees (ref. 2).');
    expect(first.content![1]).toEqual(t('Kieso', [{ type: 'italic' }]));
    expect(r.referencesAfter).toEqual(['PHE FS 2024.', 'Kieso, Intermediate Accounting.']);
    expect([...r.renumber]).toEqual([[1, 1], [2, null], [3, 2]]);
    expect(r.citations.map((c) => `${c.before}→${c.after}`)).toEqual(['ref. 3→ref. 2']);
    expect(findPatterns(JSON.stringify(r.doc), HARD_PATTERNS)).toEqual([]);
    expect(citationProblems(r.doc)).toEqual([]);
  });

  it('refuses a citation of the removed item, a find that is not exactly once, and finds what the acceptance counts', () => {
    expect(() => applyEdits('x', doc(), null, [{ deleteBlock: 'Lecture notes this page follows' }])).toThrow(/cites the removed item 2/);
    expect(() => applyEdits('x', doc(), null, [{ find: 'ref.', replace: 'r.' }])).toThrow(/occurs 2 times|found 2 times/);
    expect(() => applyEdits('x', doc(), null, [{ find: 'nowhere', replace: '' }])).toThrow(/found 0 times/);
    expect(findPatterns('AKL – Chapter 4; AKL - Chapter 3; lecture notes; Rumpun Akuntansi', HARD_PATTERNS)).toHaveLength(4);
  });

  it('edits a presentation string, and leaves another essay\'s citation for a person to check', () => {
    const d = doc();
    d.content!.splice(1, 1, p(t('As verified in essay 08, ref. 7.')));
    const r = applyEdits('x', d, { key_takeaways: ['The lecture notes call it X.'] }, [
      { find: 'The lecture notes say the credit is Cash; ', replace: 'The credit is Interest payable; ' },
      { deleteBlock: 'Lecture notes this page follows' },
      { field: 'presentation', find: 'The lecture notes call it X.', replace: 'It is X.' },
    ]);
    expect(r.presentation).toEqual({ key_takeaways: ['It is X.'] });
    expect(r.crossRefs).toHaveLength(1);
    expect(textOf(r.doc.content![1])).toBe('As verified in essay 08, ref. 7.');
  });
});
