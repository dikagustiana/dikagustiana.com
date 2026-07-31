import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { FigureBlock, FigureBlockData } from '@/components/editorial/FigureBlock';

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
          const dataFigure = element.getAttribute('data-figure');
          if (dataFigure) {
            try {
              return JSON.parse(dataFigure);
            } catch {
              return {};
            }
          }
          return {};
        },
      },
    ];
  },
  
  renderHTML({ node }) {
    const attrs = node.attrs as FigureBlockData;
    const jsonData = JSON.stringify(attrs)
      .replace(/"/g, '&quot;');
    
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
