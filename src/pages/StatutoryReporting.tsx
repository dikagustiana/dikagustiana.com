import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';

// Each entry below is a recurring problem, not a step: the order carries no
// meaning, so the list is plain and unnumbered.
const PROBLEMS = [
  {
    title: 'Intercompany reconciliation',
    body: 'Group companies that transact across borders book the same deal at different dates and FX rates. The mismatch has to be reconciled before the year-end close, not after the audit finds it.',
  },
  {
    title: 'Transfer pricing support',
    body: 'Related-party transactions have to be at arm’s length, and the statutory accounts are where a tax authority will look for the evidence.',
  },
  {
    title: 'Two charts of accounts',
    body: 'The group chart of accounts is built for consolidation and the statutory one for local presentation, so every entity needs a mapping between them.',
  },
  {
    title: 'Audit coordination',
    body: 'A local statutory audit feeds the group audit but runs to its own deadline, sometimes with a different auditor.',
  },
];

export default function StatutoryReporting() {
  return (
    <PageLayout variant="content" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Accounting', path: '/accounting' }, { label: 'Statutory Reporting' }]}>
      <SEO title="Statutory Reporting" description="Why each legal entity in an Indonesian group files its own accounts, and where book and tax part." />
      <div className="flex-1 container py-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Statutory Reporting
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Every legal entity in a group files its own statutory accounts, on its own deadlines,
            regardless of what the consolidated set says.
          </p>

          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              An Indonesian group keeps two parallel sets: the consolidated PSAK statements the
              parent reports, and the standalone PSAK statements each PT files for tax and corporate
              purposes. The reconciliation work is between book and tax, and between entity and
              group, not between PSAK and IFRS.
            </p>
            <p>
              Indonesian tax rules do not always follow PSAK. Depreciation rates, provisions and the
              timing of revenue can differ, and that difference is what creates deferred tax assets
              and liabilities.
            </p>
            <p className="text-sm text-muted-foreground">
              The filings and deadlines that apply depend on the kind of entity (listed, unlisted,
              branch). None are listed here until each can be tied to the regulation that sets it.
            </p>
          </div>

          <h2 className="mt-12 mb-4 text-xl font-display font-semibold text-foreground">
            Where the work goes wrong
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {PROBLEMS.map((problem) => (
              <li key={problem.title} className="py-5">
                <h3 className="font-semibold text-foreground">{problem.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{problem.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}
