import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { FigureBlock, FigureBlockData } from '@/components/editorial/FigureBlock';
import { attrJsonRaw, parseAttrJson } from '@/lib/tiptap/attrJson';

// TipTap Node View component for rendering figures in the editor
function FigureNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as FigureBlockData;
  
  return (
    <NodeViewWrapper>
      <div className={selected ? 'ring-2 ring-primary rounded-lg' : ''}>
        <FigureBlock
          data={attrs}
          isEditing
          onDelete={deleteNode}
        />
      </div>
    </NodeViewWrapper>
  );
}

// Custom TipTap extension for FigureBlock
export const FigureExtension = Node.create({
  name: 'figure',
  
  group: 'block',
  
  atom: true, // Cannot be edited directly, treated as a single unit
  
  draggable: true, // Allow drag-and-drop reordering
  
  addAttributes() {
    return {
      src: { default: '' },
      altText: { default: '' },
      caption: { default: '' },
      sourceName: { default: '' },
      sourceUrl: { default: '' },
      noSource: { default: false },
      widthMode: { default: 'content' },
      kind: { default: 'image' },
      naturalWidth: { default: null },
      naturalHeight: { default: null },
      aspectRatio: { default: null },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'figure[data-type="figure-block"]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {};
          const element = dom as HTMLElement;
          // Tolerant on purpose: everything written before this fix is in the
          // database pre-escaped, and a strict parse threw and silently reset
          // every attribute to its default — an image reloaded as src="".
          return parseAttrJson<Record<string, unknown>>(element.getAttribute('data-figure')) ?? {};
        },
      },
    ];
  },
  
  renderHTML({ node }) {
    const attrs = node.attrs as FigureBlockData;
    // Raw: this builds real DOM, and the serialiser escapes it on the way out.
    const jsonData = attrJsonRaw(attrs);
    
    return [
      'figure',
      mergeAttributes({
        'data-type': 'figure-block',
        'data-figure': jsonData,
        class: 'figure-block',
      }),
      ['img', { src: attrs.src, alt: attrs.altText }],
    ];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(FigureNodeView);
  },
  
  addCommands() {
    return {
      insertFigure: (attrs: FigureBlockData) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs,
          })
          .run();
      },
    };
  },
});

// Extend TipTap's command types
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      insertFigure: (attrs: FigureBlockData) => ReturnType;
    };
  }
}
