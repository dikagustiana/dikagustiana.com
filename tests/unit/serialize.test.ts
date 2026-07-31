import { describe, it, expect } from 'vitest';
import {
  isLegacyHtmlContent,
  parseTiptapJson,
  tiptapJsonToHtml,
  contentToHtml,
  extractFiguresFromJson,
  tiptapJsonToMarkdown,
} from '@/lib/tiptap/serialize';
import type { JSONContent } from '@tiptap/core';

const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });
const para = (text: string, marks?: JSONContent['marks']): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text, marks }],
});

describe('isLegacyHtmlContent', () => {
  it('is false for empty/nullish', () => {
    expect(isLegacyHtmlContent('')).toBe(false);
    expect(isLegacyHtmlContent(null)).toBe(false);
    expect(isLegacyHtmlContent(undefined)).toBe(false);
  });
  it('is false for valid TipTap JSON', () => {
    expect(isLegacyHtmlContent(JSON.stringify(doc(para('hi'))))).toBe(false);
  });
  it('is true for HTML and for invalid JSON', () => {
    expect(isLegacyHtmlContent('<p>hello</p>')).toBe(true);
    expect(isLegacyHtmlContent('{ not valid json')).toBe(true);
  });
});

describe('parseTiptapJson', () => {
  it('parses a doc', () => {
    const parsed = parseTiptapJson(JSON.stringify(doc(para('x'))));
    expect(parsed?.type).toBe('doc');
  });
  it('returns null for html / empty / non-doc json', () => {
    expect(parseTiptapJson('<p>x</p>')).toBeNull();
    expect(parseTiptapJson('')).toBeNull();
    expect(parseTiptapJson('{"type":"other"}')).toBeNull();
  });
});

describe('tiptapJsonToHtml', () => {
  it('renders paragraphs and headings', () => {
    const html = tiptapJsonToHtml(doc(para('Hello'), { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H' }] }));
    expect(html).toBe('<p>Hello</p><h3>H</h3>');
  });

  it('renders marks (bold, italic, link)', () => {
    const html = tiptapJsonToHtml(doc(para('B', [{ type: 'bold' }])));
    expect(html).toBe('<p><strong>B</strong></p>');

    const link = tiptapJsonToHtml(
      doc(para('go', [{ type: 'link', attrs: { href: 'https://a', target: '_blank' } }])),
    );
    expect(link).toContain('<a href="https://a" target="_blank" rel="noopener noreferrer">go</a>');
  });

  it('escapes HTML-special characters in text', () => {
    const html = tiptapJsonToHtml(doc(para('a < b & "c"')));
    expect(html).toContain('&lt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).not.toContain('<b>');
  });

  it('returns empty string for an empty doc', () => {
    expect(tiptapJsonToHtml({ type: 'doc' } as JSONContent)).toBe('');
  });
});

describe('contentToHtml', () => {
  it('converts TipTap JSON to HTML', () => {
    expect(contentToHtml(JSON.stringify(doc(para('hi'))))).toBe('<p>hi</p>');
  });
  it('passes legacy HTML through unchanged', () => {
    expect(contentToHtml('<p>legacy</p>')).toBe('<p>legacy</p>');
  });
  it('returns empty string for nullish/empty', () => {
    expect(contentToHtml(null)).toBe('');
    expect(contentToHtml('   ')).toBe('');
  });
});

describe('extractFiguresFromJson', () => {
  it('collects figure nodes (with src) anywhere in the tree', () => {
    const tree = doc(
      para('intro'),
      { type: 'figure', attrs: { src: 'a.png', altText: 'A' } },
      {
        type: 'blockquote',
        content: [{ type: 'figure', attrs: { src: 'nested.png', altText: 'N' } }],
      },
    );
    const figs = extractFiguresFromJson(tree);
    expect(figs.map((f) => f.src)).toEqual(['a.png', 'nested.png']);
  });

  it('ignores figure nodes without a src', () => {
    const tree = doc({ type: 'figure', attrs: { altText: 'no src' } });
    expect(extractFiguresFromJson(tree)).toEqual([]);
  });

  it('returns empty for null/empty docs', () => {
    expect(extractFiguresFromJson(null)).toEqual([]);
    expect(extractFiguresFromJson({ type: 'doc' } as JSONContent)).toEqual([]);
  });
});

describe('tiptapJsonToMarkdown', () => {
  it('renders headings, paragraphs, and marks', () => {
    const tree = doc(
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
      para('bold', [{ type: 'bold' }]),
      para('a link', [{ type: 'link', attrs: { href: 'https://x.com' } }]),
    );
    const md = tiptapJsonToMarkdown(tree);
    expect(md).toContain('## Title');
    expect(md).toContain('**bold**');
    expect(md).toContain('[a link](https://x.com)');
  });

  it('renders lists, blockquotes, and figures', () => {
    const tree = doc(
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [para('first')] },
          { type: 'listItem', content: [para('second')] },
        ],
      },
      { type: 'blockquote', content: [para('quoted')] },
      { type: 'figure', attrs: { src: 'img.png', caption: 'A chart' } },
    );
    const md = tiptapJsonToMarkdown(tree);
    expect(md).toContain('- first');
    expect(md).toContain('- second');
    expect(md).toContain('> quoted');
    expect(md).toContain('![A chart](img.png)');
  });

  it('returns empty string for nullish/empty docs', () => {
    expect(tiptapJsonToMarkdown(null)).toBe('');
    expect(tiptapJsonToMarkdown({ type: 'doc' } as JSONContent)).toBe('');
  });
});
