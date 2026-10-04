/**
 * Download .xlsx, the model page's one primary action (brief §5.3, §5.7). The
 * export module, and ExcelJS inside it, load only when the button is pressed.
 */
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/lib/finance-in-action/copy';
import type { ModelView } from './useModelView';

export function DownloadButton({ view }: { view: ModelView }) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const onClick = async () => {
    setState('busy');
    try {
      const { downloadWorkbook } = await import('@/lib/finance-in-action/export/xlsx');
      await downloadWorkbook({ pkg: view.pkg, wb: view.wb, values: view.values, edits: view.edits });
      setState('idle');
    } catch {
      setState('failed');
    }
  };
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button type="button" onClick={onClick} disabled={state === 'busy'} className="h-11">
        <Download aria-hidden="true" />
        {state === 'busy' ? COPY.downloading : COPY.download}
      </Button>
      <span role="status" className="text-xs text-destructive">
        {state === 'failed' ? 'The workbook could not be built in this browser.' : ''}
      </span>
    </span>
  );
}
