import { Layout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FeatureCard } from '@/components/FeatureCard';

export default function Finance101() {
  return (
    <Layout>
      <div className="py-8 section-container">
        <Breadcrumb />
        <h1 className="text-3xl font-display font-bold mb-4">Finance</h1>
        <p className="text-muted-foreground max-w-3xl mb-12">
          Master essential financial concepts and analytical skills through comprehensive modules covering financial analysis, planning, budgeting, and professional certification preparation.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <FeatureCard
            title="Financial Analytics"
            description="Drill down into variance, profitability, liquidity, efficiency and financial structure analyses."
            icon="TrendingUp"
            linkUrl="/finance-101/analytics"
            linkText="Explore Analytics"
          />
          <FeatureCard
            title="Financial Planning & Forecasting"
            description="Build a comprehensive plan and forecast using a step-by-step flowchart covering sales assumptions through to analysing projected statements."
            icon="BarChart3"
            linkUrl="/finance-101/planning"
            linkText="Start Planning"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <FeatureCard
            title="Budgeting"
            description="Learn about budgeting versus planning, bottom-up vs top-down approaches and the assumptions that drive your budget."
            icon="DollarSign"
            linkUrl="/finance-101/budgeting"
            linkText="See Budgeting"
          />
          <FeatureCard
            title="CFA Prep"
            description="Outline your strategies for preparing for the CFA exams. Include study schedules, resources and tips you have found effective."
            icon="Award"
            linkUrl="/finance-101/cfa-prep"
            linkText="Add Notes"
          />
        </div>

        <div className="bg-card-light rounded-xl p-8">
          <h2 className="text-xl font-display font-bold text-card-light-foreground mb-6">Finance Learning Path</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Foundation Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Financial statement basics</li>
                <li>• Key financial ratios</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Intermediate Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Advanced financial analysis</li>
                <li>• Valuation techniques</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Advanced Level</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Portfolio management</li>
                <li>• Derivatives and hedging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
