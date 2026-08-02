/**
 * ArticleBody — Renders essay content as React elements.
 *
 * Supports two paths:
 *   1. TipTap JSON → direct React rendering (preferred, no DOM parsing).
 *   2. Legacy HTML  → DOMParser fallback for old content only.
 *
 * The direct JSON renderer avoids the JSON→HTML→DOMParser→React round-trip.
 *
 * Typography, measure and rhythm come from the shared editorial type system
 * in src/index.css (.prose-editorial), which the writing canvas
 * (.essay-prose) also reads — the two surfaces share one set of rules by
 * construction. This file declares structure, not sizes.
 *
 * This is the third place of the five-place content contract (extensions →
 * serialize → HERE → sanitizeHtml → round-trip test). A node type missing
 * here renders as nothing on the published page while looking fine in the
 * editor — the project's signature failure.
 */

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { LinkableHeading, type LinkableHeadingLevel } from './LinkableHeading';
import { FigureBlock, FigureBlockData } from './FigureBlock';
import { LinkCardBlock } from './LinkCardBlock';
import { cn } from '@/lib/utils';
import { parseTiptapJson, isLegacyHtmlContent } from '@/lib/tiptap/serialize';
import { parseAttrJson } from '@/lib/tiptap/attrJson';
import type { JSONContent } from '@tiptap/core';
import type { CSSProperties } from 'react';

interface ArticleBodyProps {
  content: string;
  fontSizeClass?: string;
  className?: string;
}

/** Rendering pass state: heading ids, footnote numbering, collected notes. */
interface RenderCtx {
  heading: number;
  footnote: number;
  notes: string[];
}

// ---------------------------------------------------------------------------
// KaTeX — rendered client-side from the LaTeX source in data-latex. KaTeX's
// output markup never enters the database or the sanitizer; it is generated
// here, after sanitization, from a plain-text attribute. KaTeX escapes its
// input, and throwOnError:false renders bad input as visible red source
// rather than throwing mid-page.
//
// LAZY: katex (and its CSS) load only when a math node actually renders.
// A static import here put ~270 KB of JS on every reader's critical path
// for math that no published essay contains. While the chunk loads the
// component shows the raw LaTeX source — content, not a spinner.
// ---------------------------------------------------------------------------

type KatexModule = typeof import('@/lib/katexLoader')['default'];
let katexPromise: Promise<KatexModule> | null = null;

function loadKatex(): Promise<KatexModule> {
  if (!katexPromise) {
    // One module owns katex AND its CSS (see katexLoader.ts for why the
    // CSS must not be dynamically imported on its own).
    katexPromise = import('@/lib/katexLoader').then(mod => mod.default);
  }
  return katexPromise;
}

function useKatexHtml(latex: string, displayMode: boolean): string | null {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    if (!latex) return;
    let alive = true;
    loadKatex().then(katex => {
      if (!alive) return;
      try {
        setHtml(katex.renderToString(latex, { throwOnError: false, displayMode }));
      } catch {
        setHtml(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [latex, displayMode]);
  return html;
}

export function MathInline({ latex }: { latex: string }) {
  const html = useKatexHtml(latex, false);
  if (!latex) return null;
  if (html == null) return <code>{latex}</code>;
  return (
    <span
      data-type="inline-math"
      data-latex={latex}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MathBlock({ latex }: { latex: string }) {
  const html = useKatexHtml(latex, true);
  if (!latex) return null;
  if (html == null) return <pre><code>{latex}</code></pre>;
  return (
    <div
      data-type="block-math"
      data-latex={latex}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ---------------------------------------------------------------------------
// Footnotes — markers number themselves by position; the notes render as an
// end-of-essay list with backlinks. Coexists with presentation.references:
// references are the end-of-essay reading list, footnotes are point
// citations inside the argument.
// ---------------------------------------------------------------------------

function FootnoteMarker({ index }: { index: number }) {
  return (
    <sup data-type="footnote" id={`fnref-${index}`}>
      <a href={`#fn-${index}`} aria-label={`Footnote ${index}`}>{index}</a>
    </sup>
  );
}

function FootnotesSection({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="footnotes mt-12 border-t border-border pt-6" aria-label="Footnotes">
      <ol className="text-[0.875em] text-prose-muted">
        {notes.map((note, i) => (
          <li key={i} id={`fn-${i + 1}`}>
            {note}{' '}
            <a href={`#fnref-${i + 1}`} aria-label={`Back to reference ${i + 1}`} className="text-primary no-underline">
              ↩
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Direct TipTap JSON → React renderer (no HTML / no DOMParser)
// ---------------------------------------------------------------------------

function renderMarksToReact(
  text: string,
  marks: Array<{ type: string; attrs?: Record<string, unknown> }> | undefined,
  key: string
): ReactNode {
  if (!marks || marks.length === 0) return text;

  let node: ReactNode = text;
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    const mkey = `${key}-m${i}`;
    switch (mark.type) {
      case 'bold':
        node = <strong key={mkey}>{node}</strong>;
        break;
      case 'italic':
        node = <em key={mkey}>{node}</em>;
        break;
      case 'strike':
        node = <s key={mkey}>{node}</s>;
        break;
      case 'code':
        node = <code key={mkey}>{node}</code>;
        break;
      case 'superscript':
        node = <sup key={mkey}>{node}</sup>;
        break;
      case 'subscript':
        node = <sub key={mkey}>{node}</sub>;
        break;
      // One textStyle mark carries colour and highlight; render exactly the
      // two properties the sanitizer whitelists.
      case 'textStyle': {
        const style: CSSProperties = {};
        if (mark.attrs?.color) style.color = String(mark.attrs.color);
        if (mark.attrs?.backgroundColor) style.backgroundColor = String(mark.attrs.backgroundColor);
        if (style.color || style.backgroundColor) {
          node = <span key={mkey} style={style}>{node}</span>;
        }
        break;
      }
      case 'link': {
        const href = String(mark.attrs?.href ?? '');
        const isExternal = href.startsWith('http');
        node = (
          <a
            key={mkey}
            href={href}
            className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
          >
            {node}
          </a>
        );
        break;
      }
    }
  }
  return node;
}

function extractPlainText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  if (!node.content) return '';
  return node.content.map(extractPlainText).join('');
}

/** Alignment set by the writer; left is the default and renders nothing. */
function alignStyleOf(node: JSONContent): CSSProperties | undefined {
  const align = node.attrs?.textAlign;
  if (!align || align === 'left') return undefined;
  return { textAlign: align as 'center' | 'right' | 'justify' };
}

function renderJsonNode(
  node: JSONContent,
  index: number,
  ctx: RenderCtx
): ReactNode {
  if (!node) return null;
  const key = `${node.type || 'unknown'}-${index}`;

  switch (node.type) {
    case 'doc':
      return <>{renderJsonChildren(node.content, ctx)}</>;

    case 'text':
      return renderMarksToReact(
        node.text ?? '',
        node.marks as Array<{ type: string; attrs?: Record<string, unknown> }>,
        key
      );

    case 'paragraph': {
      const children = renderJsonChildren(node.content, ctx);
      if (!children) return null;
      return (
        <p key={key} style={alignStyleOf(node)}>
          {children}
        </p>
      );
    }

    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
      const text = extractPlainText(node);
      ctx.heading++;
      const id = `section-${ctx.heading}-${text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50)}`;
      return (
        <LinkableHeading
          key={key}
          id={id}
          level={`h${level}` as LinkableHeadingLevel}
          textAlign={node.attrs?.textAlign ? String(node.attrs.textAlign) : null}
        >
          {text}
        </LinkableHeading>
      );
    }

    case 'bulletList':
      return <ul key={key}>{renderJsonChildren(node.content, ctx)}</ul>;

    case 'orderedList':
      return <ol key={key}>{renderJsonChildren(node.content, ctx)}</ol>;

    case 'listItem':
      return <li key={key}>{renderJsonChildren(node.content, ctx)}</li>;

    case 'blockquote': {
      const variant = node.attrs?.variant === 'pull' ? 'pull' : undefined;
      return (
        <blockquote key={key} data-variant={variant}>
          {renderJsonChildren(node.content, ctx)}
        </blockquote>
      );
    }

    case 'callout':
      return (
        <div key={key} data-type="callout">
          {renderJsonChildren(node.content, ctx)}
        </div>
      );

    case 'blockMath':
      return <MathBlock key={key} latex={String(node.attrs?.latex ?? '')} />;

    case 'inlineMath':
      return <MathInline key={key} latex={String(node.attrs?.latex ?? '')} />;

    case 'footnote': {
      ctx.footnote++;
      ctx.notes.push(String(node.attrs?.text ?? ''));
      return <FootnoteMarker key={key} index={ctx.footnote} />;
    }

    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{extractPlainText(node)}</code>
        </pre>
      );

    case 'horizontalRule':
      return <hr key={key} />;

    case 'hardBreak':
      return <br key={key} />;

    case 'figure': {
      const figureData = node.attrs as unknown as FigureBlockData;
      if (figureData?.src) {
        return <FigureBlock key={key} data={figureData} />;
      }
      return null;
    }

    case 'linkCard': {
      const url = String(node.attrs?.url ?? '');
      if (!url) return null;
      return (
        <LinkCardBlock
          key={key}
          data={{
            url,
            title: String(node.attrs?.title ?? ''),
            description: String(node.attrs?.description ?? ''),
          }}
        />
      );
    }

    case 'image': {
      const src = String(node.attrs?.src ?? '');
      if (!src) return null;
      return (
        <img
          key={key}
          src={src}
          alt={String(node.attrs?.alt ?? '')}
          title={node.attrs?.title ? String(node.attrs.title) : undefined}
          loading="lazy"
          className="w-full h-auto rounded-md my-8"
        />
      );
    }

    // The wrapper scrolls, not the page. A wide table inside the article flow
    // would otherwise push the whole body sideways on a phone.
    case 'table':
      return (
        <div key={key} className="my-8 -mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
          {/* Cell content is paragraphs; the body's paragraph margin would
              otherwise pad out every cell. */}
          <table className="w-full border-collapse text-sm [&_p]:mb-0">
            <tbody>{renderJsonChildren(node.content, ctx)}</tbody>
          </table>
        </div>
      );

    case 'tableRow':
      return (
        <tr key={key} className="border-b border-border last:border-b-0">
          {renderJsonChildren(node.content, ctx)}
        </tr>
      );

    case 'tableHeader':
      return (
        <th
          key={key}
          colSpan={Number(node.attrs?.colspan ?? 1) || undefined}
          rowSpan={Number(node.attrs?.rowspan ?? 1) || undefined}
          className="border border-border bg-muted/50 px-3 py-2 text-left align-top font-semibold"
        >
          {renderJsonChildren(node.content, ctx)}
        </th>
      );

    case 'tableCell':
      return (
        <td
          key={key}
          colSpan={Number(node.attrs?.colspan ?? 1) || undefined}
          rowSpan={Number(node.attrs?.rowspan ?? 1) || undefined}
          className="border border-border px-3 py-2 align-top"
        >
          {renderJsonChildren(node.content, ctx)}
        </td>
      );

    default:
      return renderJsonChildren(node.content, ctx) || null;
  }
}

function renderJsonChildren(
  content: JSONContent[] | undefined,
  ctx: RenderCtx
): ReactNode {
  if (!content || content.length === 0) return null;
  const elements = content.map((child, i) => renderJsonNode(child, i, ctx));
  const filtered = elements.filter((el) => el !== null);
  if (filtered.length === 0) return null;
  return <>{filtered}</>;
}

// ---------------------------------------------------------------------------
// Legacy HTML → React fallback (DOMParser, used only for old content)
// ---------------------------------------------------------------------------

function renderLegacyHtml(htmlContent: string, ctx: RenderCtx): ReactNode {
  const doc = new DOMParser().parseFromString(htmlContent, 'text/html');

  const processNode = (node: Node, index: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text.trim()) return null;
      return text;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const key = `${tagName}-${index}`;

    if (tagName === 'figure' && element.getAttribute('data-type') === 'figure-block') {
      const figureData = parseAttrJson<FigureBlockData>(element.getAttribute('data-figure'));
      return figureData ? <FigureBlock key={key} data={figureData} /> : null;
    }

    if (/^h[1-6]$/.test(tagName)) {
      ctx.heading++;
      const text = element.textContent || '';
      const id = `section-${ctx.heading}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
      return (
        <LinkableHeading
          key={key}
          id={id}
          level={tagName as LinkableHeadingLevel}
          textAlign={element.style.textAlign || null}
        >
          {text}
        </LinkableHeading>
      );
    }

    // Math: the stored markup carries only data-latex; KaTeX renders here.
    if (element.getAttribute('data-type') === 'block-math') {
      return <MathBlock key={key} latex={element.getAttribute('data-latex') ?? ''} />;
    }
    if (element.getAttribute('data-type') === 'inline-math') {
      return <MathInline key={key} latex={element.getAttribute('data-latex') ?? ''} />;
    }

    // Footnote marker: number by position, collect the note text.
    if (tagName === 'sup' && element.getAttribute('data-type') === 'footnote') {
      ctx.footnote++;
      ctx.notes.push(element.getAttribute('data-footnote') ?? '');
      return <FootnoteMarker key={key} index={ctx.footnote} />;
    }

    if (tagName === 'blockquote') {
      const variant = element.getAttribute('data-variant') === 'pull' ? 'pull' : undefined;
      return (
        <blockquote key={key} data-variant={variant}>
          {processChildren(element)}
        </blockquote>
      );
    }

    if (tagName === 'div' && element.getAttribute('data-type') === 'callout') {
      return (
        <div key={key} data-type="callout">
          {processChildren(element)}
        </div>
      );
    }

    if (tagName === 'ul') return <ul key={key}>{processChildren(element)}</ul>;
    if (tagName === 'ol') return <ol key={key}>{processChildren(element)}</ol>;
    if (tagName === 'li') return <li key={key}>{processChildren(element)}</li>;

    if (tagName === 'p') {
      const children = processChildren(element);
      if (!children || (Array.isArray(children) && children.every((c) => c === null))) return null;
      const align = element.style.textAlign;
      return (
        <p key={key} style={align && align !== 'left' ? { textAlign: align as 'center' | 'right' | 'justify' } : undefined}>
          {children}
        </p>
      );
    }

    if (tagName === 'strong' || tagName === 'b') return <strong key={key}>{processChildren(element)}</strong>;
    if (tagName === 'em' || tagName === 'i') return <em key={key}>{processChildren(element)}</em>;
    if (tagName === 'code') return <code key={key}>{processChildren(element)}</code>;

    // Inline tags the sanitizer allows and the editor can produce. Without
    // these the fall-through at the bottom returns the children unwrapped, so
    // the words survive and the formatting quietly does not — which is the
    // failure mode this project keeps hitting.
    if (tagName === 's' || tagName === 'strike' || tagName === 'del') return <s key={key}>{processChildren(element)}</s>;
    if (tagName === 'u') return <u key={key}>{processChildren(element)}</u>;
    if (tagName === 'sup') return <sup key={key}>{processChildren(element)}</sup>;
    if (tagName === 'sub') return <sub key={key}>{processChildren(element)}</sub>;
    if (tagName === 'br') return <br key={key} />;

    // Colour / highlight spans: copy exactly the two properties the
    // sanitizer whitelists — a whitelist by construction, like the rest of
    // this renderer.
    if (tagName === 'span') {
      const style: CSSProperties = {};
      if (element.style.color) style.color = element.style.color;
      if (element.style.backgroundColor) style.backgroundColor = element.style.backgroundColor;
      const children = processChildren(element);
      if (style.color || style.backgroundColor) {
        return <span key={key} style={style}>{children}</span>;
      }
      return children;
    }

    if (tagName === 'a') {
      const href = element.getAttribute('href') || '';

      // A link card stored as HTML must come back as a card, not as a bare
      // link — otherwise the block degrades every time content round-trips
      // through the `content` column.
      if (element.getAttribute('data-type') === 'link-card') {
        const stored = parseAttrJson<Partial<{ url: string; title: string; description: string }>>(
          element.getAttribute('data-link-card'),
        );
        const data = stored
          ? { url: href, title: '', description: '', ...stored }
          : { url: href, title: element.textContent ?? '', description: '' };
        return data.url ? <LinkCardBlock key={key} data={data} /> : null;
      }

      const isExternal = href.startsWith('http');
      return (
        <a key={key} href={href}
          className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
        >
          {processChildren(element)}
        </a>
      );
    }

    if (tagName === 'hr') return <hr key={key} />;
    if (tagName === 'pre') return <pre key={key}>{processChildren(element)}</pre>;

    // A bare <img> in a legacy body previously fell through to processChildren,
    // which returns null for a void element — the image rendered as nothing.
    if (tagName === 'img') {
      const src = element.getAttribute('src');
      if (!src) return null;
      return (
        <img
          key={key}
          src={src}
          alt={element.getAttribute('alt') || ''}
          loading="lazy"
          className="w-full h-auto rounded-md my-8"
        />
      );
    }

    if (tagName === 'table') {
      return (
        <div key={key} className="my-8 -mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
          <table className="w-full border-collapse text-sm [&_p]:mb-0">
            {processChildren(element)}
          </table>
        </div>
      );
    }
    if (tagName === 'thead') return <thead key={key}>{processChildren(element)}</thead>;
    if (tagName === 'tbody') return <tbody key={key}>{processChildren(element)}</tbody>;
    if (tagName === 'tr') {
      return (
        <tr key={key} className="border-b border-border last:border-b-0">
          {processChildren(element)}
        </tr>
      );
    }
    if (tagName === 'th' || tagName === 'td') {
      const Cell = tagName === 'th' ? 'th' : 'td';
      const span = (name: string) => {
        const value = Number(element.getAttribute(name) ?? 1);
        return Number.isFinite(value) && value > 1 ? value : undefined;
      };
      return (
        <Cell
          key={key}
          colSpan={span('colspan')}
          rowSpan={span('rowspan')}
          className={cn(
            'border border-border px-3 py-2 align-top',
            tagName === 'th' && 'bg-muted/50 text-left font-semibold',
          )}
        >
          {processChildren(element)}
        </Cell>
      );
    }

    return processChildren(element);
  };

  const processChildren = (element: HTMLElement): ReactNode => {
    const children: ReactNode[] = [];
    element.childNodes.forEach((child, i) => {
      const result = processNode(child, i);
      if (result !== null) children.push(result);
    });
    return children.length === 0 ? null : children.length === 1 ? children[0] : children;
  };

  return processChildren(doc.body);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ArticleBody({ content, fontSizeClass, className }: ArticleBodyProps) {
  const rendered = useMemo(() => {
    if (!content) return null;

    const ctx: RenderCtx = { heading: 0, footnote: 0, notes: [] };

    // Prefer direct JSON rendering (no DOMParser, no HTML intermediate)
    const json = parseTiptapJson(content);
    if (json) {
      return { body: renderJsonNode(json, 0, ctx), notes: ctx.notes };
    }

    // Fallback: legacy HTML content uses DOMParser
    if (isLegacyHtmlContent(content)) {
      return { body: renderLegacyHtml(content, ctx), notes: ctx.notes };
    }

    return null;
  }, [content]);

  if (!rendered) {
    return <article className={cn('prose-editorial', fontSizeClass, className)} />;
  }

  return (
    <article className={cn('prose-editorial', fontSizeClass, className)}>
      {rendered.body}
      <FootnotesSection notes={rendered.notes} />
    </article>
  );
}
