/**
 * Chain view, commit 2 (docs/company-models/chain-view, PRD D-C1): the link
 * register's `downstreamLines`, which names the downstream company's
 * unit-economics line that carries a link's input. It validates against the
 * schema; an entry whose ticker or line id does not resolve against a loaded
 * package is reported and ignored, never guessed. SYNTHETIC fixtures only.
 */
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';
import linkSchema from '@/lib/finance-in-action/contract/link-register.schema.json';
import type { IndustryLink } from '@/lib/finance-in-action/contract/links';
import { validateLinkRegister } from '@/lib/finance-in-action/contract/validate';
import { downstreamLine } from '@/lib/finance-in-action/links';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import links from '@/data/finance-in-action/links.json';
import syntheticLinks from '@/data/finance-in-action/fixtures/links.SYNTHETIC.json';

const validLinks = new Ajv({ allErrors: true, strict: false }).compile(linkSchema);
const reg = previewRegistry();
const syn = reg.links.find((l) => l.id === 'syn-coal-to-cement')!;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('downstreamLines in the link register', () => {
  it('validates against the schema, on the real register and the SYNTHETIC one', () => {
    expect(validLinks(links)).toBe(true);
    expect(validLinks(syntheticLinks)).toBe(true);
    expect((links as IndustryLink[]).find((l) => l.id === 'coal-to-cement')!.downstreamLines).toEqual({});
    expect(syn.downstreamLines).toEqual({ SCEM: 'fuel', XCEM: 'fuel' });
  });

  it('refuses a line id that is not a string, and a ticker that is not upper case', () => {
    const bad = clone(syntheticLinks) as unknown as Record<string, unknown>[];
    bad[0].downstreamLines = { SCEM: 3 };
    expect(validLinks(bad)).toBe(false);
    const lower = clone(syntheticLinks) as unknown as Record<string, unknown>[];
    lower[0].downstreamLines = { scem: 'fuel' };
    expect(validLinks(lower)).toBe(false);
  });

  it('resolves every SYNTHETIC entry against the loaded packages, so the preview reports nothing', () => {
    expect(reg.linkIssues).toEqual([]);
    expect(downstreamLine(reg, syn, 'SCEM')?.id).toBe('fuel');
    expect(downstreamLine(reg, syn, 'XCEM')?.id).toBe('fuel');
  });

  it('reports an unknown ticker, a ticker outside the downstream sub-industry, an unknown line and a line that cannot carry an input', () => {
    const link: IndustryLink = { ...syn, downstreamLines: { NOPE: 'fuel', SCOA: 'fuel', SCEM: 'kiln_gas', XCEM: 'gross_profit' } };
    const issues = validateLinkRegister([link], reg.packages);
    expect(issues.map((i) => i.path)).toEqual([
      'links.syn-coal-to-cement.downstreamLines.NOPE',
      'links.syn-coal-to-cement.downstreamLines.SCOA',
      'links.syn-coal-to-cement.downstreamLines.SCEM',
      'links.syn-coal-to-cement.downstreamLines.XCEM',
    ]);
    expect(issues[0].message).toMatch(/not a loaded package/);
    expect(issues[1].message).toMatch(/not in SYN-CEM/);
    expect(issues[2].message).toMatch(/no unit-economics line kiln_gas/);
    expect(issues[3].message).toMatch(/subtotal line/);
  });

  it('ignores an entry that does not resolve on screen, and never falls back to another line', () => {
    const link: IndustryLink = { ...syn, downstreamLines: { SCEM: 'kiln_gas', NOPE: 'fuel' } };
    expect(downstreamLine(reg, link, 'SCEM')).toBeNull();
    expect(downstreamLine(reg, link, 'NOPE')).toBeNull();
    expect(downstreamLine(reg, { ...syn, downstreamLines: undefined }, 'SCEM')).toBeNull();
  });
});
