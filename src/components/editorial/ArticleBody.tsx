import { ReactNode, useMemo } from 'react';
import { LinkableHeading } from './LinkableHeading';
import { FigureBlock, FigureBlockData } from './FigureBlock';
import { cn } from '@/lib/utils';
import { contentToHtml } from '@/lib/tiptap/serialize';

interface ArticleBodyProps {
  content: string;
  fontSizeClass?: string;
  className?: string;
}

// Parse HTML content with FigureBlocks to React nodes
export function ArticleBody({ content, fontSizeClass, className }: ArticleBodyProps) {
  const parsedContent = useMemo(() => {
    if (!content) return null;

    // Convert TipTap JSON to HTML if needed, then parse
    const htmlContent = contentToHtml(content);
    if (!htmlContent) return null;

    // Parse HTML content using DOM parser for accurate handling
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

      // Handle figure blocks
      if (tagName === 'figure' && element.getAttribute('data-type') === 'figure-block') {
        const dataFigure = element.getAttribute('data-figure');
        if (dataFigure) {
          try {
            const figureData = JSON.parse(
              dataFigure
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
            ) as FigureBlockData;
            return <FigureBlock key={key} data={figureData} />;
          } catch {
            // Skip malformed figure
          }
        }
        return null;
      }

      // Handle headings
      if (tagName === 'h2') {
        headingCounter++;
        const text = element.textContent || '';
        const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
        return (
          <LinkableHeading key={key} id={id} level="h2">
            {text}
          </LinkableHeading>
        );
      }

      if (tagName === 'h3') {
        headingCounter++;
        const text = element.textContent || '';
        const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
        return (
          <LinkableHeading key={key} id={id} level="h3">
            {text}
          </LinkableHeading>
        );
      }

      // Handle blockquotes
      if (tagName === 'blockquote') {
        return (
          <blockquote
            key={key}
            className="border-l-4 border-primary pl-6 py-2 my-8 italic text-xl text-muted-foreground"
          >
            {processChildren(element)}
          </blockquote>
        );
      }

      // Handle lists
      if (tagName === 'ul') {
        return (
          <ul key={key} className="list-disc list-outside ml-6 space-y-2 my-6">
            {processChildren(element)}
          </ul>
        );
      }

      if (tagName === 'ol') {
        return (
          <ol key={key} className="list-decimal list-outside ml-6 space-y-2 my-6">
            {processChildren(element)}
          </ol>
        );
      }

      if (tagName === 'li') {
        return (
          <li key={key} className="text-muted-foreground">
            {processChildren(element)}
          </li>
        );
      }

      // Handle paragraphs
      if (tagName === 'p') {
        const children = processChildren(element);
        if (!children || (Array.isArray(children) && children.every(c => c === null))) {
          return null;
        }
        return (
          <p key={key} className="text-muted-foreground mb-6">
            {children}
          </p>
        );
      }

      // Handle inline elements
      if (tagName === 'strong' || tagName === 'b') {
        return (
          <strong key={key} className="text-foreground font-semibold">
            {processChildren(element)}
          </strong>
        );
      }

      if (tagName === 'em' || tagName === 'i') {
        return <em key={key}>{processChildren(element)}</em>;
      }

      if (tagName === 'code') {
        return (
          <code key={key} className="bg-muted px-1 py-0.5 rounded text-sm">
            {processChildren(element)}
          </code>
        );
      }

      if (tagName === 'a') {
        const href = element.getAttribute('href') || '';
        const isExternal = href.startsWith('http');
        return (
          <a
            key={key}
            href={href}
            className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
          >
            {processChildren(element)}
          </a>
        );
      }

      if (tagName === 'hr') {
        return <hr key={key} className="border-border my-8" />;
      }

      // Fallback: process children for unknown elements
      return processChildren(element);
    };

    const processChildren = (element: HTMLElement): ReactNode => {
      const children: ReactNode[] = [];
      element.childNodes.forEach((child, i) => {
        const result = processNode(child, i);
        if (result !== null) {
          children.push(result);
        }
      });
      return children.length === 0 ? null : children.length === 1 ? children[0] : children;
    };

    const children = processChildren(doc.body);
    return children;
  }, [content]);

  return (
    <article className={cn("prose-editorial", fontSizeClass, className)}>
      {parsedContent}
    </article>
  );
}
