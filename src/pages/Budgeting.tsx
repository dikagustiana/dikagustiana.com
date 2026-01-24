import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Budgeting() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Finance', path: '/finance-101' },
              { label: 'Budgeting' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Budgeting
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Budgets are promises about the future. The question is: whose promises, and how realistic?
          </p>

          {/* Core Insight */}
          <Card className="mb-8 bg-secondary/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">The Fundamental Tension</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Every budgeting process faces the same conflict: leadership wants ambitious targets 
                that drive performance, while operating teams want achievable numbers that protect 
                their bonuses. The resulting negotiation often produces budgets that are neither 
                truly aspirational nor genuinely realistic.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-8">
            {/* Budget vs Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>Budget vs. Forecast: They're Not the Same</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  A <strong className="text-foreground">budget</strong> is a commitment—what you're 
                  saying you will deliver. It's typically annual, locked early, and tied to performance 
                  evaluation. Once approved, the budget becomes the yardstick.
                </p>
                <p className="text-muted-foreground">
                  A <strong className="text-foreground">forecast</strong> is an expectation—what you 
                  think will actually happen. Good forecasts update frequently as new information 
                  arrives. They should be realistic, not aspirational.
                </p>
                <p className="text-muted-foreground">
                  Problems arise when companies confuse these. If forecasts become targets, people 
                  game them. If budgets never update, they become irrelevant by Q2.
                </p>
              </CardContent>
            </Card>

            {/* Top-Down vs Bottom-Up */}
            <Card>
              <CardHeader>
                <CardTitle>Top-Down vs. Bottom-Up: The Politics of Planning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Top-Down Approach</h4>
                    <p className="text-muted-foreground text-sm mb-2">
                      Leadership sets targets based on strategic goals, investor expectations, or 
                      growth mandates. Divisions figure out how to deliver.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      <strong className="text-foreground">Risk:</strong> Targets may be disconnected 
                      from operational reality. Teams commit to numbers they can't achieve.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Bottom-Up Approach</h4>
                    <p className="text-muted-foreground text-sm mb-2">
                      Operating teams build budgets from detailed assumptions about customers, 
                      projects, and costs. Leadership aggregates and approves.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      <strong className="text-foreground">Risk:</strong> Sandbagging. Teams build 
                      in buffers and low-ball estimates to guarantee they hit their numbers.
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Most companies use a hybrid: top-down targets with bottom-up detail. The challenge 
                  is making the iteration productive rather than political.
                </p>
              </CardContent>
            </Card>

            {/* Common Traps */}
            <Card>
              <CardHeader>
                <CardTitle>Common Budgeting Traps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">The Straight-Line Fallacy</h4>
                    <p className="text-muted-foreground text-sm">
                      Dividing annual targets by 12 ignores seasonality. When Q1 misses because 
                      January is always slow, it creates unnecessary panic and reforecasting.
                    </p>
                  </div>
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">Expense Anchoring</h4>
                    <p className="text-muted-foreground text-sm">
                      "Last year plus 5%" is easy but lazy. It perpetuates waste and misses 
                      opportunities. Zero-based budgeting is the antidote, but few companies 
                      have the stamina to do it properly.
                    </p>
                  </div>
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">Revenue Optimism, Cost Conservatism</h4>
                    <p className="text-muted-foreground text-sm">
                      Sales teams promise aggressive growth; cost centers assume everything will 
                      get more expensive. The result: budgeted profits that never materialize.
                    </p>
                  </div>
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">Use-It-or-Lose-It</h4>
                    <p className="text-muted-foreground text-sm">
                      When unspent budget disappears, teams spend wastefully in Q4 to protect 
                      next year's allocation. This is a system design failure, not a people failure.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variance Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Making Variance Analysis Useful</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Variance analysis should explain <em>why</em> results differ from budget—not just 
                  <em>that</em> they differ. Good variance analysis separates:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2">Volume Effects</h4>
                    <p className="text-muted-foreground text-xs">
                      Did we sell more or fewer units than planned?
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2">Price/Rate Effects</h4>
                    <p className="text-muted-foreground text-xs">
                      Did we charge more or less per unit? Pay more for inputs?
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-2">Mix Effects</h4>
                    <p className="text-muted-foreground text-xs">
                      Did we sell different products than expected?
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Without this decomposition, you can't tell whether a revenue miss is a sales 
                  problem, a pricing problem, or a product strategy problem.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
