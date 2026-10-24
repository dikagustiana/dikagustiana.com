/**
 * The library scripts' pure parts (scripts/books; docs/prd/library-phase-2 §4): which essays cite which book
 * (rebuild-citations.ts).
 */
import { describe, expect, it } from 'vitest';
import { citations, fold, names, referenceTexts } from '../../scripts/books/citations';

describe('book citations', () => {
  const madilog = { id: 'b1', title: 'Madilog', author: 'Tan Malaka' };
  const republik = { id: 'b2', title: 'Naar de Republiek Indonesia', author: null };
  const capital = { id: 'b3', title: 'Capital', author: null };

  it('folds accents, case and punctuation', () => {
    expect(fold('Économie — Politique!')).toBe(' economie politique ');
  });

  it("names a book by its whole title and the author's surname", () => {
    expect(names('Malaka, Tan. Madilog. Jakarta: Widjaya, 1951.', madilog)).toBe(true);
    expect(names('Tan Malaka (1943), MADILOG, p. 12', madilog)).toBe(true);
    // The title alone is not enough when the book has an author.
    expect(names('Madilog, a reading guide (anonymous)', madilog)).toBe(false);
    // A title inside a longer word is not the title.
    expect(names('Malaka on Madilogism', madilog)).toBe(false);
    // Without an author a long title is enough; a short one-word title never is.
    expect(names('Naar de "Republiek Indonesia" (1925)', republik)).toBe(true);
    expect(names('Marx, Capital, vol. 1', capital)).toBe(false);
  });

  it("reads an essay's references and footnotes, and pairs each book and essay once", () => {
    const essay = {
      id: 'e1',
      presentation: { references: ['Malaka, Tan. Madilog (1943).', { label: 'Tan Malaka, Madilog, 2nd ed.', url: 'https://example.com' }, 7] },
      content_json: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }, { type: 'footnote', attrs: { text: 'See Naar de Republiek Indonesia, p. 3.' } }] }],
      },
    };
    expect(referenceTexts(essay)).toEqual(['Malaka, Tan. Madilog (1943).', 'Tan Malaka, Madilog, 2nd ed.', 'See Naar de Republiek Indonesia, p. 3.']);
    expect(citations([madilog, republik, capital], [essay, { id: 'e2', presentation: null, content_json: null }])).toEqual([
      { book_id: 'b1', essay_id: 'e1' },
      { book_id: 'b2', essay_id: 'e1' },
    ]);
  });
});
