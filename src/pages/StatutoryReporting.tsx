import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatutoryReporting() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Accounting', path: '/accounting' },
              { label: 'Statutory Reporting' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Statutory Reporting
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Every legal entity has reporting obligations to its local jurisdiction. 
            These aren't optional—they're requirements with deadlines and penalties.
          </p>

          {/* Core Insight */}
          <Card className="mb-8 bg-secondary/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">Statutory vs. Consolidated: Two Parallel Tracks</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Multinationals prepare two sets of accounts: consolidated reports for the group 
                (often under IFRS), and statutory accounts for each legal entity under local GAAP. 
                These can differ significantly, creating reconciliation work and sometimes different 
                profit figures.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-8">
            {/* Indonesian Context */}
            <Card>
              <CardHeader>
                <CardTitle>Indonesian Statutory Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Indonesian companies prepare statutory accounts under PSAK and file with various authorities:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Key Filings</h4>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                      <li>• Annual financial statements to OJK (public companies)</li>
                      <li>• Tax returns to DJP (Dirjen Pajak)</li>
                      <li>• Annual report filing with Kemenkumham</li>
                      <li>• Industry-specific regulators as applicable</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Deadlines</h4>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                      <li>• Audited financials: 4 months after year-end</li>
                      <li>• Corporate tax return: 4 months after year-end</li>
                      <li>• Annual report: 5 months after year-end</li>
                      <li>• Quarterly reports: 1 month after quarter-end (public)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PSAK Specifics */}
            <Card>
              <CardHeader>
                <CardTitle>PSAK Considerations for Statutory Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">PSAK vs. IFRS Timing Differences</h4>
                    <p className="text-muted-foreground text-sm">
                      Indonesia typically adopts IFRS standards with a 1-2 year lag. This creates 
                      temporary differences between group (IFRS) and local (PSAK) accounting.
                    </p>
                  </div>
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">Tax-Book Differences</h4>
                    <p className="text-muted-foreground text-sm">
                      Indonesian tax regulations don't always follow PSAK. Depreciation rates, 
                      provisions, and revenue timing can differ—creating deferred tax assets and liabilities.
                    </p>
                  </div>
                  <div className="border-l-2 border-accent pl-4">
                    <h4 className="font-semibold text-foreground">Functional Currency</h4>
                    <p className="text-muted-foreground text-sm">
                      Statutory accounts for Indonesian entities are presented in Rupiah. 
                      Entities with USD functional currency still file in IDR, requiring translation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Common Challenges */}
            <Card>
              <CardHeader>
                <CardTitle>Common Statutory Reporting Challenges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-foreground text-sm font-semibold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Intercompany Reconciliation</h4>
                      <p className="text-muted-foreground text-sm">
                        When group companies transact across borders, timing differences and FX rates 
                        create mismatches. Reconciling these before year-end close is critical.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-foreground text-sm font-semibold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Transfer Pricing Documentation</h4>
                      <p className="text-muted-foreground text-sm">
                        Related-party transactions must be at arm's length. Statutory accounts need 
                        to support transfer pricing positions that can withstand tax authority scrutiny.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-foreground text-sm font-semibold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Different Chart of Accounts</h4>
                      <p className="text-muted-foreground text-sm">
                        Group COA is designed for consolidation; statutory COA must meet local 
                        presentation requirements. Mapping between them is often messy.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-foreground text-sm font-semibold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Audit Coordination</h4>
                      <p className="text-muted-foreground text-sm">
                        Local statutory audits feed into group audits but have different deadlines 
                        and sometimes different auditors. Coordinating findings and adjustments is complex.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Best Practices */}
            <Card>
              <CardHeader>
                <CardTitle>Making Statutory Reporting Less Painful</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground text-sm">
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>
                      <strong className="text-foreground">Standardize close calendars</strong> — 
                      align subsidiary closes with group timelines to avoid last-minute scrambles.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>
                      <strong className="text-foreground">Document GAAP differences</strong> — 
                      maintain a reconciliation template that bridges local PSAK to group IFRS.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>
                      <strong className="text-foreground">Automate intercompany matching</strong> — 
                      implement tools that flag discrepancies before they become audit issues.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>
                      <strong className="text-foreground">Track regulatory changes</strong> — 
                      PSAK and tax rules evolve; build processes to catch changes early.
                    </span>
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
