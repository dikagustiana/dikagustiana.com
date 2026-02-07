import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

export interface ImageBlockData {
  src: string;
  alt: string;
  caption?: string;
  sourceName?: string;
  sourceUrl?: string;
  widthMode?: 'content' | 'full';
}

interface ImageBlockProps {
  data: ImageBlockData;
  className?: string;
}

export function ImageBlock({ data, className }: ImageBlockProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const { src, alt, caption, sourceName, sourceUrl, widthMode = 'content' } = data;

  const isFullWidth = widthMode === 'full';

  return (
    <figure
      className={cn(
        'my-8',
        isFullWidth && '-mx-4 sm:-mx-8 lg:-mx-16',
        className
      )}
    >
      <div
        className={cn(
          'relative bg-muted rounded-lg overflow-hidden',
          isFullWidth ? 'rounded-none sm:rounded-lg' : ''
        )}
      >
        {/* Placeholder/skeleton while loading */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}

        {hasError ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-muted-foreground">
            <ImageOff className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm text-center">Image failed to load</p>
            {alt && <p className="text-xs mt-1 opacity-75">{alt}</p>}
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={cn(
              'w-full h-auto transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
      </div>

      {/* Caption and source */}
      {(caption || sourceName) && (
        <figcaption
          className={cn(
            'mt-3 text-sm text-muted-foreground',
            isFullWidth ? 'px-4 sm:px-8 lg:px-16' : ''
          )}
        >
          {caption && <span>{caption}</span>}
          {caption && sourceName && <span className="mx-1">—</span>}
          {sourceName && (
            <span className="italic">
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                >
                  {sourceName}
                </a>
              ) : (
                sourceName
              )}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

// Parse image blocks from content string
// Format: ![alt](src){caption="...",source="...",sourceUrl="...",width="full"}
export function parseImageBlock(markdown: string): ImageBlockData | null {
  // Match: ![alt](src) optionally followed by {attributes}
  const imageRegex = /^!\[([^\]]*)\]\(([^)]+)\)(?:\{([^}]*)\})?$/;
  const match = markdown.trim().match(imageRegex);

  if (!match) return null;

  const [, alt, src, attrs] = match;
  const data: ImageBlockData = { src, alt };

  if (attrs) {
    // Parse attributes like caption="...",source="..."
    const captionMatch = attrs.match(/caption="([^"]*)"/);
    const sourceMatch = attrs.match(/source="([^"]*)"/);
    const sourceUrlMatch = attrs.match(/sourceUrl="([^"]*)"/);
    const widthMatch = attrs.match(/width="([^"]*)"/);

    if (captionMatch) data.caption = captionMatch[1];
    if (sourceMatch) data.sourceName = sourceMatch[1];
    if (sourceUrlMatch) data.sourceUrl = sourceUrlMatch[1];
    if (widthMatch && widthMatch[1] === 'full') data.widthMode = 'full';
  }

  return data;
}

// Serialize ImageBlockData back to markdown format
export function serializeImageBlock(data: ImageBlockData): string {
  let result = `![${data.alt}](${data.src})`;

  const attrs: string[] = [];
  if (data.caption) attrs.push(`caption="${data.caption}"`);
  if (data.sourceName) attrs.push(`source="${data.sourceName}"`);
  if (data.sourceUrl) attrs.push(`sourceUrl="${data.sourceUrl}"`);
  if (data.widthMode === 'full') attrs.push(`width="full"`);

  if (attrs.length > 0) {
    result += `{${attrs.join(',')}}`;
  }

  return result;
}
