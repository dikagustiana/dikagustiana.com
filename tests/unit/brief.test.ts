/**
 * The Brief companion's pure core: word counting, the exists/empty
 * predicate, and the jsonb boundary parse. The word count matters more than
 * it looks: the editor's live number and the admin queue's displayed number
 * are BOTH this function, so these tests are the two surfaces' agreement.
 */

import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import {
  BRIEF_TARGET_MAX,
  BRIEF_TARGET_MIN,
  briefWordCount,
  hasBrief,
  isEmptyBrief,
  parseBriefDoc,
} from '@/lib/brief';

const doc = (...paragraphs: string[]): JSONContent => ({
  type: 'doc',
  content: paragraphs.map(text => ({
    type: 'paragraph',
    content: text ? [{ type: 'text', text }] : [],
  })),
});

describe('briefWordCount', () => {
  it('counts words across paragraphs', () => {
    expect(briefWordCount(doc('One two three.', 'Four five.'))).toBe(5);
  });

  it('does not glue the last and first words of adjacent blocks together', () => {
    // Without a block-boundary separator, "three." + "Four" would count as one.
    const d = doc('One two three.', 'Four');
    expect(briefWordCount(d)).toBe(4);
  });

  it('counts marked text (bold, italic, links) as ordinary words', () => {
    const d: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Plain ' },
            { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' and ' },
            {
              type: 'text',
              text: 'a link',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
          ],
        },
      ],
    };
    expect(briefWordCount(d)).toBe(5);
  });

  it('is zero for null and for an empty document', () => {
    expect(briefWordCount(null)).toBe(0);
    expect(briefWordCount(doc(''))).toBe(0);
  });

  it('collapses runs of whitespace instead of counting them', () => {
    expect(briefWordCount(doc('One   two\n\nthree'))).toBe(3);
  });
});

describe('isEmptyBrief / hasBrief', () => {
  it('an empty or whitespace-only document is empty', () => {
    expect(isEmptyBrief(null)).toBe(true);
    expect(isEmptyBrief({ type: 'doc', content: [] })).toBe(true);
    expect(isEmptyBrief(doc(''))).toBe(true);
    expect(isEmptyBrief(doc('   '))).toBe(true);
  });

  it('one word is enough to exist — existence, not length, is the queue exit', () => {
    expect(isEmptyBrief(doc('Word'))).toBe(false);
    expect(hasBrief(doc('Word'))).toBe(true);
  });

  it('hasBrief rejects null, non-docs and malformed values (the jsonb boundary)', () => {
    expect(hasBrief(null)).toBe(false);
    expect(hasBrief(undefined)).toBe(false);
    expect(hasBrief('a string')).toBe(false);
    expect(hasBrief([])).toBe(false);
    expect(hasBrief({ type: 'paragraph' })).toBe(false);
  });
});

describe('parseBriefDoc', () => {
  it('accepts a doc-typed object and rejects everything else', () => {
    const d = doc('Text');
    expect(parseBriefDoc(d)).toEqual(d);
    expect(parseBriefDoc({ type: 'not-a-doc' })).toBeNull();
    expect(parseBriefDoc('{}')).toBeNull();
    expect(parseBriefDoc(null)).toBeNull();
  });
});

describe('the target band', () => {
  it('is 500–600, stated once, imported everywhere', () => {
    // The number the editor prints beside the live count and the number the
    // queue judges drift against must be the same constant.
    expect(BRIEF_TARGET_MIN).toBe(500);
    expect(BRIEF_TARGET_MAX).toBe(600);
  });
});
