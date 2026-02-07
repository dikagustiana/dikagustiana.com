import { ReactNode, useMemo } from 'react';
import { LinkableHeading } from './LinkableHeading';
import { cn } from '@/lib/utils';

interface ArticleBodyProps {
  content: string;
  fontSizeClass?: string;
  className?: string;
}

// Parse markdown-like content to React nodes with linkable headings
export function ArticleBody({ content, fontSizeClass, className }: ArticleBodyProps) {
  const parsedContent = useMemo(() => {
    if (!content) return null;
    
    const paragraphs = content.split('\n\n');
    let headingCounter = 0;
    
    return paragraphs.map((paragraph, idx) => {
      // H2 headings
      if (paragraph.startsWith('## ')) {
        headingCounter++;
        const text = paragraph.replace('## ', '').trim();
        const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
        return (
          <LinkableHeading key={idx} id={id} level="h2">
            {text}
          </LinkableHeading>
        );
      }
      
      // H3 headings
      if (paragraph.startsWith('### ')) {
        headingCounter++;
        const text = paragraph.replace('### ', '').trim();
        const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
        return (
          <LinkableHeading key={idx} id={id} level="h3">
            {text}
          </LinkableHeading>
        );
      }
      
      // Blockquotes
      if (paragraph.startsWith('> ')) {
        const quoteText = paragraph.replace(/^> ?/gm, '');
        return (
          <blockquote 
            key={idx} 
            className="border-l-4 border-primary pl-6 py-2 my-8 italic text-xl text-muted-foreground"
          >
            {quoteText}
          </blockquote>
        );
      }
      
      // Unordered lists
      if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
        const items = paragraph.split('\n').filter(line => line.startsWith('- '));
        return (
          <ul key={idx} className="list-disc list-outside ml-6 space-y-2 my-6">
            {items.map((item, i) => (
              <li key={i} className="text-muted-foreground">
                {parseBoldText(item.replace('- ', ''))}
              </li>
            ))}
          </ul>
        );
      }
      
      // Ordered lists
      if (paragraph.includes('\n1. ') || paragraph.startsWith('1. ')) {
        const items = paragraph.split('\n').filter(line => /^\d+\. /.test(line));
        return (
          <ol key={idx} className="list-decimal list-outside ml-6 space-y-2 my-6">
            {items.map((item, i) => (
              <li key={i} className="text-muted-foreground">
                {parseBoldText(item.replace(/^\d+\. /, ''))}
              </li>
            ))}
          </ol>
        );
      }
      
      // Regular paragraph
      return (
        <p key={idx} className="text-muted-foreground mb-6">
          {parseBoldText(paragraph)}
        </p>
      );
    });
  }, [content]);

  return (
    <article className={cn("prose-editorial", fontSizeClass, className)}>
      {parsedContent}
    </article>
  );
}

// Helper to parse **bold** text
function parseBoldText(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-foreground font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Parse links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const linkedParts: ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = linkRegex.exec(part)) !== null) {
      if (match.index > lastIndex) {
        linkedParts.push(part.slice(lastIndex, match.index));
      }
      linkedParts.push(
        <a 
          key={`link-${i}-${match.index}`}
          href={match[2]}
          className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
          target={match[2].startsWith('http') ? '_blank' : undefined}
          rel={match[2].startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    
    if (linkedParts.length > 0) {
      if (lastIndex < part.length) {
        linkedParts.push(part.slice(lastIndex));
      }
      return <span key={i}>{linkedParts}</span>;
    }
    
    return part;
  });
}
