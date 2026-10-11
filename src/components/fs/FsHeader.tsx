import { useId } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { periodLine, unitLine, type FsPeriod } from '@/lib/fs';

const OPINION: Record<string, string> = {
  unmodified: 'unmodified opinion',
  qualified: 'qualified opinion',
  adverse: 'adverse opinion',
  disclaimer: 'disclaimer of opinion',
};

/**
 * The statement's heading block (PRD §A7): the company, the statement title in
 * both languages, the FS's own period and unit lines, the auditor and opinion
 * in one line, a company picker and one search box.
 */
export function FsHeader({
  period,
  companies,
  onCompany,
  titleId,
  titleEn,
  pointInTime,
  search,
  onSearch,
}: {
  period: FsPeriod;
  companies: Array<{ id: string; name: string }>;
  onCompany: (companyId: string) => void;
  titleId: string;
  titleEn: string;
  pointInTime: boolean;
  search: string;
  onSearch: (value: string) => void;
}) {
  const pickerId = useId();
  const searchId = useId();
  const date = periodLine(period.period_end, pointInTime);
  const unit = unitLine(period.unit, period.currency);
  const audit = [
    period.auditor && `Audited by ${period.auditor}`,
    period.auditor_report_no && `report ${period.auditor_report_no}`,
    period.auditor_opinion && (OPINION[period.auditor_opinion] ?? `${period.auditor_opinion} opinion`),
  ].filter(Boolean);

  return (
    <header className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{period.fs_company.legal_name}</p>
          <h1 className="text-2xl font-bold md:text-3xl">{titleId}</h1>
          <p className="text-base text-muted-foreground">{titleEn}</p>
        </div>
        <div className="shrink-0">
          <label htmlFor={pickerId} className="mb-1 block text-xs font-medium text-muted-foreground">
            Company
          </label>
          <select
            id={pickerId}
            value={period.company_id}
            onChange={(e) => onCompany(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-0.5 text-sm text-muted-foreground">
        <p>
          {date.id} / {date.en}
        </p>
        <p>
          {unit.id} / {unit.en}
        </p>
        {audit.length > 0 && <p>{audit.join(' · ')}</p>}
      </div>
      <div className="max-w-md">
        <label htmlFor={searchId} className="sr-only">
          Search line items
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id={searchId}
            type="search"
            placeholder="Search line items or notes"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="border-border bg-background pl-10"
          />
        </div>
      </div>
    </header>
  );
}
