/**
 * The reading side of the link card: the public page renders the STORED
 * snapshot and asks nothing of anyone.
 *
 * Resolution happens at authoring time (the link-preview edge function, called
 * from the editor). If a reader's render ever fetched metadata, a deleted
 * source post would blank a published card, and the CSP question this design
 * avoids would come back. So both of ArticleBody's paths are rendered here
 * with fetch and XHR watched. The card must show its attribution, stay one
 * anchor to the source, load no remote image, and make zero requests.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { LinkCardBlock } from '@/components/editorial/LinkCardBlock';
import { getSchemaExtensions } from '@/lib/tiptap/extensions';

const CARD = {
  url: 'https://www.noahpinion.blog/p/the-case-for?utm_source=a&utm_medium=b',
  title: 'The case for industrial policy',
  description: 'Why the old consensus broke.',
  author: 'Noah Smith',
  authorUrl: 'https://www.noahpinion.blog/about',
  siteName: 'Noahpinion',
  publishedAt: '2024-03-21',
  resolvedAt: '2026-09-27T08:00:00.000Z',
};

/** What `essays.content` holds: the editor's own HTML. */
function storedHtml(): string {
  const editor = new Editor({ extensions: getSchemaExtensions(), content: '<p></p>' });
  editor.commands.insertLinkCard(CARD);
  const html = editor.getHTML();
  editor.destroy();
  return html;
}

function storedJson(): string {
  return JSON.stringify({ type: 'doc', content: [{ type: 'linkCard', attrs: CARD }] });
}

afterEach(() => vi.restoreAllMocks());

describe('a published link card renders from its stored fields alone', () => {
  for (const [path, content] of [
    ['HTML (the live path: essays.content)', storedHtml],
    ['TipTap JSON', storedJson],
  ] as const) {
    it(`${path}: attribution shown, one anchor, no image, zero requests`, () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');

      const { container } = render(<ArticleBody content={content()} />);

      const anchors = container.querySelectorAll('a.link-card');
      expect(anchors).toHaveLength(1);
      const card = anchors[0] as HTMLAnchorElement;
      expect(card.getAttribute('href')).toBe(CARD.url);
      expect(card.getAttribute('target')).toBe('_blank');
      // One anchor: nothing inside the card is a second link.
      expect(card.querySelectorAll('a')).toHaveLength(0);

      expect(card.querySelector('.link-card__source')?.textContent).toBe('Noahpinion');
      expect(card.querySelector('.link-card__title')?.textContent).toBe(CARD.title);
      expect(card.querySelector('.link-card__description')?.textContent).toBe(CARD.description);
      expect(card.querySelector('.link-card__author')?.textContent).toBe('Noah Smith');
      expect(card.querySelector('.link-card__date')?.textContent).toBe('21 March 2024');

      // The snapshot's age is for the author, never the reader.
      expect(card.textContent).not.toContain('fetched');
      // No remote thumbnail, no embed, no script.
      expect(card.querySelector('img, iframe, script')).toBeNull();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  }

  it('a card with no author or date still names its source (the host)', () => {
    const { container } = render(<LinkCardBlock data={{ url: 'https://www.example.com/x', title: 'T' }} />);
    expect(container.querySelector('.link-card__source')?.textContent).toBe('example.com');
    expect(container.querySelector('.link-card__author')).toBeNull();
    expect(container.querySelector('.link-card__date')).toBeNull();
  });

  it("in the editor, the card shows when its details were fetched", () => {
    const { container } = render(<LinkCardBlock data={CARD} isEditing />);
    expect(container.textContent).toContain('Details fetched 27 September 2026');
    // …and a hand-typed card (no resolvedAt) claims no fetch.
    const typed = render(<LinkCardBlock data={{ ...CARD, resolvedAt: '' }} isEditing />);
    expect(typed.container.textContent).not.toContain('fetched');
  });
});
