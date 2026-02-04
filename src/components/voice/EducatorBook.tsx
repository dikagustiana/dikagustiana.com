import { EducatorFields } from '@/lib/types/toneFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skull, Sword, Clock, BookOpen, SkipForward, Activity } from 'lucide-react';

interface EducatorBookProps {
  title: string;
  fields: EducatorFields;
  content?: string;
}

export function EducatorBook({ title, fields, content }: EducatorBookProps) {
  return (
    <article className="space-y-8">
      {/* The Ignorance This Fights */}
      <Card className="border-l-4 border-l-destructive bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <Skull className="h-5 w-5" />
            The Ignorance This Fights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">
            "This ignorance enables specific harm:"
          </p>
          <p className="mt-2 font-medium">{fields.ignoranceFought}</p>
        </CardContent>
      </Card>

      {/* Skill Sharpened */}
      <Card className="border-l-4 border-l-green-500 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-green-600 dark:text-green-400">
            <Sword className="h-5 w-5" />
            Skill Sharpened
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground italic">
            "After reading, you will be able to:"
          </p>
          <p className="mt-2 font-medium text-lg">{fields.skillSharpened}</p>
        </CardContent>
      </Card>

      {/* Why Needed Now */}
      <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock className="h-5 w-5" />
            Why This is Urgent Now
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{fields.whyNeededNow}</p>
        </CardContent>
      </Card>

      {/* How to Read */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">How to Read This Book</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sequence */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium mb-1">Reading Sequence</h4>
              <p className="text-muted-foreground text-sm">{fields.howToRead.sequence}</p>
            </div>
          </div>

          {/* What to Skip */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg shrink-0">
              <SkipForward className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-medium mb-1">What to Skip</h4>
              <p className="text-muted-foreground text-sm">{fields.howToRead.skip}</p>
            </div>
          </div>

          {/* Companion Activities */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium mb-1">While Reading</h4>
              <p className="text-muted-foreground text-sm">{fields.howToRead.companionActivities}</p>
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
