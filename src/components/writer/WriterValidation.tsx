import { CheckCircle, XCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { validateFigures, extractFiguresFromContent } from '@/lib/figureValidation';

export interface ValidationResult {
  canPublish: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  figureCount: number;
}

interface ValidateParams {
  title: string;
  deck: string;
  keyTakeaways: string[];
  wordCount: number;
  references: { label: string; url?: string }[];
  section: string;
  content: string;
  categoryId?: string;
  /** Curriculum lesson type; undefined/null for editorial essays. */
  lessonType?: string | null;
}

/**
 * Key-takeaways policy, per docs/DECISIONS.md (2026-08-01):
 * scope per lesson_type rather than relax globally.
 *
 *  - Essay-shaped types (`concept`, `framework`) — and every editorial essay,
 *    which is essay-shaped by definition — REQUIRE three. The block is part of
 *    the article furniture and the forcing function is worth keeping.
 *  - Artefact-shaped types (`case-study`, `exercise`, `model-walkthrough`)
 *    get an ADVISORY warning instead: their takeaway is the worked artefact,
 *    and forcing three onto them manufactures filler.
 *  - All-or-nothing within every type: one or two takeaways is an error
 *    everywhere, because a half-filled standing block is the real failure
 *    mode — worse than no block at all.
 */
const TAKEAWAYS_ADVISORY_LESSON_TYPES = new Set(['case-study', 'exercise', 'model-walkthrough']);

const MIN_WORD_COUNT = 500;

export function validateEssay({
  title,
  deck,
  keyTakeaways,
  wordCount,
  references,
  section,
  content,
  categoryId,
  lessonType,
}: ValidateParams): ValidationResult {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];

  // Required: Title
  if (!title.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  // Required: Category
  if (!categoryId) {
    errors.push({ field: 'categoryId', message: 'Category is required' });
  }

  // Required: Deck line
  if (!deck.trim()) {
    errors.push({ field: 'deck', message: 'Deck line (thesis) is required' });
  }

  // Key takeaways — scoped per lesson_type (policy above). Fail-closed:
  // a null, empty, or UNKNOWN lesson type stays strict — only the three
  // explicitly artefact-shaped types relax to advisory.
  const filledTakeaways = keyTakeaways.filter(k => k.trim()).length;
  const takeawaysAdvisory = !!lessonType && TAKEAWAYS_ADVISORY_LESSON_TYPES.has(lessonType);
  if (filledTakeaways > 0 && filledTakeaways < 3) {
    // Half-filled is an error under EVERY type.
    errors.push({
      field: 'keyTakeaways',
      message: `Key takeaways are all-or-nothing: add ${3 - filledTakeaways} more or clear them (${filledTakeaways}/3)`,
    });
  } else if (filledTakeaways === 0) {
    if (takeawaysAdvisory) {
      warnings.push({
        field: 'keyTakeaways',
        message: `No key takeaways. Optional for a ${lessonType}, but three sharpen the landing.`,
      });
    } else {
      errors.push({
        field: 'keyTakeaways',
        message: 'At least 3 key takeaways required (0/3)',
      });
    }
  }

  // Required: Minimum word count
  if (wordCount < MIN_WORD_COUNT) {
    errors.push({ 
      field: 'content', 
      message: `Body must be at least ${MIN_WORD_COUNT} words (${wordCount}/${MIN_WORD_COUNT})` 
    });
  }

  // Validate figures (FigureBlock)
  const sectionType = section === 'green-transition' ? 'green-transition' : 'next-big-thing';
  const figures = extractFiguresFromContent(content || '');
  const figureValidation = validateFigures(figures, sectionType);
  errors.push(...figureValidation.errors);
  warnings.push(...figureValidation.warnings);

  // Warning: No references on Green Transition posts
  if (section === 'green-transition' && references.length === 0) {
    warnings.push({ 
      field: 'references', 
      message: 'Green Transition posts should include references' 
    });
  }

  return {
    canPublish: errors.length === 0,
    errors,
    warnings,
    figureCount: figures.length,
  };
}

interface WriterValidationProps {
  validation: ValidationResult;
}

export function WriterValidation({ validation }: WriterValidationProps) {
  const { canPublish, errors, warnings, figureCount } = validation;

  return (
    <Card className={cn(
      "border-2",
      canPublish ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {canPublish ? (
            <>
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-primary">Ready to Publish</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">Cannot Publish</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.map((error, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-destructive">{error.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-amber-700">{warning.message} (optional)</span>
              </div>
            ))}
          </div>
        )}

        {/* Success indicators when no errors */}
        {canPublish && errors.length === 0 && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Title present</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Deck line present</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              {/* "3+" would be a lie for an artefact-shaped lesson publishing
                  with none — the scoped rule is what actually passed. */}
              <span>Key takeaways rule satisfied</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>500+ words</span>
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span>{figureCount} figure{figureCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
