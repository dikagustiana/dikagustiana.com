import { CoachFields } from '@/lib/types/toneFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, FileText, CheckSquare, ListOrdered, RotateCcw } from 'lucide-react';

interface CoachLessonProps {
  title: string;
  fields: CoachFields;
  content?: string;
}

export function CoachLesson({ title, fields, content }: CoachLessonProps) {
  return (
    <article className="space-y-8">
      {/* Target and Time Header */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Target Score</p>
            <p className="text-2xl font-bold">{fields.targetScore}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Clock className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm text-muted-foreground">Time Required</p>
            <p className="text-2xl font-bold">{fields.timeRequired}</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Description */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            The Task
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{fields.taskDescription}</p>
        </CardContent>
      </Card>

      {/* Scoring Criteria */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Scoring Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">How performance is measured:</p>
          <p className="mt-2 font-medium">{fields.scoringCriteria}</p>
        </CardContent>
      </Card>

      {/* The Method */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-green-500" />
            The Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {fields.method.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {index + 1}
                </span>
                <span className="text-muted-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Practice Protocol */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            Practice Protocol
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Frequency</p>
              <p className="font-bold">{fields.practiceProtocol.frequency}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Duration</p>
              <p className="font-bold">{fields.practiceProtocol.duration}</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Self-Assessment</p>
              <p className="font-bold text-sm">{fields.practiceProtocol.feedbackLoop}</p>
            </div>
          </div>
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
