import { EconomistFields } from '@/lib/types/toneFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, TrendingUp, TrendingDown, Scale, Zap } from 'lucide-react';

interface EconomistEssayProps {
  title: string;
  fields: EconomistFields;
  content?: string;
}

export function EconomistEssay({ title, fields, content }: EconomistEssayProps) {
  return (
    <article className="space-y-8">
      {/* Core Question */}
      <div className="text-center py-8 border-y">
        <HelpCircle className="h-8 w-8 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-display font-bold italic">
          "{fields.coreQuestion}"
        </h2>
      </div>

      {/* Why This is Happening */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Why This is Happening</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{fields.whyHappening}</p>
        </CardContent>
      </Card>

      {/* Winners and Losers Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Who Benefits */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-green-600 dark:text-green-400">
              <TrendingUp className="h-5 w-5" />
              Who Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {fields.whoBenefits.map((actor, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300 shrink-0">
                    +
                  </Badge>
                  <span>{actor}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Who Loses */}
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
              <TrendingDown className="h-5 w-5" />
              Who Loses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {fields.whoLoses.map((actor, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300 shrink-0">
                    −
                  </Badge>
                  <span>{actor}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Trade-offs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-amber-500" />
            Trade-offs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.tradeOffs.map((tradeoff, index) => (
            <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="flex-1 text-right">
                <span className="text-green-600 dark:text-green-400 font-medium">{tradeoff.gain}</span>
              </div>
              <div className="text-muted-foreground font-bold">↔</div>
              <div className="flex-1">
                <span className="text-red-600 dark:text-red-400 font-medium">{tradeoff.sacrifice}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Second-Order Effects */}
      <Card className="border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Second-Order Effects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            What happens after the initial change?
          </p>
          <ul className="space-y-2">
            {fields.secondOrderEffects.map((effect, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">→</span>
                <span>{effect}</span>
              </li>
            ))}
          </ul>
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
