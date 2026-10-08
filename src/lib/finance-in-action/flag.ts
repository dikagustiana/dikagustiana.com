/**
 * The Finance in Action preview flag (constraint 3).
 *
 * True only when the build ran with VITE_FIA_PREVIEW=true. Routing decisions
 * read `__FIA_PREVIEW__` directly in App.tsx so the bundler can drop the
 * preview chunks; components that are already inside the preview read this.
 */
export const FIA_PREVIEW: boolean = __FIA_PREVIEW__;

/**
 * The production flag (PRD "FSRE publish path" O3): true only when the build
 * ran with VITE_FIA_LIVE=true, which the owner sets in Vercel after the
 * first real package is approved. App.tsx reads `__FIA_LIVE__` directly for
 * the same reason as above; the two flags together are not a build
 * (scripts/assert-no-synthetic.mjs refuses it).
 */
export const FIA_LIVE: boolean = __FIA_LIVE__;
