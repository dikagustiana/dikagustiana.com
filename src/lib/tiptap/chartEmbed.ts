/**
 * `chartEmbed` — a live Transition Tracker chart inside an essay
 * (docs/prd/transition-data-layer, Kebutuhan fungsional 7). Place ONE of the
 * five-place content contract (extensions → serialize → ArticleBody →
 * sanitizeHtml → round-trip test).
 *
 * The node stores the chart's slug and nothing else: no number is typed into
 * the essay. The published page reads the chart's definition and its latest
 * values from the same views the tracker page reads (ChartEmbed.tsx), so an
 * essay and the tracker cannot disagree. An embed whose chart is not
 * published renders as nothing on the public page and as a placeholder in
 * the editor.
 *
 * HTML form: <figure data-type="chart-embed" data-chart-slug="…"
 * class="chart-embed">Chart: …</figure>. `data-chart-slug` is the one new
 * attribute in the sanitizer's allowlist; the slug is checked against
 * CHART_SLUG on every read.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { lazy, createElement, Suspense } from 'react';
import { Trash2 } from 'lucide-react';
import { normalizeChartSlug } from './chartEmbedData';

export { CHART_SLUG, normalizeChartSlug } from './chartEmbedData';

const ChartEmbed = lazy(() => import('@/components/transition/ChartEmbed'));

function ChartEmbedNodeView({ node, deleteNode, selected }: NodeViewProps) {
  const slug = normalizeChartSlug(node.attrs.slug);
  return createElement(
    NodeViewWrapper,
    { 'data-drag-handle': '' },
    createElement(
      'div',
      { className: selected ? 'relative rounded-md ring-2 ring-primary' : 'relative', contentEditable: false },
      createElement(Suspense, { fallback: createElement('div', { className: 'h-40 rounded-md bg-muted/40' }) },
        createElement(ChartEmbed, { slug, isEditing: true })),
      createElement(
        'button',
        {
          type: 'button',
          onClick: deleteNode,
          'aria-label': 'Remove chart',
          className:
            'absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded bg-background/80 text-muted-foreground hover:text-destructive',
        },
        createElement(Trash2, { className: 'h-3.5 w-3.5' }),
      ),
    ),
  );
}

export const ChartEmbedExtension = Node.create({
  name: 'chartEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { slug: { default: '' } };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="chart-embed"]',
        // Above FigureExtension's figure rule, which would otherwise claim it.
        priority: 100,
        getAttrs: dom =>
          typeof dom === 'string' ? {} : { slug: normalizeChartSlug((dom as HTMLElement).getAttribute('data-chart-slug')) },
      },
    ];
  },

  renderHTML({ node }) {
    const slug = normalizeChartSlug(node.attrs.slug);
    return [
      'figure',
      mergeAttributes({ 'data-type': 'chart-embed', 'data-chart-slug': slug, class: 'chart-embed' }),
      `Chart: ${slug}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartEmbedNodeView);
  },

  addCommands() {
    return {
      insertChartEmbed:
        (slug: string) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { slug: normalizeChartSlug(slug) } }).run(),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chartEmbed: {
      insertChartEmbed: (slug: string) => ReturnType;
    };
  }
}
