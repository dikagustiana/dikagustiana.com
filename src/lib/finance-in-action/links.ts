/** The link register, read from either end. */
import type { IndustryLink } from './contract/links';
import type { Registry } from './registry';

export const linksFrom = (reg: Registry, code: string): IndustryLink[] => reg.links.filter((l) => l.from === code);
export const linksTo = (reg: Registry, code: string): IndustryLink[] => reg.links.filter((l) => l.to === code);

/** Where the link card for a link opens: the index, lens on, that link selected. */
export function linkCardPath(link: IndustryLink): string {
  const params = new URLSearchParams({ connections: 'on', link: link.id });
  return `/finance/finance-in-action?${params.toString()}#links`;
}
