import { describe, it, expect } from 'vitest';
import { validateEssay } from '@/components/writer/WriterValidation';
import { GENRES, GENRE_IDS, genreOf } from '@/data/genres';
import { CURRICULUM_CONTRACT } from '@/data/curriculumContract';

/**
 * The publish gate used to enforce finished FORM harder than evidence: title,
 * category, deck, three takeaways and 500 words were hard errors on every
 * piece, while a missing source was an advisory warning on one section. So a
 * two-hundred-word correction citing a document could not be published without
 * padding, and a long argument about a live policy could be published with no
 * source at all.
 */

const base = {
  title: 'A Title',
  deck: 'A deck line.',
  keyTakeaways: [] as string[],
  wordCount: 1200,
  references: [{ label: 'A source', url: 'https://example.org' }],
  section: 'next-big-thing',
  content: '<p>Body</p>',
  categoryId: 'c1',
};
const fieldsWithError = (r: ReturnType<typeof validateEssay>) => r.errors.map((e) => e.field);

describe('an undeclared piece keeps the old rules exactly', () => {
  it('still needs three takeaways and five hundred words', () => {
    const r = validateEssay({ ...base, wordCount: 120 });
    expect(fieldsWithError(r)).toContain('keyTakeaways');
    expect(fieldsWithError(r)).toContain('content');
  });

  it('still publishes with no source, as before', () => {
    const r = validateEssay({ ...base, keyTakeaways: ['a', 'b', 'c'], references: [] });
    expect(fieldsWithError(r)).not.toContain('references');
    expect(r.canPublish).toBe(true);
  });
});

describe('a correction can be short, and has to cite and explain', () => {
  const correction = { ...base, genre: 'correction' as const };

  it('publishes at two hundred words without padding or takeaways', () => {
    const r = validateEssay({ ...correction, wordCount: 200, revisionNote: 'What changed, and why.' });
    expect(fieldsWithError(r)).not.toContain('content');
    expect(fieldsWithError(r)).not.toContain('keyTakeaways');
    expect(r.canPublish).toBe(true);
  });

  it('refuses to publish with no source', () => {
    const r = validateEssay({ ...correction, wordCount: 200, references: [], revisionNote: 'x y z' });
    expect(fieldsWithError(r)).toContain('references');
  });

  it('refuses to publish without saying what changed', () => {
    const r = validateEssay({ ...correction, wordCount: 200, revisionNote: '' });
    expect(fieldsWithError(r)).toContain('revisionNote');
  });

  it('is still too short below its own floor', () => {
    const r = validateEssay({ ...correction, wordCount: 20, revisionNote: 'x y z' });
    expect(fieldsWithError(r)).toContain('content');
  });
});

describe('an argued position has to cite something', () => {
  it('refuses to publish with no source, however long', () => {
    const r = validateEssay({
      ...base,
      genre: 'argued-position',
      keyTakeaways: ['a', 'b', 'c'],
      references: [],
      wordCount: 2400,
    });
    expect(fieldsWithError(r)).toContain('references');
    expect(r.canPublish).toBe(false);
  });
});

describe('an exploratory piece is not forced into a takeaway block', () => {
  it('warns rather than blocks', () => {
    const r = validateEssay({ ...base, genre: 'exploratory' });
    expect(fieldsWithError(r)).not.toContain('keyTakeaways');
    expect(r.warnings.map((w) => w.field)).toContain('keyTakeaways');
  });

  it('still refuses a half-filled takeaway block', () => {
    // A half-filled standing block is the real failure mode, under every genre.
    const r = validateEssay({ ...base, genre: 'exploratory', keyTakeaways: ['a'] });
    expect(fieldsWithError(r)).toContain('keyTakeaways');
  });
});

describe('the genre vocabulary', () => {
  it('states an evidential contract for each, not a tone', () => {
    for (const id of GENRE_IDS) {
      expect(GENRES[id].means.length, id).toBeGreaterThan(40);
      expect(GENRES[id].contract.length, id).toBeGreaterThan(40);
    }
  });

  it('never guesses a genre from anything', () => {
    expect(genreOf(undefined)).toBeNull();
    expect(genreOf('')).toBeNull();
    expect(genreOf('op-ed')).toBeNull();
    expect(genreOf('correction')).toBe(GENRES.correction);
  });
});

describe('the curriculum promises nothing it has not scheduled', () => {
  it('labels an unwritten item Planned, not Coming soon', () => {
    expect(CURRICULUM_CONTRACT.plannedLabel).toBe('Planned');
    expect(CURRICULUM_CONTRACT.note.toLowerCase()).toContain('commits to a date');
  });

  it('says the inventory is the point, rather than apologising for it', () => {
    expect(CURRICULUM_CONTRACT.standfirst.toLowerCase()).toContain('whether or not it has been answered');
  });
});
