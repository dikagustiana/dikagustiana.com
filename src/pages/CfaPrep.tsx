import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CfaPrep() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Finance', path: '/finance-101' },
              { label: 'CFA Prep' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            CFA Preparation
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            The CFA is a marathon, not a sprint. Here's what actually matters for passing.
          </p>

          {/* Core Insight */}
          <Card className="mb-8 bg-secondary/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">The Real Challenge</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The CFA curriculum is vast, but the exam tests depth in certain areas more than 
                others. Passing isn't about knowing everything—it's about knowing what to focus 
                on and practicing until the patterns become automatic.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-8">
            {/* Level Overview */}
            <Card>
              <CardHeader>
                <CardTitle>The Three Levels: What Changes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="border-l-2 border-blue-500 pl-4">
                    <h4 className="font-semibold text-foreground">Level I: Breadth</h4>
                    <p className="text-muted-foreground text-sm">
                      Tests your knowledge across all topics. Mostly definitional and formulaic. 
                      The challenge is volume—there's a lot to memorize. Pass rate: ~40%.
                    </p>
                  </div>
                  <div className="border-l-2 border-amber-500 pl-4">
                    <h4 className="font-semibold text-foreground">Level II: Application</h4>
                    <p className="text-muted-foreground text-sm">
                      Case-based questions that require applying concepts to scenarios. 
                      Valuation and financial analysis get heavy weight. Often considered the hardest.
                    </p>
                  </div>
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">Level III: Portfolio Management</h4>
                    <p className="text-muted-foreground text-sm">
                      Constructed response (essay) section plus item sets. Focuses on portfolio 
                      construction, IPS, and wealth management. More conceptual, less calculation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Study Strategy */}
            <Card>
              <CardHeader>
                <CardTitle>Study Strategy That Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">What to Do</h4>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                      <li>• Start 6 months before the exam minimum</li>
                      <li>• Do every end-of-reading question—twice</li>
                      <li>• Take mock exams under timed conditions</li>
                      <li>• Focus extra time on Ethics (high weight, learnable)</li>
                      <li>• Use spaced repetition for formulas</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">What Not to Do</h4>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                      <li>• Don't just read the curriculum passively</li>
                      <li>• Don't skip practice problems</li>
                      <li>• Don't save all review for the last week</li>
                      <li>• Don't ignore topics you find boring</li>
                      <li>• Don't underestimate the time commitment</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Topic Weights */}
            <Card>
              <CardHeader>
                <CardTitle>Where to Focus: Topic Weights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Not all sections are weighted equally. Prioritize based on points available:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Ethics & Professional Standards</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="w-full h-full bg-accent" style={{ width: '75%' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">10-15%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Financial Reporting & Analysis</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="w-full h-full bg-accent" style={{ width: '100%' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">11-14%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Equity Investments</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="w-full h-full bg-accent" style={{ width: '80%' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">10-12%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Fixed Income</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="w-full h-full bg-accent" style={{ width: '80%' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">10-12%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Quantitative Methods</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="w-full h-full bg-accent" style={{ width: '60%' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">8-12%</span>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mt-4">
                  Financial Reporting and Ethics together can be 25%+ of the exam. 
                  If you're strong in these areas, you have a significant advantage.
                </p>
              </CardContent>
            </Card>

            {/* Key Formulas */}
            <Card>
              <CardHeader>
                <CardTitle>Formulas Worth Memorizing Cold</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Some formulas appear so frequently that you need instant recall:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2">WACC</h4>
                    <code className="text-xs text-muted-foreground">
                      (E/V × Re) + (D/V × Rd × (1-T))
                    </code>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2">DDM (Gordon Growth)</h4>
                    <code className="text-xs text-muted-foreground">
                      P = D₁ / (r - g)
                    </code>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2">DuPont (5-factor)</h4>
                    <code className="text-xs text-muted-foreground">
                      ROE = Tax × Interest × Margin × Turnover × Leverage
                    </code>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2">Bond Duration</h4>
                    <code className="text-xs text-muted-foreground">
                      ΔP/P ≈ -Duration × Δy
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Practical Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Exam Day Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground text-sm">
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>Answer every question—there's no penalty for guessing.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>Flag difficult questions and return to them. Don't get stuck.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>For Ethics, pick the most ethical-sounding answer. When in doubt, disclose.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>Calculator practice matters—know your BA II Plus shortcuts.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>Read questions carefully. Many wrong answers come from misreading.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
