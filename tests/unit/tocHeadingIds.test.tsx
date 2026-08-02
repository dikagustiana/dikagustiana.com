/**
 * The table of contents and the article body number their heading ids with
 * two INDEPENDENT counters over the same document. They only agree if both
 * counters walk the same heading set — every h1–h6, because that is what
 * `ArticleBody` increments over.
 *
 * The regression this pins: `extractHeadings` used to select only `h2, h3`,
 * so any h1/h4/h5/h6 appearing before an h2 shifted every subsequent
 * `section-N-…` id in the body while the ToC kept its own numbering — and
 * every anchor below that point pointed at nothing.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { extractHeadings } from '@/components/editorial/ArticleToc';

// An h1 first, an h4 in the middle: both used to be invisible to the ToC's
// counter while ArticleBody counted them.
const DOC = [
  '<h1>Opening thesis</h1>',
  '<p>Prose.</p>',
  '<h2>First section</h2>',
  '<p>Prose.</p>',
  '<h4>An aside heading</h4>',
  '<h3>A subsection</h3>',
  '<h2>Second section</h2>',
].join('');

function renderedHeadingIds(html: string): string[] {
  const { container } = render(<ArticleBody content={html} />);
  return Array.from(container.querySelectorAll('h2, h3')).map(el => el.id);
}

describe('ToC anchor ids match the ids ArticleBody renders', () => {
  it('agrees with the body when h1/h4 headings precede listed ones', () => {
    const tocIds = extractHeadings(DOC).map(item => item.id);
    const bodyIds = renderedHeadingIds(DOC);
    expect(tocIds).toEqual(bodyIds);
    expect(tocIds).toHaveLength(3); // lists only h2/h3
    // The counter advanced over the h1 (and later the h4), so the first
    // listed heading is section-2, not section-1.
    expect(tocIds[0]).toBe('section-2-first-section');
    expect(tocIds[1]).toBe('section-4-a-subsection');
    expect(tocIds[2]).toBe('section-5-second-section');
  });

  it('still agrees on a plain h2/h3-only document', () => {
    const plain = '<h2>Alpha</h2><p>x</p><h3>Beta</h3>';
    expect(extractHeadings(plain).map(i => i.id)).toEqual(renderedHeadingIds(plain));
  });
});
