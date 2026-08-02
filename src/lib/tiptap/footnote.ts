/**
 * Footnote — an inline citation marker whose note text lives in an attribute.
 *
 * HTML shape: <sup data-type="footnote" data-footnote="…note text…"></sup>
 *
 * Design decisions, recorded in docs/DECISIONS.md:
 *
 *  - The note text is an ATTRIBUTE, not nested rich content. Nested content
 *    would mean a second document inside the document — a much larger
 *    round-trip surface for no need the curriculum has. Citations are one or
 *    two plain sentences.
 *  - Numbering is POSITIONAL and never stored. Both surfaces number the
 *    markers with a CSS counter (see index.css / ArticleBody), so inserting a
 *    footnote above an existing one renumbers everything for free and no
 *    stored number can ever go stale.
 *  - This complements, not replaces, `presentation.references` — references
 *    are the end-of-essay reading list ("ANCHORS USED"); footnotes are point
 *    citations inside the argument. Different jobs, both kept.
 *
 * Round-trip: renderHTML emits the two attributes and no children; parseHTML
 * reads the attribute back. The text passes through the DOM's own attribute
 * escaping in renderHTML (never pre-escaped — see attrJson.ts for why), so
 * quotes and ampersands survive parse(render(x)) byte-for-byte.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface FootnoteOptions {
  /** Called when the writer clicks a marker: open the edit dialog. */
  onEdit?: (pos: number, text: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      /** Insert a footnote marker at the current selection. */
      insertFootnote: (attrs?: { text?: string }) => ReturnType;
      /** Replace the note text of the footnote at `pos`. */
      updateFootnote: (pos: number, text: string) => ReturnType;
      /** Delete the footnote at `pos`. */
      deleteFootnote: (pos: number) => ReturnType;
    };
  }
}

export const Footnote = Node.create<FootnoteOptions>({
  name: 'footnote',

  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { onEdit: undefined };
  },

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: element => element.getAttribute('data-footnote') ?? '',
        renderHTML: attributes => ({ 'data-footnote': String(attributes.text ?? '') }),
      },
    };
  },

  parseHTML() {
    // priority 100: the Superscript MARK also claims <sup>, and ProseMirror
    // gathers every mark rule before any node rule at equal priority — the
    // exact mechanism that turned a stored link card back into a bare link.
    // Without this, an empty marker sup parses as a superscript mark over
    // nothing and the footnote silently vanishes on reload. Caught by the
    // round-trip test, not by reading code.
    return [{ tag: 'sup[data-type="footnote"]', priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    // Empty content: the visible number comes from a CSS counter, so the
    // marker can never disagree with its position.
    return ['sup', mergeAttributes(HTMLAttributes, { 'data-type': 'footnote' })];
  },

  addCommands() {
    return {
      insertFootnote:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { text: attrs.text ?? '' } }),

      updateFootnote:
        (pos, text) =>
        ({ tr, state }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, text });
          return true;
        },

      deleteFootnote:
        pos =>
        ({ tr, state }) => {
          const node = state.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          tr.delete(pos, pos + node.nodeSize);
          return true;
        },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('sup');
      dom.setAttribute('data-type', 'footnote');
      dom.setAttribute('data-footnote', String(node.attrs.text ?? ''));
      dom.setAttribute('role', 'button');
      dom.setAttribute('tabindex', '0');
      dom.title = String(node.attrs.text ?? '') || 'Empty footnote — click to write it';

      const open = () => {
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos == null) return;
        const current = editor.state.doc.nodeAt(pos);
        this.options.onEdit?.(pos, String(current?.attrs.text ?? ''));
      };
      dom.addEventListener('click', open);
      dom.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });

      return {
        dom,
        update: updated => {
          if (updated.type.name !== this.name) return false;
          dom.setAttribute('data-footnote', String(updated.attrs.text ?? ''));
          dom.title = String(updated.attrs.text ?? '') || 'Empty footnote — click to write it';
          return true;
        },
      };
    };
  },
});
