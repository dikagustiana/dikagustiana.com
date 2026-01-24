import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function FinancialPlanningForecasting() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Finance', path: '/finance-101' },
              { label: 'Financial Planning & Forecasting' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Financial Planning & Forecasting
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            The goal isn't to predict the future—it's to prepare for multiple versions of it.
          </p>

          {/* Core Insight */}
          <Card className="mb-8 bg-secondary/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">Why Forecasts Always Miss</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Single-point forecasts are always wrong. The question is whether they're usefully wrong. 
                A forecast that says "revenue will be between $45M and $55M, most likely $50M" is more 
                honest than "$50M exactly"—and more useful for decision-making.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-8">
            {/* The Planning Process */}
            <Card>
              <CardHeader>
                <CardTitle>The Planning Process: What Actually Matters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Financial planning connects strategy to numbers. It answers: If we pursue this 
                  strategy, what resources do we need? What returns can we expect? When will we 
                  need capital?
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Strategic Questions</h4>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                      <li>• What growth rate is sustainable without external capital?</li>
                      <li>• At what point do we need to raise money?</li>
                      <li>• Which investments have the highest return?</li>
                      <li>• What happens if key assumptions are wrong?</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Operational Questions</h4>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                      <li>• How many people do we need to hire?</li>
                      <li>• When should we expand capacity?</li>
                      <li>• What's our cash runway?</li>
                      <li>• How much working capital will growth require?</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scenario Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Scenario Analysis: Planning for Uncertainty</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Good financial models show a range of outcomes. The classic three-scenario approach:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">Base Case</h4>
                    <p className="text-muted-foreground text-sm">
                      What you genuinely expect. Should be achievable but not sandbagged.
                    </p>
                  </div>
                  <div className="border-l-2 border-blue-500 pl-4">
                    <h4 className="font-semibold text-foreground">Upside Case</h4>
                    <p className="text-muted-foreground text-sm">
                      If things go well. What opportunities would we capture? What resources would we need?
                    </p>
                  </div>
                  <div className="border-l-2 border-red-500 pl-4">
                    <h4 className="font-semibold text-foreground">Downside Case</h4>
                    <p className="text-muted-foreground text-sm">
                      If things go wrong. Can we survive? What would we cut? When would we run out of cash?
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  The downside case is often the most valuable. It forces you to identify risks and 
                  plan contingencies before you're in crisis mode.
                </p>
              </CardContent>
            </Card>

            {/* Key Drivers */}
            <Card>
              <CardHeader>
                <CardTitle>Identifying Key Drivers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Not all assumptions matter equally. A good model identifies the 3-5 drivers that 
                  really move outcomes:
                </p>
                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-1">Revenue Drivers</h4>
                    <p className="text-muted-foreground text-xs">
                      Volume × price. Customer count × revenue per customer. Market size × market share.
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-1">Margin Drivers</h4>
                    <p className="text-muted-foreground text-xs">
                      Input costs, pricing power, operating leverage, scale effects.
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-1">Capital Drivers</h4>
                    <p className="text-muted-foreground text-xs">
                      Working capital intensity, capex requirements, debt terms.
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Sensitivity analysis shows how much outcomes change when drivers change. 
                  If a 10% change in one assumption swings value by 30%, you should spend 
                  serious time validating that assumption.
                </p>
              </CardContent>
            </Card>

            {/* Common Mistakes */}
            <Card>
              <CardHeader>
                <CardTitle>Common Forecasting Mistakes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground">Hockey Stick Projections</h4>
                      <p className="text-muted-foreground text-sm">
                        Flat or declining historical results that suddenly inflect upward. 
                        Unless you can explain exactly what changes, this is wishful thinking.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground">Ignoring Working Capital</h4>
                      <p className="text-muted-foreground text-sm">
                        Revenue growth requires investment in receivables and inventory. 
                        Many forecasts show profit but ignore the cash drain from growth.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground">Constant Margin Assumptions</h4>
                      <p className="text-muted-foreground text-sm">
                        Assuming margins stay flat as you scale. In reality, you might get 
                        operating leverage (margins improve) or hit capacity constraints (margins compress).
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground">Circular Logic</h4>
                      <p className="text-muted-foreground text-sm">
                        "We'll grow 20% because that's what we need to hit our target." 
                        Forecasts should be grounded in market reality, not internal ambitions.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Tool Link */}
            <Card className="bg-accent/10 border-accent/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Try the Forecasting Tool</h3>
                    <p className="text-muted-foreground text-sm">
                      Build a simple three-statement forecast with scenario analysis.
                    </p>
                  </div>
                  <Link to="/forecasting/input">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                      Start Building
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
