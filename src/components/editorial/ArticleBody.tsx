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
import { cn } from '@/lib/utils';
import { parseTiptapJson, isLegacyHtmlContent } from '@/lib/tiptap/serialize';
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
      const dataFigure = element.getAttribute('data-figure');
      if (dataFigure) {
        try {
          const figureData = JSON.parse(
            dataFigure.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          ) as FigureBlockData;
          return <FigureBlock key={key} data={figureData} />;
        } catch {
          return null;
        }
      }
      return null;
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

    if (tagName === 'a') {
      const href = element.getAttribute('href') || '';
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
