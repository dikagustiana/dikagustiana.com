import { ManagerFields } from '@/lib/types/toneFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Calculator, Target } from 'lucide-react';

interface ManagerArticleProps {
  title: string;
  fields: ManagerFields;
  content?: string;
}

export function ManagerArticle({ title, fields, content }: ManagerArticleProps) {
  return (
    <article className="space-y-8">
      {/* When You Need This */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            When You Need This
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{fields.whenYouNeedThis}</p>
        </CardContent>
      </Card>

      {/* What to Calculate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-500" />
            What to Calculate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm bg-muted p-4 rounded-lg">{fields.whatToCalculate}</p>
        </CardContent>
      </Card>

      {/* Decision Supported */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
        <h3 className="font-semibold mb-2">The decision this supports:</h3>
        <p className="text-lg italic">"{fields.decisionSupported}"</p>
      </div>

      {/* Procedure */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Procedure</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3">
            {fields.procedure.map((step, index) => (
              <li key={index} className="pl-2">
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Common Errors */}
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Common Errors to Avoid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.commonErrors.map((item, index) => (
            <div key={index} className="border-l-2 border-destructive pl-4 py-2">
              <p className="font-medium">The error: {item.error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                The consequence: {item.consequence}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Additional Content */}
      {content && (
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      )}
    </article>
  );
}
