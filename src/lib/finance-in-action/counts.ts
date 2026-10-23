/** The counts on a stage card of the index (brief §5.1). */
import { groupAlongChain, type PositionGroup, type Registry } from './registry';
import { COPY } from './copy';
import { formatNumber } from './format';

export function countsLine(group: PositionGroup): string {
  const subs = group.subIndustries.length;
  const companies = group.subIndustries.reduce((n, s) => n + s.companies.length, 0);
  if (!subs) return COPY.noModels;
  const subWord = subs === 1 ? 'sub-industry' : 'sub-industries';
  const coWord = companies === 1 ? 'company' : 'companies';
  return `${formatNumber(subs)} ${subWord}, ${formatNumber(companies)} ${coWord}`;
}

export function publishedLine(group: PositionGroup): string | null {
  const companies = group.subIndustries.flatMap((s) => s.companies);
  if (!companies.length) return null;
  const published = companies.filter((c) => c.status === 'published').length;
  const preview = companies.filter((c) => c.status === 'preview').length;
  const parts = [`${formatNumber(published)} published`];
  if (preview) parts.push(`${formatNumber(preview)} preview`);
  return parts.join(', ');
}


/** A chain position's companies on the slate, and how many of them are published. */
export interface PositionCount {
  companies: number;
  published: number;
}

export function positionCount(group: PositionGroup): PositionCount {
  const companies = group.subIndustries.flatMap((s) => s.companies);
  return { companies: companies.length, published: companies.filter((c) => c.status === 'published').length };
}

/** The count on a stage pill: "4 · 0 published". */
export const pillCountLine = (c: PositionCount): string => `${formatNumber(c.companies)} · ${formatNumber(c.published)} published`;

/**
 * Every chain position's count, keyed by position id: the stage pills of the
 * index and the homepage chain map read the same numbers from here (K6).
 */
export function positionCounts(reg: Registry): Map<string, PositionCount> {
  return new Map(groupAlongChain(reg).map((g) => [g.position.id, positionCount(g)]));
}
