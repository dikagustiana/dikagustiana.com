import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ContentCard } from '@/components/ContentCard';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, BarChart3, BookOpen } from 'lucide-react';

export default function Accounting() {
  return (
    <PageLayout
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Accounting' }]}
      showManifesto
      manifesto="Accounting describes economic reality. Your job is to describe it accurately."
    >
      <SEO
        title="Accounting"
        description="Consolidation, PSAK standards, revenue recognition, and statutory reporting. What you check, what you calculate, what decisions this supports."
      />

      <div className="py-8 container">
        <h1 className="text-3xl font-display font-bold mb-4">Accounting</h1>
        <p className="text-muted-foreground max-w-3xl mb-8">
          Accounting isn't just record-keeping—it's a language for describing economic reality. 
          The choices accountants make shape how businesses appear to investors, regulators, and management.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <ContentCard
            title="FSLI Detail"
            description="Deep dive into each financial statement line item. What it means, how it's measured."
            icon={FileText}
            linkUrl="/accounting/fsli"
            linkText="Learn More"
            role="manager"
            whatYouCalculate="Account balances, movements, supporting schedules"
            decisionSupported="Is this balance complete? Is the classification correct?"
          />
          <ContentCard
            title="Consolidated Reporting"
            description="How to combine financial statements across group entities."
            icon={BarChart3}
            linkUrl="/accounting/consolidated-reporting"
            linkText="Learn More"
            role="manager"
            whatYouCalculate="Elimination entries, NCI, goodwill, intercompany reconciliations"
            decisionSupported="Does the consolidated view reflect economic reality?"
          />
          <ContentCard
            title="Statutory Reporting"
            description="Meeting regulatory requirements across jurisdictions."
            icon={BookOpen}
            linkUrl="/accounting/statutory-reporting"
            linkText="Learn More"
            role="manager"
            whatYouCalculate="Local GAAP adjustments, filing requirements, compliance checklists"
            decisionSupported="Are we compliant? What are the differences from group reporting?"
          />
        </div>

        {/* Key Concepts */}
        <div className="space-y-6 mb-12">
          <h2 className="text-xl font-display font-semibold text-foreground">Key Procedures</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Consolidation Checklist</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Identify reporting entities and control relationships</li>
                  <li>2. Align accounting policies across subsidiaries</li>
                  <li>3. Eliminate intercompany transactions (sales, loans, dividends)</li>
                  <li>4. Calculate and allocate goodwill on acquisition</li>
                  <li>5. Compute non-controlling interest share</li>
                  <li>6. Translate foreign subsidiaries (PSAK 10)</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">Revenue Recognition Steps (PSAK 72)</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Identify the contract with the customer</li>
                  <li>2. Identify the performance obligations</li>
                  <li>3. Determine the transaction price</li>
                  <li>4. Allocate price to performance obligations</li>
                  <li>5. Recognize revenue when obligation is satisfied</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">What to Check: Depreciation</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Is the useful life reasonable given actual usage?</li>
                  <li>• Is the method (straight-line vs. declining) appropriate?</li>
                  <li>• Are residual values updated annually?</li>
                  <li>• Are impairment indicators assessed?</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-2">PSAK vs. IFRS: Key Differences</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Timing: PSAK often adopts IFRS 1-2 years later</li>
                  <li>• Scope: Some IFRS standards have local alternatives</li>
                  <li>• Transition: Different effective dates and reliefs</li>
                  <li>• Impact: Creates reconciliation work for multinationals</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Common Errors */}
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Common Errors to Avoid</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-foreground font-medium mb-1">Incomplete intercompany eliminations</p>
                <p className="text-muted-foreground">Missing eliminations inflate revenue and assets. Reconcile before consolidating.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Inconsistent accounting policies</p>
                <p className="text-muted-foreground">Subsidiaries using different depreciation methods distort consolidated results.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Revenue before performance</p>
                <p className="text-muted-foreground">Recognizing revenue on contract signing, not delivery. Common in long-term contracts.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">Ignoring FX translation effects</p>
                <p className="text-muted-foreground">Foreign subsidiaries create OCI movements. Don't lose track of cumulative translation adjustments.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
