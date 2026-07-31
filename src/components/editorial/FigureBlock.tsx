import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff, ZoomIn, X } from 'lucide-react';
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export interface FigureBlockData {
  src: string;
  altText: string;
  caption?: string;
  sourceName?: string;
  sourceUrl?: string;
  noSource?: boolean;
  widthMode?: 'content' | 'wide';
  kind?: 'image' | 'graph';
  naturalWidth?: number;
  naturalHeight?: number;
  aspectRatio?: number;
}

interface FigureBlockProps {
  data: FigureBlockData;
  className?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function FigureBlock({ data, className, isEditing, onEdit, onDelete }: FigureBlockProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const {
    src,
    altText,
    caption,
    sourceName,
    sourceUrl,
    widthMode = 'content',
    kind = 'image',
    naturalWidth,
    naturalHeight,
    aspectRatio: providedAspectRatio,
  } = data;

  const isWide = widthMode === 'wide';
  const isGraph = kind === 'graph';

  // Calculate aspect ratio for placeholder
  const aspectRatio = providedAspectRatio || 
    (naturalWidth && naturalHeight ? naturalHeight / naturalWidth : undefined);

  return (
    <>
      <figure
        className={cn(
          'my-8 group',
          isWide && '-mx-4 sm:-mx-8 lg:-mx-16',
          isEditing && 'cursor-pointer hover:ring-2 hover:ring-primary/50 rounded-lg',
          className
        )}
        onClick={isEditing ? onEdit : undefined}
      >
        <div
          className={cn(
            'relative bg-muted rounded-lg overflow-hidden',
            isWide ? 'rounded-none sm:rounded-lg' : ''
          )}
          style={aspectRatio ? { aspectRatio: `1 / ${aspectRatio}` } : undefined}
        >
          {/* Loading placeholder */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 animate-pulse bg-muted" />
          )}

          {hasError ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-muted-foreground">
              <ImageOff className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm text-center">Image failed to load</p>
              {altText && <p className="text-xs mt-1 opacity-75">{altText}</p>}
            </div>
          ) : (
            <>
              <img
                src={src}
                alt={altText}
                loading="lazy"
                width={naturalWidth}
                height={naturalHeight}
                onLoad={(e) => {
                  setIsLoaded(true);
                  // Store dimensions if not already set
                  if (!naturalWidth || !naturalHeight) {
                    const img = e.currentTarget;
                    // Could emit these dimensions back if needed
                  }
                }}
                onError={() => setHasError(true)}
                className={cn(
                  'w-full h-auto transition-opacity duration-300',
                  isLoaded ? 'opacity-100' : 'opacity-0'
                )}
              />
              
              {/* Tap to zoom overlay for graphs */}
              {isGraph && !isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity"
                  aria-label="Enlarge graph"
                >
                  <span className="flex items-center gap-2 bg-background/90 text-foreground px-3 py-2 rounded-md text-sm font-medium">
                    <ZoomIn className="h-4 w-4" />
                    Click to enlarge
                  </span>
                </button>
              )}
            </>
          )}

          {/* Edit/Delete controls when editing */}
          {isEditing && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete figure"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Caption and source */}
        {(caption || sourceName) && (
          <figcaption
            className={cn(
              'mt-3 text-sm text-muted-foreground',
              isWide ? 'px-4 sm:px-8 lg:px-16' : ''
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
                    onClick={(e) => e.stopPropagation()}
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

      {/* Lightbox for graphs */}
      {isGraph && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-background/95 backdrop-blur-sm">
            <DialogTitle className="sr-only">{altText || 'Enlarged figure'}</DialogTitle>
            <DialogDescription className="sr-only">
              {caption || 'Enlarged view of the figure.'}
            </DialogDescription>
            <DialogClose className="absolute top-4 right-4 z-10 p-2 bg-background rounded-full shadow-lg">
              <X className="h-5 w-5" />
            </DialogClose>
            <div className="flex items-center justify-center p-4 overflow-auto">
              <img
                src={src}
                alt={altText}
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
            {caption && (
              <p className="text-center text-sm text-muted-foreground pb-4 px-4">
                {caption}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Serialize FigureBlockData to JSON string for storage
export function serializeFigureBlock(data: FigureBlockData): string {
  return JSON.stringify(data);
}

// Parse JSON string to FigureBlockData
export function parseFigureBlock(json: string): FigureBlockData | null {
  try {
    const data = JSON.parse(json);
    if (data && typeof data.src === 'string' && typeof data.altText === 'string') {
      return data as FigureBlockData;
    }
    return null;
  } catch {
    return null;
  }
}
