/**
 * What a Finance in Action page is given to draw: the registry, whether the
 * published read is still running or failed and why, and whether the
 * registry carries fixtures (the preview) or published models only (live).
 * The two hooks (usePreviewRegistry, useLiveRegistry) answer this shape; the
 * pages take the hook as a prop so neither page module imports the other's
 * data (preview.ts must not reach a live bundle).
 */
import type { PublishedFailureReason } from './published';
import type { Registry } from './registry';

export type PublishedState = 'loading' | 'ok' | 'error';

export interface PublishedFailure {
  reason: PublishedFailureReason;
  /** What to show a person debugging; never a count. */
  detail: string;
}

export interface RegistryState {
  reg: Registry;
  published: PublishedState;
  failure: PublishedFailure | null;
  /** True when the registry holds the SYNTHETIC fixtures beside anything published. */
  fixtures: boolean;
}

export type RegistryHook = () => RegistryState;
