import { FigureBlockData } from '@/components/editorial/FigureBlock';

export interface FigureValidationResult {
  figures: FigureBlockData[];
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

const MAX_FIGURES = 8;

/**
 * Extract and validate figures from essay content (JSON format)
 * Content is stored as HTML with embedded figure blocks as custom elements
 */
export function validateFigures(
  figures: FigureBlockData[],
  section: 'next-big-thing' | 'green-transition'
): FigureValidationResult {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];

  figures.forEach((figure, index) => {
    const figureNum = index + 1;

    // Check alt text (required)
    if (!figure.altText || !figure.altText.trim()) {
      errors.push({
        field: `figure_${figureNum}`,
        message: `Figure ${figureNum}: Missing alt text`,
      });
    }

    // Check source for Green Transition
    if (section === 'green-transition') {
      if (!figure.noSource && (!figure.sourceName || !figure.sourceName.trim())) {
        errors.push({
          field: `figure_${figureNum}`,
          message: `Figure ${figureNum}: Missing source (required for Green Transition)`,
        });
      }
    }

    // Warn for Next Big Thing without source
    if (section === 'next-big-thing' && !figure.noSource && !figure.sourceName) {
      warnings.push({
        field: `figure_${figureNum}`,
        message: `Figure ${figureNum}: Consider adding source attribution`,
      });
    }

    // Check aspect ratio
    if (figure.aspectRatio && figure.aspectRatio > 2) {
      warnings.push({
        field: `figure_${figureNum}`,
        message: `Figure ${figureNum}: Very tall image may hurt reading flow`,
      });
    }
  });

  // Warn if too many figures
  if (figures.length > MAX_FIGURES) {
    warnings.push({
      field: 'figures',
      message: `${figures.length} figures may overwhelm the essay. Consider using fewer.`,
    });
  }

  return { figures, errors, warnings };
}

/**
 * Extract FigureBlockData from HTML content
 * Looks for <figure data-figure="..."> elements
 */
export function extractFiguresFromContent(htmlContent: string): FigureBlockData[] {
  const figures: FigureBlockData[] = [];
  
  // Match figure elements with data-figure attribute
  const figureRegex = /<figure[^>]*data-figure="([^"]*)"[^>]*>/g;
  let match;
  
  while ((match = figureRegex.exec(htmlContent)) !== null) {
    try {
      // Decode HTML entities and parse JSON
      const jsonStr = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      const data = JSON.parse(jsonStr) as FigureBlockData;
      if (data.src && data.altText) {
        figures.push(data);
      }
    } catch {
      // Skip malformed figure data
    }
  }
  
  return figures;
}

/**
 * Count figures in content
 */
export function countFigures(htmlContent: string): number {
  return extractFiguresFromContent(htmlContent).length;
}
