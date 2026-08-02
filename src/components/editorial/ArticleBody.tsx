/**
 * ArticleBody — Renders essay content as React elements.
 *
 * Supports two paths:
 *   1. TipTap JSON → direct React rendering (preferred, no DOM parsing).
 *   2. Legacy HTML  → DOMParser fallback for old content only.
 *
 * The direct JSON renderer avoids the JSON→HTML→DOMParser→React round-trip.
 */

import { ReactNode, useMemo } from 'react';
import { LinkableHeading } from './LinkableHeading';
import { FigureBlock, FigureBlockData } from './FigureBlock';
import { LinkCardBlock } from './LinkCardBlock';
import { cn } from '@/lib/utils';
import { parseTiptapJson, isLegacyHtmlContent } from '@/lib/tiptap/serialize';
import { parseAttrJson } from '@/lib/tiptap/attrJson';
import type { JSONContent } from '@tiptap/core';

interface ArticleBodyProps {
  content: string;
  fontSizeClass?: string;
  className?: string;
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
        node = <strong key={mkey} className="text-foreground font-semibold">{node}</strong>;
        break;
      case 'italic':
        node = <em key={mkey}>{node}</em>;
        break;
      case 'strike':
        node = <s key={mkey}>{node}</s>;
        break;
      case 'code':
        node = <code key={mkey} className="bg-muted px-1 py-0.5 rounded text-sm">{node}</code>;
        break;
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

function renderJsonNode(
  node: JSONContent,
  index: number,
  headingCounter: { value: number }
): ReactNode {
  if (!node) return null;
  const key = `${node.type || 'unknown'}-${index}`;

  switch (node.type) {
    case 'doc':
      return <>{renderJsonChildren(node.content, headingCounter)}</>;

    case 'text':
      return renderMarksToReact(
        node.text ?? '',
        node.marks as Array<{ type: string; attrs?: Record<string, unknown> }>,
        key
      );

    case 'paragraph': {
      const children = renderJsonChildren(node.content, headingCounter);
      if (!children) return null;
      return (
        <p key={key} className="text-muted-foreground mb-6">
          {children}
        </p>
      );
    }

    case 'heading': {
      const level = (node.attrs?.level ?? 2) as 2 | 3;
      const text = extractPlainText(node);
      headingCounter.value++;
      const id = `section-${headingCounter.value}-${text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50)}`;
      return (
        <LinkableHeading key={key} id={id} level={`h${level}`}>
          {text}
        </LinkableHeading>
      );
    }

    case 'bulletList':
      return (
        <ul key={key} className="list-disc list-outside ml-6 space-y-2 my-6">
          {renderJsonChildren(node.content, headingCounter)}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={key} className="list-decimal list-outside ml-6 space-y-2 my-6">
          {renderJsonChildren(node.content, headingCounter)}
        </ol>
      );

    case 'listItem':
      return (
        <li key={key} className="text-muted-foreground">
          {renderJsonChildren(node.content, headingCounter)}
        </li>
      );

    case 'blockquote':
      return (
        <blockquote
          key={key}
          className="border-l-4 border-primary pl-6 py-2 my-8 italic text-xl text-muted-foreground"
        >
          {renderJsonChildren(node.content, headingCounter)}
        </blockquote>
      );

    case 'codeBlock':
      return (
        <pre key={key} className="bg-muted rounded-md p-4 overflow-x-auto my-6 text-sm">
          <code>{extractPlainText(node)}</code>
        </pre>
      );

    case 'horizontalRule':
      return <hr key={key} className="border-border my-8" />;

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
          {/* Cell content is paragraphs; the body's 1.5rem paragraph margin
              would otherwise pad out every cell. */}
          <table className="w-full border-collapse text-sm [&_p]:mb-0">
            <tbody>{renderJsonChildren(node.content, headingCounter)}</tbody>
          </table>
        </div>
      );

    case 'tableRow':
      return (
        <tr key={key} className="border-b border-border last:border-b-0">
          {renderJsonChildren(node.content, headingCounter)}
        </tr>
      );

    case 'tableHeader':
      return (
        <th
          key={key}
          colSpan={Number(node.attrs?.colspan ?? 1) || undefined}
          rowSpan={Number(node.attrs?.rowspan ?? 1) || undefined}
          className="border border-border bg-muted/50 px-3 py-2 text-left align-top font-semibold text-foreground"
        >
          {renderJsonChildren(node.content, headingCounter)}
        </th>
      );

    case 'tableCell':
      return (
        <td
          key={key}
          colSpan={Number(node.attrs?.colspan ?? 1) || undefined}
          rowSpan={Number(node.attrs?.rowspan ?? 1) || undefined}
          className="border border-border px-3 py-2 align-top text-muted-foreground"
        >
          {renderJsonChildren(node.content, headingCounter)}
        </td>
      );

    default:
      return renderJsonChildren(node.content, headingCounter) || null;
  }
}

function renderJsonChildren(
  content: JSONContent[] | undefined,
  headingCounter: { value: number }
): ReactNode {
  if (!content || content.length === 0) return null;
  const elements = content.map((child, i) => renderJsonNode(child, i, headingCounter));
  const filtered = elements.filter((el) => el !== null);
  if (filtered.length === 0) return null;
  return <>{filtered}</>;
}

// ---------------------------------------------------------------------------
// Legacy HTML → React fallback (DOMParser, used only for old content)
// ---------------------------------------------------------------------------

function renderLegacyHtml(htmlContent: string): ReactNode {
  const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
  let headingCounter = 0;

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

    if (tagName === 'h2' || tagName === 'h3') {
      headingCounter++;
      const text = element.textContent || '';
      const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
      return (
        <LinkableHeading key={key} id={id} level={tagName as 'h2' | 'h3'}>
          {text}
        </LinkableHeading>
      );
    }

    if (tagName === 'blockquote') {
      return (
        <blockquote key={key} className="border-l-4 border-primary pl-6 py-2 my-8 italic text-xl text-muted-foreground">
          {processChildren(element)}
        </blockquote>
      );
    }

    if (tagName === 'ul') return <ul key={key} className="list-disc list-outside ml-6 space-y-2 my-6">{processChildren(element)}</ul>;
    if (tagName === 'ol') return <ol key={key} className="list-decimal list-outside ml-6 space-y-2 my-6">{processChildren(element)}</ol>;
    if (tagName === 'li') return <li key={key} className="text-muted-foreground">{processChildren(element)}</li>;

    if (tagName === 'p') {
      const children = processChildren(element);
      if (!children || (Array.isArray(children) && children.every((c) => c === null))) return null;
      return <p key={key} className="text-muted-foreground mb-6">{children}</p>;
    }

    if (tagName === 'strong' || tagName === 'b') return <strong key={key} className="text-foreground font-semibold">{processChildren(element)}</strong>;
    if (tagName === 'em' || tagName === 'i') return <em key={key}>{processChildren(element)}</em>;
    if (tagName === 'code') return <code key={key} className="bg-muted px-1 py-0.5 rounded text-sm">{processChildren(element)}</code>;

    // Inline tags the sanitizer allows and the editor can produce. Without
    // these the fall-through at the bottom returns the children unwrapped, so
    // the words survive and the formatting quietly does not — which is the
    // failure mode this project keeps hitting. Strikethrough is one of the
    // eight actions in the bubble menu; it was reaching the database and
    // disappearing on the way to the reader.
    if (tagName === 's' || tagName === 'strike' || tagName === 'del') return <s key={key}>{processChildren(element)}</s>;
    if (tagName === 'u') return <u key={key}>{processChildren(element)}</u>;
    if (tagName === 'sup') return <sup key={key}>{processChildren(element)}</sup>;
    if (tagName === 'sub') return <sub key={key}>{processChildren(element)}</sub>;
    if (tagName === 'br') return <br key={key} />;

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

    if (tagName === 'hr') return <hr key={key} className="border-border my-8" />;
    if (tagName === 'pre') return <pre key={key} className="bg-muted rounded-md p-4 overflow-x-auto my-6 text-sm">{processChildren(element)}</pre>;

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
            tagName === 'th'
              ? 'bg-muted/50 text-left font-semibold text-foreground'
              : 'text-muted-foreground',
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
  const parsedContent = useMemo(() => {
    if (!content) return null;

    // Prefer direct JSON rendering (no DOMParser, no HTML intermediate)
    const json = parseTiptapJson(content);
    if (json) {
      const headingCounter = { value: 0 };
      return renderJsonNode(json, 0, headingCounter);
    }

    // Fallback: legacy HTML content uses DOMParser
    if (isLegacyHtmlContent(content)) {
      return renderLegacyHtml(content);
    }

    return null;
  }, [content]);

  return (
    <article className={cn('prose-editorial', fontSizeClass, className)}>
      {parsedContent}
    </article>
  );
}
