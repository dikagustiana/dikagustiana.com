/** The Connections lens, drawn as a switch with its state in words. */
import { useId } from 'react';
import { Switch } from '@/components/ui/switch';
import { COPY } from '@/lib/finance-in-action/copy';

export function ConnectionsToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const id = useId();
  return (
    <div className="inline-flex min-h-11 items-center gap-2">
      <Switch id={id} checked={on} onCheckedChange={onChange} />
      <label htmlFor={id} className="cursor-pointer select-none text-sm font-medium text-foreground">
        {on ? COPY.connectionsOn : COPY.connectionsOff}
      </label>
    </div>
  );
}
