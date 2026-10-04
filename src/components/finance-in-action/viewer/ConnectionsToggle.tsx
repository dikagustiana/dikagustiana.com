/**
 * The Connections lens, drawn as a switch with its state in words.
 *
 * Built on the same Radix primitive as ui/switch, with the same look but no
 * transition: the one-time flash after an edit is the section's only
 * animation (brief §5.6).
 */
import { useId } from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { COPY } from '@/lib/finance-in-action/copy';

export function ConnectionsToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const id = useId();
  return (
    <div className="inline-flex min-h-11 items-center gap-1">
      <SwitchPrimitives.Root
        id={id}
        checked={on}
        onCheckedChange={onChange}
        className="group inline-flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent bg-input group-data-[state=checked]:bg-primary">
          <SwitchPrimitives.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
        </span>
      </SwitchPrimitives.Root>
      <label htmlFor={id} className="cursor-pointer select-none text-sm font-medium text-foreground">
        {on ? COPY.connectionsOn : COPY.connectionsOff}
      </label>
    </div>
  );
}
