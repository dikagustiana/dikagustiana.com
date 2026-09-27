/**
 * `linkCard` — the link-preview block. Place ONE of the four-place contract
 * (extensions → serialize → ArticleBody → sanitizeHtml).
 *
 * Scope decision (docs/DECISIONS.md, "Link previews: server-resolved,
 * metadata only"). This card used to be built from the URL alone, and real
 * oEmbed was deferred because it needs a server round trip and, for iframe
 * embeds, a wider sanitizer. The owner asked for it and chose the METADATA-ONLY
 * variant: no iframe, no third-party script, no provider HTML rendered.
 *
 *   - Resolution happens at AUTHORING time. When the author asks, the editor
 *     calls the `link-preview` edge function, which returns plain text (title,
 *     description, author, source, date). The result is written into this
 *     node's attributes and stored with the essay. The author can edit every
 *     field, and a manual value always wins over a fetched one.
 *   - The public page renders the stored snapshot and calls nothing. A deleted
 *     or unreachable source post never blanks an existing card.
 *   - `resolvedAt` records when the snapshot was taken, so the author can see
 *     its age. It shows in the editor only.
 *
 * Every tag and attribute this block emits (`a`, `span`, `href`, `target`,
 * `rel`, `class`, `data-type`, `data-link-card`) was already in the
 * sanitizer's allowlist. Every field rides inside the one `data-link-card`
 * blob, so the sanitizer and the CSP needed no change for any of it.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { LinkCardBlock } from '@/components/editorial/LinkCardBlock';
import { createElement } from 'react';
import { Trash2 } from 'lucide-react';
import { attrJsonRaw } from './attrJson';
import {
  LINK_CARD_FIELDS,
  linkCardFromElement,
  linkCardMarkup,
  normalizeLinkCard,
  type LinkCardData,
} from './linkCardData';

function LinkCardNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const attrs = normalizeLinkCard(node.attrs);
  return createElement(
    NodeViewWrapper,
    null,
    createElement(
      'div',
      { className: selected ? 'relative rounded-lg ring-2 ring-primary' : 'relative' },
      createElement(LinkCardBlock, { data: attrs, isEditing: true }),
      createElement(
        'button',
        {
          type: 'button',
          onClick: deleteNode,
          'aria-label': 'Remove link preview',
          className:
            'absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded bg-background/80 text-muted-foreground hover:text-destructive',
        },
        createElement(Trash2, { className: 'h-3.5 w-3.5' }),
      ),
    ),
  );
}

export const LinkCardExtension = Node.create({
  name: 'linkCard',
  group: 'block',
  atom: true,
  draggable: true,


  addAttributes() {
    // One attribute per stored field (linkCardData.ts), all plain strings.
    return Object.fromEntries(LINK_CARD_FIELDS.map(field => [field, { default: '' }]));
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type="link-card"]',
        // Above the default 50, and load-bearing. The card renders as an `<a>`,
        // which is exactly what StarterKit's Link mark claims, and ProseMirror
        // gathers every *mark* rule before any *node* rule — so at equal
        // priority the mark wins and the card is parsed back as an ordinary
        // styled link. Insert one, reload, and the block was simply gone.
        // Covered by tests/unit/editorHtmlRoundTrip.test.ts.
        priority: 100,
        // The blob when present; with no blob (hand-written HTML, or a
        // sanitiser that dropped it), rebuilt from what the card renders.
        getAttrs: dom => (typeof dom === 'string' ? {} : linkCardFromElement(dom as HTMLElement)),
      },
    ];
  },

  renderHTML({ node }) {
    const card = normalizeLinkCard(node.attrs);
    return [
      'a',
      mergeAttributes({
        href: card.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-type': 'link-card',
        // Raw: this builds real DOM, which escapes attribute values itself.
        'data-link-card': attrJsonRaw(card),
        class: 'link-card',
      }),
      // "Title — Author · Source · Date". The same pieces serialize.ts writes.
      ...linkCardMarkup(card).map(piece =>
        piece.className ? ['span', { class: piece.className }, piece.text] : piece.text,
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkCardNodeView);
  },

  addCommands() {
    return {
      insertLinkCard:
        (attrs: LinkCardData) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkCard: {
      insertLinkCard: (attrs: LinkCardData) => ReturnType;
    };
  }
}
