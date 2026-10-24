import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { useFsPeriods } from '@/hooks/queries/useFs';

/**
 * OWNER-REPLACEABLE: the Consolidated Reporting row, after its section 4 became the PSAK 338 workbook
 * viewer (site sweep 2026-10, R4.6). Drawn from that section's PRD heading, "Working paper: PT Dummy C and
 * its subsidiaries, PSAK 338", and its default lede, "The full consolidation workbook, sheet by sheet.
 * Click a cell to see its formula and follow where it comes from."
 */
const CONSOLIDATED_REPORTING_ROW =
  'The PSAK 338 working paper of PT Dummy C and its subsidiaries, sheet by sheet: click a cell to see its formula and follow where it comes from.';

export default function Accounting() {
  const { data: periods, isSuccess } = useFsPeriods();
  const published = isSuccess ? periods.filter((p) => p.status === 'published').length : 0;

  const pages = [
    {
      title: 'FSLI Detail',
      path: '/accounting/fsli',
      description: 'Audited financial statements row by row as printed, each figure traced to its PDF page and checked against the statements\' own totals, with a page for each line item.',
      standing: isSuccess && published > 0 ? `${published} audited ${published === 1 ? 'report' : 'reports'}` : null,
    },
    {
      title: 'Consolidated Reporting',
      path: '/accounting/consolidated-reporting',
      description: CONSOLIDATED_REPORTING_ROW,
      // Still one: the workbook is the page's one worked example.
      standing: '1 worked example',
    },
    {
      title: 'Statutory Reporting',
      path: '/accounting/statutory-reporting',
      description: 'Why each entity files its own accounts, and where book and tax part.',
      standing: null,
    },
  ];

  return (
    <PageLayout
      width="reading"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Accounting' }]}
    >
      <SEO
        title="Accounting"
        description="Reference pages on financial-statement line items and on how group consolidation works under PSAK."
      />

      <div className={`${PAGE_COLUMN.reading} py-8`}>
        <div>
          <h1 className="text-3xl font-display font-bold mb-4">Accounting</h1>
          <p className="text-muted-foreground mb-8">
            Reference pages for the line items of a statement of financial position, and for how a
            group of Indonesian entities consolidates under PSAK 110. These are working notes.
          </p>

          <ul className="divide-y divide-border border-y border-border">
            {pages.map((page) => (
              <li key={page.path}>
                <Link
                  to={page.path}
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <span>
                    <span className="block text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                      {page.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{page.description}</span>
                  </span>
                  {page.standing && (
                    <span className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
                      {page.standing}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}
