/**
 * Callout — a tinted aside box, from the Quote ▾ group of the toolbar.
 *
 * HTML shape: <div data-type="callout"> … paragraphs … </div>
 *
 * Round-trip note (the fifth place of the content contract): renderHTML emits
 * only the data-type attribute and a content hole, and parseHTML matches on
 * exactly that attribute, so parse(render(x)) is byte-stable. No JSON-in-
 * attribute payload exists on this node, so the attrJson escaping hazard does
 * not apply.
 */

import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /** Wrap the selection in a callout, or unwrap if already inside one. */
      toggleCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',

  group: 'block',
  content: 'paragraph+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
  },

  addCommands() {
    return {
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});
