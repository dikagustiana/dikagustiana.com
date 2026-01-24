import { Layout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FeatureCard } from '@/components/FeatureCard';
import { Card, CardContent } from '@/components/ui/card';

export default function Finance101() {
  return (
    <Layout>
      <div className="py-8 section-container">
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Finance' }]} />
        <h1 className="text-3xl font-display font-bold mb-4">Finance</h1>
        <p className="text-muted-foreground max-w-3xl mb-8">
          Finance isn't about memorizing formulas—it's about understanding how money flows through 
          a business and how decisions get made. Here you'll find the analytical frameworks that 
          actually matter in practice.
        </p>

        {/* Core Insight */}
        <Card className="mb-12 bg-secondary/50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3">The Real Purpose of Financial Analysis</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Financial analysis exists to support decisions—not to produce reports. Every ratio, 
              every variance, every forecast should answer a question: Should we invest? Can we 
              afford this? What happens if sales drop 20%? If your analysis doesn't inform a decision, 
              it's just arithmetic.
            </p>
          </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <FeatureCard
            title="Financial Analytics"
            description="Variance analysis, profitability metrics, liquidity assessment, and capital structure—the tools for understanding what's actually happening in a business."
            icon="TrendingUp"
            linkUrl="/finance-101/analytics"
            linkText="Explore Analytics"
          />
          <FeatureCard
            title="Financial Planning & Forecasting"
            description="Building models that support decisions, not just predict numbers. Scenario analysis, sensitivity testing, and the assumptions that actually matter."
            icon="BarChart3"
            linkUrl="/finance-101/planning"
            linkText="Start Planning"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <FeatureCard
            title="Budgeting"
            description="The tension between bottom-up realism and top-down targets. How budgets become tools for accountability—or games of sandbagging."
            icon="DollarSign"
            linkUrl="/finance-101/budgeting"
            linkText="See Budgeting"
          />
          <FeatureCard
            title="CFA Prep"
            description="Study strategies, core concepts, and practical tips for the CFA examinations. What to focus on and what to skip."
            icon="Award"
            linkUrl="/finance-101/cfa-prep"
            linkText="View Notes"
          />
        </div>

        <div className="bg-card-light rounded-xl p-8 mb-12">
          <h2 className="text-xl font-display font-bold text-card-light-foreground mb-6">Finance Learning Path</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Foundation Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Reading financial statements with purpose</li>
                <li>• Key ratios and what they actually tell you</li>
                <li>• Cash vs. profit: why the difference matters</li>
                <li>• Working capital and operating cycles</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Intermediate Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Variance analysis beyond the obvious</li>
                <li>• EBITDA limitations and alternatives</li>
                <li>• Capital allocation trade-offs</li>
                <li>• Forecasting with honest uncertainty</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Advanced Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Asset-heavy business economics</li>
                <li>• Capital structure decisions</li>
                <li>• M&A financial considerations</li>
                <li>• Cross-border complexity</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key Concepts */}
        <div className="space-y-6">
          <h2 className="text-xl font-display font-semibold text-foreground">Key Concepts Worth Understanding</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Why EBITDA Can Mislead</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  EBITDA strips out depreciation and interest—which makes sense for comparing operating 
                  performance. But for asset-heavy businesses, ignoring capex is like ignoring rent. 
                  A company "earning" $100M EBITDA but spending $120M on maintenance capex isn't 
                  profitable—it's slowly liquidating.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Scenario Analysis vs. Single-Point Forecasts</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A forecast that says "revenue will be $50M" is almost certainly wrong. The question 
                  is: how wrong? Good financial planning shows a range of outcomes and identifies 
                  which assumptions drive the difference. That's how you prepare for uncertainty 
                  instead of pretending it doesn't exist.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Capital Allocation Trade-offs</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Every dollar has multiple uses: reinvest in the business, pay down debt, return to 
                  shareholders, or acquire something. The right choice depends on return expectations, 
                  risk tolerance, and opportunity cost. Companies that don't think about this 
                  systematically usually destroy value.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">The Working Capital Trap</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Growing companies often run out of cash even while profitable. Why? Growth requires 
                  investment in inventory and receivables before you collect payment. Many businesses 
                  have failed not because they couldn't sell, but because they couldn't finance their 
                  own success.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
