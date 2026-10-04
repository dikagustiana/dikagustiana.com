/**
 * The Finance in Action preview flag (constraint 3).
 *
 * True only when the build ran with VITE_FIA_PREVIEW=true. Routing decisions
 * read `__FIA_PREVIEW__` directly in App.tsx so the bundler can drop the
 * preview chunks; components that are already inside the preview read this.
 */
export const FIA_PREVIEW: boolean = __FIA_PREVIEW__;
