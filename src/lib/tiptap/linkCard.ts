/**
 * `linkCard` — the Embed / link-preview block. Place ONE of the four-place
 * contract (extensions → serialize → ArticleBody → sanitizeHtml).
 *
 * Scope decision (docs/DECISIONS.md): this is the client-side card, built from
 * the URL alone. It fetches nothing and embeds nothing. The alternative —
 * real oEmbed/Open Graph metadata — needs a server round trip via an edge
 * function AND, for the embeds people actually want (YouTube, Twitter), an
 * `iframe`, which `sanitizeHtml` currently forbids. That version would need
 * both a new edge function and a widened sanitizer allowlist, so it is not
 * built without asking.
 *
 * Every tag and attribute below (`a`, `span`, `href`, `target`, `rel`, `class`,
 * `data-type`, `data-link-card`) is already in the sanitizer's allowlist, so
 * this block survives publish unchanged.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { LinkCardBlock, type LinkCardData } from '@/components/editorial/LinkCardBlock';
import { createElement } from 'react';
import { Trash2 } from 'lucide-react';
import { attrJsonRaw, parseAttrJson } from './attrJson';

function LinkCardNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as unknown as LinkCardData;
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
    return {
      url: { default: '' },
      title: { default: '' },
      description: { default: '' },
    };
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
        getAttrs: dom => {
          if (typeof dom === 'string') return {};
          const el = dom as HTMLElement;
          const stored = parseAttrJson<Record<string, unknown>>(el.getAttribute('data-link-card'));
          if (stored) return stored;
          // No blob (hand-written HTML, or a sanitiser that dropped it): rebuild
          // from what the card renders.
          return {
            url: el.getAttribute('href') ?? '',
            title: el.querySelector('.link-card__title')?.textContent ?? '',
            description: el.querySelector('.link-card__description')?.textContent ?? '',
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as unknown as LinkCardData;
    return [
      'a',
      mergeAttributes({
        href: attrs.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-type': 'link-card',
        // Raw: this builds real DOM, which escapes attribute values itself.
        'data-link-card': attrJsonRaw(attrs),
        class: 'link-card',
      }),
      ['span', { class: 'link-card__title' }, attrs.title || attrs.url || ''],
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
