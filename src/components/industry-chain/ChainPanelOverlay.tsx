import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useMemo, type ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ChainPanelOverlayProps {
  open: boolean;
  anchor: Element | null;
  onClose: () => void;
  children: ReactNode;
}

/** Attach detail to its mark on a wide plate; use a bottom sheet on the column. */
export function ChainPanelOverlay({ open, anchor, onClose, children }: ChainPanelOverlayProps) {
  const narrow = useMediaQuery('(max-width: 1279px)', false);
  const virtualRef = useMemo(
    () => ({ current: anchor && 'getBoundingClientRect' in anchor ? anchor : null }),
    [anchor],
  );

  if (narrow || typeof ResizeObserver === 'undefined' || !anchor) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-y-auto rounded-t-xl border border-border bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DialogPrimitive.Title className="sr-only">Industry-chain detail</DialogPrimitive.Title>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <PopoverPrimitive.Anchor virtualRef={virtualRef} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="center"
          sideOffset={14}
          collisionPadding={20}
          avoidCollisions
          aria-describedby={undefined}
          className="z-50 max-h-[min(72vh,42rem)] w-[min(31rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-border bg-background p-5 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {children}
          <PopoverPrimitive.Arrow className="fill-border" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
