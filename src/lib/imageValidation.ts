import { ImageBlockData, parseImageBlock } from '@/components/editorial/ImageBlock';

export interface ImageValidationResult {
  images: ImageBlockData[];
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

const MAX_IMAGES = 8;

/**
 * Extract and validate images from essay content
 */
export function validateImages(
  content: string,
  section: 'next-big-thing' | 'green-transition'
): ImageValidationResult {
  const images: ImageBlockData[] = [];
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];

  // Parse content to find image blocks
  // Match image markdown pattern: ![alt](src){attrs}
  const imageRegex = /!\[[^\]]*\]\([^)]+\)(?:\{[^}]*\})?/g;
  const matches = content.match(imageRegex) || [];

  matches.forEach((match, index) => {
    const imageData = parseImageBlock(match);
    if (imageData) {
      images.push(imageData);

      // Check alt text
      if (!imageData.alt || !imageData.alt.trim()) {
        errors.push({
          field: `image_${index + 1}`,
          message: `Image ${index + 1}: Missing alt text`,
        });
      }

      // Check source for Green Transition (but allow empty if intentional)
      if (section === 'green-transition' && !imageData.sourceName) {
        // Only warn, since user might explicitly mark "no source"
        // The hard block is handled by checking for {noSource="true"} attribute
        if (!match.includes('noSource="true"')) {
          errors.push({
            field: `image_${index + 1}`,
            message: `Image ${index + 1}: Missing source attribution (Green Transition requirement)`,
          });
        }
      }

      // Warn for Next Big Thing without source
      if (section === 'next-big-thing' && !imageData.sourceName) {
        warnings.push({
          field: `image_${index + 1}`,
          message: `Image ${index + 1}: Consider adding source attribution`,
        });
      }
    }
  });

  // Warn if too many images
  if (images.length > MAX_IMAGES) {
    warnings.push({
      field: 'images',
      message: `${images.length} images may make the essay harder to read. Consider using fewer images.`,
    });
  }

  return { images, errors, warnings };
}

/**
 * Count images in content
 */
export function countImages(content: string): number {
  const imageRegex = /!\[[^\]]*\]\([^)]+\)(?:\{[^}]*\})?/g;
  const matches = content.match(imageRegex) || [];
  return matches.length;
}
