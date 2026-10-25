/**
 * The finance Fundamentals import (scripts/finance-import): markdown with
 * frontmatter → the curriculum stub it fills. The fixture is a small inline
 * stand-in; the batch itself stays out of the repo, as the accounting one does.
 */
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import {
  docLatex,
  docToHtml,
  editorReadTime,
  escapeStarredVariables,
  htmlToDoc,
  keyTakeaways,
  latexBlocks,
  markdownToHtml,
  matchStub,
  moduleSlugOf,
  parseFrontmatter,
  stripHeader,
  stripInBrief,
  stubCodeOf,
  textDifference,
  type Stub,
} from '../../scripts/finance-import/convert';
import { getEditorExtensions } from '@/lib/tiptap/extensions';

const FILE = `---
title: "Perpetuities and Terminal Value"
deck: "Why Small Assumption Changes Produce Large Valuation Errors"
author: "Dika Gustiana"
date: 2026-10-09
module: "T1-M03 Time Value of Money"
code: "fu-03-02"
slug: perpetuities-and-terminal-value
read_time: "20 min read"
status: draft v0.3
---

# Perpetuities and Terminal Value

*Why Small Assumption Changes Produce Large Valuation Errors*

**In brief**

- A growing perpetuity is worth next year's cash over r − g.
- Value rises as 1/(r − g), so errors grow as the spread narrows.
- A contract that ends is not a perpetuity.

---

## A perpetuity is a geometric series

Start from the present value of a cash flow C:

\`\`\`latex
PV = \\frac{C}{1+r} + \\frac{C(1+g)}{(1+r)^2} + \\cdots
\`\`\`

> **Escalate when e × V > c, so the threshold is V* = c / e**

| Spread | Value of US$1 |
| --- | --- |
| 3.9% | 25.64 |

### Least-confident assertions

- The rate is the essay's construction.
`;

function convert(text = FILE) {
  const { fm, body } = parseFrontmatter(text);
  const afterHeader = stripHeader(body, fm.title as string, fm.deck as string);
  const starred = escapeStarredVariables(stripInBrief(afterHeader));
  const doc = htmlToDoc(markdownToHtml(starred.text));
  return { fm, afterHeader, markdown: starred.text, starred, doc, content: docToHtml(doc) };
}

describe('body', () => {
  it('moves the In brief list to the takeaways and starts the body at the first section', () => {
    const { afterHeader, markdown } = convert();
    expect(keyTakeaways(afterHeader)).toHaveLength(3);
    expect(markdown.startsWith('## A perpetuity is a geometric series')).toBe(true);
  });

  it('refuses a body with no In brief list', () => {
    expect(() => stripInBrief('## Straight in\n\nText.\n')).toThrow(/In brief/);
  });

  it('writes a latex fence as the editor\'s math block, never a code block', () => {
    const { markdown, doc, content } = convert();
    expect(latexBlocks(markdown)).toEqual(['PV = \\frac{C}{1+r} + \\frac{C(1+g)}{(1+r)^2} + \\cdots']);
    expect(docLatex(doc)).toEqual({ block: latexBlocks(markdown), inline: [], codeBlocks: 0 });
    expect(content).toContain('<div data-latex="PV = \\frac{C}{1+r} + \\frac{C(1+g)}{(1+r)^2} + \\cdots" data-type="block-math"></div>');
    expect(content).not.toContain('<pre>');
  });

  it('refuses a fence that is not latex', () => {
    expect(() => latexBlocks('```python\nx = 1\n```\n')).toThrow(/unexpected code fence/);
  });

  it('keeps a starred variable inside bold as a literal star', () => {
    const { starred, content } = convert();
    expect(starred.count).toBe(1);
    expect(content).toContain('<blockquote><p><strong>Escalate when e × V &gt; c, so the threshold is V* = c / e</strong></p></blockquote>');
  });

  it('leaves emphasis that closes after a word alone', () => {
    expect(escapeStarredVariables('the *Direksi*) and *Principles*, 14th ed.').count).toBe(0);
  });

  it('reads the same words and numbers as the markdown', () => {
    const { markdown, doc } = convert();
    expect(textDifference(markdown, doc)).toBeNull();
  });

  it('round-trips through the editor itself: load, edit and save change nothing else', () => {
    const { content, doc } = convert();
    expect(htmlToDoc(content)).toEqual(doc);
    const editor = new Editor({ extensions: getEditorExtensions(), content });
    expect(editor.getHTML()).toBe(content);
    expect(JSON.parse(JSON.stringify(editor.getJSON()))).toEqual(doc);
    editor.destroy();
  });
});

describe('metadata', () => {
  it('computes reading time the way the editor does, 200 words a minute rounded up', () => {
    expect(editorReadTime('word '.repeat(4001))).toBe('21 min read');
    expect(editorReadTime('')).toBe('1 min read');
  });

  it('reads the module and the stub code from the frontmatter', () => {
    expect(moduleSlugOf('T1-M05 Firm Valuation: DCF and Relative Methods')).toBe('t1-m05');
    expect(moduleSlugOf('T1-M08A Financial Statement Construction')).toBe('t1-m08a');
    expect(stubCodeOf('fu-05-03')).toBe('ff-05-03');
  });
});

describe('stub matching', () => {
  const stub = (over: Partial<Stub>): Stub => ({
    id: 'x', slug: 's', title: 'T', code: null, module_slug: 't1-m05', finance_order: 1, section: 'finance', ...over,
  });
  const stubs = [
    stub({ id: 'a', slug: 'multiples-as-compressed-dcf-models', title: 'Multiples as Compressed DCF Models: The Theoretical Basis', code: 'ff-05-03' }),
    stub({ id: 'b', slug: 'sum-of-parts-valuation-in-conglomerate', title: 'Sum-of-Parts Valuation in Conglomerate Structures: When', code: 'ff-05-04' }),
    stub({ id: 'c', slug: 'other', title: 'Unrelated', code: 'sf-01-01', section: 'next-big-thing' }),
  ];

  it('matches by the title before the deck colon first', () => {
    expect(matchStub({ title: 'Multiples as Compressed DCF Models', slug: 'multiples-as-compressed-dcf', code: 'fu-05-03' }, stubs))
      .toMatchObject({ by: 'title', stub: { id: 'a' } });
  });

  it('falls back to slug, then curriculum code', () => {
    expect(matchStub({ title: 'Renamed', slug: 'multiples-as-compressed-dcf-models', code: 'fu-09-09' }, stubs))
      .toMatchObject({ by: 'slug', stub: { id: 'a' } });
    expect(matchStub({ title: 'Sum-of-the-Parts Valuation in Holding Companies', slug: 'sum-of-the-parts-holding-discount', code: 'fu-05-04' }, stubs))
      .toMatchObject({ by: 'code', stub: { id: 'b' } });
  });

  it('returns null for a new essay and never matches outside finance', () => {
    expect(matchStub({ title: 'Unrelated', slug: 'other', code: 'fu-09-09' }, stubs)).toBeNull();
  });

  it('refuses two stubs at one step', () => {
    const twins = [stub({ id: 'a', title: 'Same: x' }), stub({ id: 'b', title: 'Same: y' })];
    expect(() => matchStub({ title: 'Same', slug: 'z', code: 'fu-01-01' }, twins)).toThrow(/2 stubs match by title/);
  });
});
