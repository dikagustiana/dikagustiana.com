/**
 * The link register: how one sub-industry feeds another.
 *
 * PROPOSAL v3.1, pending owner approval and FSRE P-2.
 *
 * Data: src/data/finance-in-action/links.json. A link is MEASURED only when
 * both `costShare` and `demandShare` carry a value and a source (constraint
 * 10); otherwise it is drawn dashed and labelled "expected, not measured", and
 * no line weight is ever derived from a placeholder.
 */

export interface LinkIntensity {
  /** For example tonnes of coal per tonne of cement. */
  value: number;
  unit: string;
  period: string;
  source: string;
}

export interface LinkShare {
  /** A fraction: 0,25 is a quarter. */
  value: number;
  period: string;
  source: string;
}

export interface LinkPassThrough {
  estimate: number;
  low: number;
  high: number;
  quarters: number;
  source: string;
}

export interface IndustryLink {
  id: string;
  /** FSRE sub-industry codes. */
  from: string;
  to: string;
  whatFlows: string;
  driverFrom: string;
  driverTo: string;
  intensity: LinkIntensity | null;
  /** Share of the downstream cost of revenue that is this input. */
  costShare: LinkShare | null;
  /** Share of the upstream sales volume that goes to the downstream industry. */
  demandShare: LinkShare | null;
  passThrough: LinkPassThrough | null;
  caveat?: string;
  /**
   * PRD D-C1 (chain view, 22 October 2026): where this input sits in each
   * downstream company's unit economics. Ticker → the `unitEconomics.lines[].id`
   * of that company's line that carries this input. Site data, not the package
   * contract. A ticker with no loaded package is not yet published: it is
   * skipped by validation and shows nothing on screen. A line id that does not
   * resolve against a loaded package is reported by validation
   * (validateLinkRegister) and ignored on screen, never guessed.
   */
  downstreamLines?: Record<string, string>;
}

const sourced = (s: { source: string } | null): boolean => !!s && s.source.trim() !== '';

/** Constraint 10: both weights present, each with a source. */
export function isMeasured(link: IndustryLink): boolean {
  return sourced(link.costShare) && sourced(link.demandShare);
}
