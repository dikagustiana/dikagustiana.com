import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ContentCard } from '@/components/ContentCard';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, BarChart3, DollarSign, Award } from 'lucide-react';

export default function Finance101() {
  return (
    <PageLayout
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Finance' }]}
      showManifesto
      manifesto="Finance exists to support decisions—not to produce reports."
    >
      <SEO
        title="Finance"
        description="Financial analysis frameworks that support decisions. Variance analysis, profitability metrics, scenario planning, and capital allocation."
      />

      <div className="py-8 container">
        <h1 className="text-3xl font-display font-bold mb-4">Finance</h1>
        <p className="text-muted-foreground max-w-3xl mb-8">
          Finance is about supporting decisions—not producing reports. Every ratio, every variance, 
          every forecast should answer a question: Should we invest? Can we afford this? What happens if sales drop 20%?
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <ContentCard
            title="Financial Analytics"
            description="Variance analysis, profitability metrics, liquidity assessment, and capital structure."
            icon={TrendingUp}
            linkUrl="/finance-101/financial-analytics"
            linkText="Explore Analytics"
            role="manager"
            whatYouCalculate="Gross margin, EBITDA margin, ROIC, liquidity ratios, debt service coverage"
            decisionSupported="Is the business profitable? Can it service its debt? Where is value created?"
          />
          <ContentCard
            title="Financial Planning & Forecasting"
            description="Building models that support decisions, not just predict numbers."
            icon={BarChart3}
            linkUrl="/finance-101/financial-planning-forecasting"
            linkText="Start Planning"
            role="manager"
            whatYouCalculate="Revenue drivers, cost structures, cash conversion cycles, scenario outcomes"
            decisionSupported="What happens if assumptions change? How sensitive is profitability to volume?"
          />
          <ContentCard
            title="Budgeting"
            description="The tension between bottom-up realism and top-down targets."
            icon={DollarSign}
            linkUrl="/finance-101/budgeting"
            linkText="See Budgeting"
            role="manager"
            whatYouCalculate="Budget variances, spend vs. allocation, cost center performance"
            decisionSupported="Where did we overspend? Which departments need reallocation?"
          />
          <ContentCard
            title="CFA Prep"
            description="Study strategies and core concepts for the CFA examinations."
            icon={Award}
            linkUrl="/finance-101/cfa-prep"
            linkText="View Notes"
            role="manager"
            whatYouCalculate="Weighted averages, time value, portfolio statistics, fixed income pricing"
            decisionSupported="Exam readiness assessment, topic prioritization"
          />
        </div>

        {/* Learning Path */}
        <div className="bg-card rounded-xl p-8 mb-12 border border-border">
          <h2 className="text-xl font-display font-bold text-foreground mb-6">Finance Learning Path</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Foundation Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Reading financial statements with purpose</li>
                <li>• Key ratios and what they tell you</li>
                <li>• Cash vs. profit: why the difference matters</li>
                <li>• Working capital and operating cycles</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Intermediate Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Variance analysis beyond the obvious</li>
                <li>• EBITDA limitations and alternatives</li>
                <li>• Capital allocation trade-offs</li>
                <li>• Forecasting with honest uncertainty</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Advanced Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Asset-heavy business economics</li>
                <li>• Capital structure decisions</li>
                <li>• M&A financial considerations</li>
                <li>• Cross-border complexity</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Common Errors */}
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Common Errors to Avoid</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-foreground font-medium mb-1">Using EBITDA as cash flow proxy</p>
                <p className="text-muted-foreground">EBITDA ignores capex. For asset-heavy businesses, this is like ignoring rent.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Single-point forecasts</p>
                <p className="text-muted-foreground">A forecast of "$50M" is certainly wrong. Show ranges and identify key drivers.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Ignoring working capital in growth</p>
                <p className="text-muted-foreground">Growth requires investment in inventory and receivables before cash arrives.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Comparing ratios without context</p>
                <p className="text-muted-foreground">A 10% margin means different things in software vs. manufacturing.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
