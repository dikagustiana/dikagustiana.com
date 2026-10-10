/**
 * The FSLI page's "On this page" (src/lib/fsliToc.ts) is built from the
 * headings of the essay it renders as its body, not from a fixed outline.
 * Its ids are the slug of each heading's words, with an index only on a
 * repeat (PRD R1.2), minted once per page and rendered by ArticleBody through
 * its headingIds prop. Every entry must name a heading that is actually on
 * the page, so the ids are compared with the ones ArticleBody renders, for
 * both stored forms (TipTap JSON and legacy HTML).
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { buildFsliToc, fsliTocIds } from '@/lib/fsliToc';

const heading = (level: number, text: string): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});
const para = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = (...content: JSONContent[]) => JSON.stringify({ type: 'doc', content });

/** Renders the essays as the page does and returns the heading ids, in page order. */
function renderedIds(contents: string[], selector = 'h1, h2, h3, h4, h5, h6'): string[] {
  const { headingIds } = buildFsliToc(contents);
  const { container } = render(
    <>
      {contents.map((content, i) => (
        <ArticleBody key={i} content={content} headingIds={headingIds[i]} />
      ))}
    </>,
  );
  return Array.from(container.querySelectorAll(selector)).map((el) => el.id);
}

describe('buildFsliToc', () => {
  it('nests each h3 under the h2 before it, in document order', () => {
    const content = doc(
      heading(2, 'What counts as cash'),
      para('Prose.'),
      heading(3, 'Demand deposits'),
      heading(3, 'Short-term placements'),
      heading(2, 'Where it is presented?'),
    );
    expect(buildFsliToc([content]).entries).toEqual([
      {
        id: 'what-counts-as-cash',
        title: 'What counts as cash',
        children: [
          { id: 'demand-deposits', title: 'Demand deposits' },
          { id: 'short-term-placements', title: 'Short-term placements' },
        ],
      },
      { id: 'where-it-is-presented', title: 'Where it is presented?', children: [] },
    ]);
  });

  it('lists exactly the ids ArticleBody renders, for TipTap JSON and for legacy HTML', () => {
    const json = doc(
      heading(1, 'Opening'),
      heading(2, 'First'),
      heading(4, 'An aside'),
      heading(3, 'A detail'),
      heading(2, 'Second'),
    );
    const html = '<h1>Opening</h1><h2>First</h2><h4>An aside</h4><h3>A detail</h3><h2>Second</h2>';
    for (const content of [json, html]) {
      const ids = fsliTocIds(buildFsliToc([content]).entries);
      expect(ids).toEqual(['first', 'a-detail', 'second']);
      expect(renderedIds([content], 'h2, h3')).toEqual(ids);
      // Every heading gets an anchor, the ones the table leaves out included.
      expect(renderedIds([content])).toEqual(['opening', 'first', 'an-aside', 'a-detail', 'second']);
    }
  });

  it('keeps a heading\'s id when another heading is added above it', () => {
    const before = doc(heading(2, 'Scope'), heading(2, 'Measurement'));
    const after = doc(heading(1, 'Opening'), heading(2, 'Scope'), heading(3, 'A new detail'), heading(2, 'Measurement'));
    expect(fsliTocIds(buildFsliToc([before]).entries)).toEqual(['scope', 'measurement']);
    expect(fsliTocIds(buildFsliToc([after]).entries)).toEqual(['scope', 'a-new-detail', 'measurement']);
  });

  it('adds an index only to a repeated heading', () => {
    const content = doc(heading(2, 'Example'), para('One.'), heading(2, 'Example'), heading(2, 'Example 2'));
    const ids = fsliTocIds(buildFsliToc([content]).entries);
    expect(ids).toEqual(['example', 'example-2', 'example-2-2']);
    expect(renderedIds([content])).toEqual(ids);
    // Stable: the same essay gives the same ids every time.
    expect(fsliTocIds(buildFsliToc([content]).entries)).toEqual(ids);
  });

  it('never takes an id the page already holds, and names a heading without letters', () => {
    const content = doc(heading(2, 'Main content'), heading(2, '—'), heading(2, '2024'));
    expect(fsliTocIds(buildFsliToc([content]).entries)).toEqual(['main-content-2', 'section', '2024']);
  });

  it('stands an h3 that precedes every h2 on its own', () => {
    const content = doc(heading(3, 'Before any section'), heading(2, 'Section'), heading(3, 'Inside'));
    expect(buildFsliToc([content]).entries.map((entry) => [entry.title, entry.children.map((c) => c.title)])).toEqual([
      ['Before any section', []],
      ['Section', ['Inside']],
    ]);
  });

  it('is empty for an essay without h2/h3 headings, and for no essay at all', () => {
    expect(buildFsliToc([doc(para('Only prose.'), heading(4, 'A minor heading'))]).entries).toEqual([]);
    expect(buildFsliToc([null, ''])).toEqual({ entries: [], headingIds: [[], []] });
    expect(buildFsliToc([])).toEqual({ entries: [], headingIds: [] });
  });

  it('gives a second essay\'s headings ids of their own, so the page lists them all and repeats none', () => {
    const first = doc(heading(2, 'Scope'), heading(3, 'Detail'));
    const second = doc(heading(2, 'Scope'), heading(2, 'Measurement'), heading(3, 'Detail'));
    const toc = buildFsliToc([first, second]);
    expect(toc.entries.map((entry) => entry.title)).toEqual(['Scope', 'Scope', 'Measurement']);
    expect(fsliTocIds(toc.entries)).toEqual(['scope', 'detail', 'scope-2', 'measurement', 'detail-2']);
    // Its h3 does not climb under the first essay's h2.
    expect(toc.entries[2].children.map((c) => c.title)).toEqual(['Detail']);

    const ids = renderedIds([first, second]);
    expect(ids).toEqual(fsliTocIds(toc.entries));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ArticleBody heading ids', () => {
  it('keeps its positional ids when no headingIds are passed (the essay page)', () => {
    const { container } = render(<ArticleBody content={doc(heading(1, 'Opening'), heading(2, 'First'))} />);
    expect(Array.from(container.querySelectorAll('h1, h2')).map((el) => el.id)).toEqual([
      'section-1-opening',
      'section-2-first',
    ]);
  });
});
