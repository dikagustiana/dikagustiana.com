import { Layout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FeatureCard } from '@/components/FeatureCard';
import { Card, CardContent } from '@/components/ui/card';

export default function Accounting() {
  return (
    <Layout>
      <div className="py-8 section-container">
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Accounting' }]} />
        <h1 className="text-3xl font-display font-bold mb-4">Accounting</h1>
        <p className="text-muted-foreground max-w-3xl mb-8">
          Accounting isn't just record-keeping—it's a language for describing economic reality. 
          The choices accountants make shape how businesses appear to investors, regulators, and management.
        </p>

        {/* Core Insight */}
        <Card className="mb-12 bg-secondary/50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3">Why Accounting Policy Matters</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Two identical businesses can report very different profits depending on their accounting 
              choices. Revenue recognition timing, depreciation methods, inventory valuation—these 
              aren't just technical details. They determine when income appears, what assets are worth 
              on paper, and how healthy a company looks to outsiders.
            </p>
          </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            title="FSLI Detail"
            description="Deep dive into each financial statement line item. What it means, how it's measured, and why the accounting choices matter."
            icon="FileText"
            linkUrl="/accounting/fsli"
            linkText="Learn More"
          />
          <FeatureCard
            title="Consolidated Reporting"
            description="How to combine financial statements across group entities. Elimination entries, NCI calculations, and the complexity of multi-entity structures."
            icon="BarChart3"
            linkUrl="/accounting/consolidated"
            linkText="Learn More"
          />
          <FeatureCard
            title="Statutory Reporting"
            description="Meeting regulatory requirements across jurisdictions. Local GAAP differences, filing deadlines, and compliance considerations."
            icon="BookOpen"
            linkUrl="/accounting/statutory"
            linkText="Learn More"
          />
        </div>

        {/* Key Concepts Grid */}
        <div className="space-y-6 mb-12">
          <h2 className="text-xl font-display font-semibold text-foreground">Key Concepts Worth Understanding</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Consolidation Basics</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                  When a parent company controls subsidiaries, you can't just add up their financials. 
                  Intercompany transactions—sales between group members, loans, management fees—must be 
                  eliminated. Otherwise you'd double-count revenue and inflate the numbers.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Non-controlling interests add another layer: when you own 80% of a subsidiary, 
                  you consolidate 100% of its results but show the 20% belonging to outside shareholders separately.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Revenue Recognition Judgments</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                  When is revenue "earned"? For simple cash sales, it's obvious. But for long-term 
                  contracts, bundled services, or variable consideration, judgment enters.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  IFRS 15 / PSAK 72 requires identifying performance obligations and allocating 
                  transaction prices. The same contract can be accounted for very differently 
                  depending on how you analyze it.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">The Depreciation Spectrum</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                  Depreciation allocates the cost of an asset over its useful life. But "useful life" 
                  is an estimate—and different estimates produce different profits.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A machine depreciated over 5 years vs. 10 years shows half the annual expense 
                  in the second case. Neither is "wrong," but the choice affects how profitable the 
                  business appears.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">PSAK vs. IFRS Differences</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                  Indonesia's PSAK is largely converged with IFRS, but differences remain. Some are 
                  timing (PSAK adopts new standards later), some are substantive (local options).
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  For multinationals, these differences create reconciliation headaches when preparing 
                  both local statutory and group consolidated accounts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-card-light rounded-xl p-8">
          <h2 className="text-xl font-display font-bold text-card-light-foreground mb-6">Professional Standards & Frameworks</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Standards Covered</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• PSAK (Pernyataan Standar Akuntansi Keuangan)</li>
                <li>• IFRS convergence and differences</li>
                <li>• Consolidation under PSAK 65</li>
                <li>• Revenue recognition under PSAK 72</li>
                <li>• Lease accounting under PSAK 73</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Practical Skills</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Building consolidation eliminations</li>
                <li>• Calculating goodwill and NCI</li>
                <li>• Intercompany loan reconciliations</li>
                <li>• Multi-currency consolidation</li>
                <li>• Segment reporting requirements</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
