import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { FsHeader } from '@/components/fs/FsHeader';
import { FsTabs } from '@/components/fs/FsTabs';
import { FsTieOutBadge } from '@/components/fs/FsTieOutBadge';
import { FsVerticalStatement } from '@/components/fs/FsVerticalStatement';
import { FsPublishButton } from '@/components/fs/FsPublishButton';
import { useFsChecks, useFsLines, useFsPeriods, useFsSocePages } from '@/hooks/queries/useFs';
import { useAuth } from '@/contexts/AuthContext';
import { useFragmentOnArrival } from '@/hooks/useFragmentOnArrival';
import {
  FS_TABS,
  NOT_SHOWN_YET,
  isFsTab,
  latestRun,
  matchesSearch,
  pageRange,
  tieOut,
  type FsStatement,
  type FsTab,
} from '@/lib/fs';
import NotFound from './NotFound';

const PANEL_ID = 'fs-statement-panel';

/**
 * /accounting/fsli/:company/:period: one company's audited statements for one
 * period (PRD §A7, D4). The tab is in the address (?statement=pl_oci), so a
 * statement can be linked to.
 */
export default function FsViewer() {
  const { company = '', period: periodKey = '' } = useParams<{ company: string; period: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { isAdmin } = useAuth();
  // A line-item page links to its row (#row-sofp-30), drawn only once the rows arrive.
  useFragmentOnArrival();

  const requested = params.get('statement');
  const active: FsTab = isFsTab(requested) ? requested : 'sofp';
  const tab = FS_TABS.find((t) => t.key === active)!;

  const periods = useFsPeriods();
  const period = periods.data?.find((p) => p.company_id === company && p.period_key === periodKey);
  const lines = useFsLines(period?.id);
  const checks = useFsChecks(period?.id);
  const socePages = useFsSocePages(period?.id);

  const companies = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of periods.data ?? []) if (!seen.has(p.company_id)) seen.set(p.company_id, p.fs_company.short_name);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [periods.data]);

  const run = useMemo(() => latestRun(checks.data ?? []), [checks.data]);
  const pages = useMemo(
    () => pageRange([...(lines.data ?? []).map((l) => l.source_page), ...(socePages.data ?? [])]),
    [lines.data, socePages.data],
  );

  const setTab = (next: FsTab) => {
    const p = new URLSearchParams(params);
    if (next === 'sofp') p.delete('statement');
    else p.set('statement', next);
    setParams(p, { replace: true });
  };

  const onCompany = (companyId: string) => {
    const latest = periods.data?.find((p) => p.company_id === companyId);
    if (latest) navigate(`/accounting/fsli/${latest.company_id}/${latest.period_key}`);
  };

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Accounting', path: '/accounting' },
    { label: 'FSLI', path: '/accounting/fsli' },
    { label: period ? `${period.fs_company.short_name} ${period.period_key.toUpperCase()}` : 'Statements' },
  ];

  if (periods.isLoading || (period && lines.isLoading)) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="container py-8">
          <LoadingState variant="table" count={12} />
        </div>
      </PageLayout>
    );
  }

  if (periods.isError || lines.isError) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="container py-8">
          <ErrorState
            title="Couldn't load the statements"
            message="The statements could not be fetched just now. This is a temporary failure, not an empty report."
            onRetry={() => {
              void periods.refetch();
              if (period) void lines.refetch();
            }}
          />
        </div>
      </PageLayout>
    );
  }

  // A company or period the reader cannot see (unknown, or a draft to anyone
  // but an admin) is a wrong address.
  if (!period) return <NotFound />;

  const statementLines = tab.shown ? (lines.data ?? []).filter((l) => l.statement === (active as FsStatement)) : [];
  const visible = statementLines.filter((l) => matchesSearch(l, search));
  const failing = tieOut(run).failed;
  const name = period.fs_company.short_name;
  const year = period.period_end.slice(0, 4);

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <SEO
        title={`${name} FY${year} audited financial statements`}
        description={`${period.fs_company.legal_name}: the audited statements of financial position and of profit or loss for ${year}, row by row as printed, each figure tied to its PDF page and checked against the statements' own totals.`}
      />
      <div className="container max-w-5xl space-y-6 py-8">
        <FsHeader
          period={period}
          companies={companies}
          onCompany={onCompany}
          titleId={tab.titleId}
          titleEn={tab.titleEn}
          pointInTime={tab.pointInTime}
          search={search}
          onSearch={setSearch}
        />

        {checks.isError ? (
          <p className="text-sm text-muted-foreground">The tie-out result could not be loaded just now.</p>
        ) : (
          <FsTieOutBadge run={run} pages={pages} />
        )}

        {isAdmin && period.status === 'draft' && <FsPublishButton period={period} failing={failing} />}

        <div>
          <FsTabs active={active} onChange={setTab} panelId={PANEL_ID} />
          <div id={PANEL_ID} role="tabpanel" aria-labelledby={`fs-tab-${active}`} className="pt-4">
            {!tab.shown ? (
              <p className="py-8 text-muted-foreground">{NOT_SHOWN_YET}</p>
            ) : statementLines.length === 0 ? (
              <p className="py-8 text-muted-foreground">Not yet loaded from the FY{year} report.</p>
            ) : visible.length === 0 ? (
              <p className="py-8 text-muted-foreground">No line item matches &ldquo;{search.trim()}&rdquo;.</p>
            ) : (
              <FsVerticalStatement
                lines={visible}
                periodEnd={period.period_end}
                comparativeEnd={period.comparative_end}
                caption={`${tab.titleEn}, ${name}, ${year} and ${period.comparative_end.slice(0, 4)}`}
              />
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
