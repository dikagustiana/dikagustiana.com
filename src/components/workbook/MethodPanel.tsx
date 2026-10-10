/**
 * The working paper's Method panel (PRD site sweep 2026-10, R4.6): where the workbook comes from, the years
 * it covers, that every figure is Excel's own (R4.3), the sheets D9 leaves out and the error cells D8 keeps,
 * and the download. It reads nothing from the workbook JSON (src/lib/workbook/method.ts holds both lists), so
 * it stands when the viewer or the JSON does not load (R4.7).
 */
import { Download } from 'lucide-react';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { ERROR_CELLS, EXCLUDED_SHEETS, WORKBOOK_XLSX_URL } from '@/lib/workbook/method';

const errorCount = ERROR_CELLS.reduce((n, group) => n + group.cells.length, 0);

export function MethodPanel() {
  return (
    <div className="mt-8 max-w-3xl">
      <h3 className="text-base font-semibold text-foreground">{COPY.method}</h3>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-border">
        <li>{COPY.methodSource}</li>
        <li>{COPY.methodYears}</li>
        <li>{COPY.methodCached}</li>
        <li>
          {COPY.methodExcluded}{' '}
          {EXCLUDED_SHEETS.map((s, i) => (
            <span key={s.name}>
              <span className="text-foreground">{s.name}</span> ({COPY.excludedReason[s.reason]}){i < EXCLUDED_SHEETS.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </li>
        <li>
          {COPY.methodErrors(errorCount)}
          <ul className="mt-1 space-y-1">
            {ERROR_CELLS.map((group) => (
              <li key={group.sheet}>
                <span className="text-foreground">{group.sheet}</span>, <span className="tabular-nums">{group.code}</span>:{' '}
                <span className="tabular-nums">{group.cells.join(', ')}</span>.
              </li>
            ))}
          </ul>
        </li>
        <li>{COPY.methodHidden}</li>
        <li>{COPY.methodNumbers}</li>
      </ul>
      <a
        href={WORKBOOK_XLSX_URL}
        download={COPY.downloadName}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-input bg-popover px-4 text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {COPY.download}
      </a>
    </div>
  );
}
