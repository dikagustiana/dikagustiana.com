/**
 * The FSLI page's "On this page" (src/lib/fsliToc.ts) is built from the
 * headings of the essay it renders as its body, not from a fixed outline.
 * Every entry must name a heading that is actually on the page, so the ids
 * are compared with the ones ArticleBody renders, for both stored forms
 * (TipTap JSON and legacy HTML).
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

function renderedIds(content: string): string[] {
  const { container } = render(<ArticleBody content={content} />);
  return Array.from(container.querySelectorAll('h2, h3')).map((el) => el.id);
}

describe('buildFsliToc', () => {
  it('nests each h3 under the h2 before it, in document order', () => {
    const content = doc(
      heading(2, 'What counts as cash'),
      para('Prose.'),
      heading(3, 'Demand deposits'),
      heading(3, 'Short-term placements'),
      heading(2, 'Where it is presented'),
    );
    expect(buildFsliToc([content])).toEqual([
      {
        id: 'section-1-what-counts-as-cash',
        title: 'What counts as cash',
        children: [
          { id: 'section-2-demand-deposits', title: 'Demand deposits' },
          { id: 'section-3-short-term-placements', title: 'Short-term placements' },
        ],
      },
      { id: 'section-4-where-it-is-presented', title: 'Where it is presented', children: [] },
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
      const ids = fsliTocIds(buildFsliToc([content]));
      expect(ids).toEqual(renderedIds(content));
      // The counter walked the h1 and the h4 as well, as the body's does.
      expect(ids).toEqual(['section-2-first', 'section-4-a-detail', 'section-5-second']);
    }
  });

  it('keeps two headings with the same words apart by their position', () => {
    const content = doc(heading(2, 'Example'), para('One.'), heading(2, 'Example'));
    const ids = fsliTocIds(buildFsliToc([content]));
    expect(ids).toEqual(['section-1-example', 'section-2-example']);
    expect(new Set(ids).size).toBe(2);
    // Stable: the same essay gives the same ids every time.
    expect(fsliTocIds(buildFsliToc([content]))).toEqual(ids);
  });

  it('stands an h3 that precedes every h2 on its own', () => {
    const content = doc(heading(3, 'Before any section'), heading(2, 'Section'), heading(3, 'Inside'));
    expect(buildFsliToc([content]).map((entry) => [entry.title, entry.children.map((c) => c.title)])).toEqual([
      ['Before any section', []],
      ['Section', ['Inside']],
    ]);
  });

  it('is empty for an essay without h2/h3 headings, and for no essay at all', () => {
    expect(buildFsliToc([doc(para('Only prose.'), heading(4, 'A minor heading'))])).toEqual([]);
    expect(buildFsliToc([null, ''])).toEqual([]);
    expect(buildFsliToc([])).toEqual([]);
  });

  it('lists a second essay after the first and never repeats an id', () => {
    const first = doc(heading(2, 'Scope'), heading(3, 'Detail'));
    const second = doc(heading(2, 'Scope'), heading(2, 'Measurement'), heading(3, 'Detail'));
    const toc = buildFsliToc([first, second]);
    // The second essay's "Scope" renders as section-1-scope too; it is left
    // out, and its h3 does not climb under the first essay's h2.
    expect(fsliTocIds(toc)).toEqual(['section-1-scope', 'section-2-detail', 'section-2-measurement', 'section-3-detail']);
    expect(toc.map((entry) => entry.title)).toEqual(['Scope', 'Measurement']);
    expect(toc[1].children.map((c) => c.title)).toEqual(['Detail']);
  });
});
