/** Search by ticker or name, a Capital in Motion condition, and the status legend (brief §5.1). */
import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CapitalCondition } from '@/data/capitalConditions';
import { COPY } from '@/lib/finance-in-action/copy';
import { conditionCode } from '@/lib/finance-in-action/conditions';
import { StatusLegend } from './StatusMark';

export const ALL = 'all';

export function IndexFilters({
  query,
  onQuery,
  condition,
  onCondition,
  conditions,
}: {
  query: string;
  onQuery: (q: string) => void;
  condition: string;
  onCondition: (c: string) => void;
  conditions: CapitalCondition[];
}) {
  const searchId = useId();
  const conditionId = useId();
  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={searchId} className="text-sm font-medium text-foreground">
            {COPY.findCompany}
          </label>
          <Input
            id={searchId}
            type="search"
            value={query}
            placeholder={COPY.findPlaceholder}
            onChange={(e) => onQuery(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <label id={conditionId} className="text-sm font-medium text-foreground">
            {COPY.conditionFilter}
          </label>
          <Select value={condition} onValueChange={onCondition}>
            <SelectTrigger aria-labelledby={conditionId} className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{COPY.allConditions}</SelectItem>
              {conditions.map((c) => (
                <SelectItem key={c.number} value={String(c.number)}>
                  {conditionCode(c.number)} {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <StatusLegend title={COPY.statusLegend} />
    </div>
  );
}
