import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ValidationResult {
  canPublish: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

interface ValidateParams {
  title: string;
  deck: string;
  keyTakeaways: string[];
  wordCount: number;
  references: { label: string; url?: string }[];
  section: string;
}

const MIN_WORD_COUNT = 500;
const MAX_TAGS = 7;

export function validateEssay({
  title,
  deck,
  keyTakeaways,
  wordCount,
  references,
  section,
}: ValidateParams): ValidationResult {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];

  // Required: Title
  if (!title.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  // Required: Deck line
  if (!deck.trim()) {
    errors.push({ field: 'deck', message: 'Deck line (thesis) is required' });
  }

  // Required: At least 3 key takeaways
  const filledTakeaways = keyTakeaways.filter(k => k.trim()).length;
  if (filledTakeaways < 3) {
    errors.push({ 
      field: 'keyTakeaways', 
      message: `At least 3 key takeaways required (${filledTakeaways}/3)` 
    });
  }

  // Required: Minimum word count
  if (wordCount < MIN_WORD_COUNT) {
    errors.push({ 
      field: 'content', 
      message: `Body must be at least ${MIN_WORD_COUNT} words (${wordCount}/${MIN_WORD_COUNT})` 
    });
  }

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
  };
}

interface WriterValidationProps {
  validation: ValidationResult;
}

export function WriterValidation({ validation }: WriterValidationProps) {
  const { canPublish, errors, warnings } = validation;

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
              <span>3+ key takeaways</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>500+ words</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
