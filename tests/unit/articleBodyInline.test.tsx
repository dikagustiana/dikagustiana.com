/**
 * Place three of the content contract: what the reader actually renders.
 *
 * Published essay pages pass `essays.content` — the HTML column — to
 * `ArticleBody`, so the legacy HTML branch is the live path, not a fallback.
 * Any tag it does not name falls through to `processChildren`, which returns
 * the text without its wrapper: the words survive and the formatting silently
 * does not. Strikethrough is one of the eight actions in the bubble menu and
 * was doing exactly that — applied in the editor, stored in the database,
 * absent from the published page.
 *
 * Every tag in `sanitizeHtml`'s allowlist that the editor can produce is
 * asserted here, so the next one to go missing fails a test instead of a
 * reader's expectations.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ArticleBody } from '@/components/editorial/ArticleBody';

function html(body: string) {
  const { container } = render(<ArticleBody content={body} />);
  return container;
}

describe('ArticleBody renders the inline formatting the editor can apply', () => {
  const CASES: Array<[string, string, string]> = [
    ['bold', '<p>a <strong>BOLD</strong> b</p>', 'strong'],
    ['italic', '<p>a <em>ITALIC</em> b</p>', 'em'],
    ['strikethrough', '<p>a <s>STRUCK</s> b</p>', 's'],
    ['strikethrough (strike)', '<p>a <strike>STRUCK</strike> b</p>', 's'],
    ['strikethrough (del)', '<p>a <del>STRUCK</del> b</p>', 's'],
    ['underline', '<p>a <u>UNDER</u> b</p>', 'u'],
    ['superscript', '<p>a <sup>SUP</sup> b</p>', 'sup'],
    ['subscript', '<p>a <sub>SUB</sub> b</p>', 'sub'],
    ['inline code', '<p>a <code>CODE</code> b</p>', 'code'],
    ['link', '<p>a <a href="https://example.com">LINK</a> b</p>', 'a[href]'],
  ];

  for (const [name, source, selector] of CASES) {
    it(`renders ${name}`, () => {
      const container = html(source);
      const el = container.querySelector(selector);
      expect(el, `${selector} missing from the rendered output`).not.toBeNull();
      expect(el!.textContent).toMatch(/BOLD|ITALIC|STRUCK|UNDER|SUP|SUB|CODE|LINK/);
    });
  }

  it('renders a line break rather than dropping it', () => {
    expect(html('<p>one<br>two</p>').querySelector('br')).not.toBeNull();
  });

  it('renders the block-level types the insert menu produces', () => {
    const container = html(
      '<h2>H</h2><h3>S</h3><blockquote><p>Q</p></blockquote>' +
        '<ul><li>L</li></ul><hr><pre><code>c</code></pre>' +
        '<table><tbody><tr><td>cell</td></tr></tbody></table>',
    );
    for (const sel of ['h2', 'h3', 'blockquote', 'ul li', 'hr', 'pre', 'table td']) {
      expect(container.querySelector(sel), `${sel} missing`).not.toBeNull();
    }
  });
});
