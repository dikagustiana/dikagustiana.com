import { describe, it, expect } from 'vitest';
import {
  derivePhase,
  resolvePlacementFields,
  buildCanonicalUrl,
  isReachable,
} from '@/domains/writing/schema/placement';

describe('derivePhase', () => {
  it('strips the section prefix from a category slug', () => {
    expect(derivePhase('green-transition', 'green-transition-where-we-are-now')).toBe('where-we-are-now');
    expect(derivePhase('critical-thinking', 'critical-thinking-clarify')).toBe('clarify');
  });
  it('returns the slug unchanged when there is no prefix', () => {
    expect(derivePhase('development-finance', 'sovereign-wealth-funds')).toBe('sovereign-wealth-funds');
  });
  it('returns null when no category', () => {
    expect(derivePhase('finance', null)).toBeNull();
    expect(derivePhase('finance', undefined)).toBeNull();
  });
});

describe('resolvePlacementFields — section isolation', () => {
  it('finance keeps module fields, drops accounting fields', () => {
    const f = resolvePlacementFields({
      sectionSlug: 'finance',
      slug: 'wacc',
      categorySlug: 'finance-fundamentals',
      moduleId: 'mod-1',
      financeSection: 'fundamentals',
      financeOrder: 3,
      lessonType: 'concept',
      fsliSlug: 'cash-equivalents',
      topic: 'psak-principles',
    });
    expect(f.module_id).toBe('mod-1');
    expect(f.finance_section).toBe('fundamentals');
    expect(f.finance_order).toBe(3);
    expect(f.lesson_type).toBe('concept');
    // accounting-only fields must be cleared on a finance essay
    expect(f.fsli_slug).toBeNull();
    expect(f.topic).toBeNull();
  });

  it('accounting keeps fsli/topic, drops finance fields', () => {
    const f = resolvePlacementFields({
      sectionSlug: 'accounting',
      slug: 'cash-deep-dive',
      fsliSlug: 'cash-equivalents',
      topic: 'psak-principles',
      moduleId: 'mod-1',
      financeOrder: 5,
    });
    expect(f.fsli_slug).toBe('cash-equivalents');
    expect(f.topic).toBe('psak-principles');
    expect(f.module_id).toBeNull();
    expect(f.finance_section).toBeNull();
    expect(f.finance_order).toBeNull();
    expect(f.lesson_type).toBeNull();
  });

  it('green-transition derives phase and clears finance/accounting fields', () => {
    const f = resolvePlacementFields({
      sectionSlug: 'green-transition',
      slug: 'grid-buildout',
      categorySlug: 'green-transition-where-we-are-now',
      moduleId: 'mod-9',
    });
    expect(f.phase).toBe('where-we-are-now');
    expect(f.module_id).toBeNull();
    expect(f.fsli_slug).toBeNull();
  });
});

describe('buildCanonicalUrl — placement maps to the real public route', () => {
  it('finance via module → /finance/:track/:module/:slug', () => {
    expect(
      buildCanonicalUrl({
        sectionSlug: 'finance',
        slug: 'wacc',
        moduleId: 'm1',
        moduleTrackSlug: 'fundamentals',
        moduleSlug: 'cost-of-capital',
      }),
    ).toBe('/finance/fundamentals/cost-of-capital/wacc');
  });

  it('finance without module falls back to track or flat', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'finance', slug: 'wacc', financeSection: 'analytics' }))
      .toBe('/finance/analytics/wacc');
    expect(buildCanonicalUrl({ sectionSlug: 'finance', slug: 'wacc' })).toBe('/finance/wacc');
  });

  it('accounting via FSLI leaf → /accounting/fsli/:slug', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'accounting', slug: 'x', fsliSlug: 'cash-equivalents' }))
      .toBe('/accounting/fsli/cash-equivalents');
  });

  it('accounting via consolidation topic → /accounting/consolidation/:topic', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'accounting', slug: 'x', topic: 'elimination-pnl' }))
      .toBe('/accounting/consolidation/elimination-pnl');
  });

  it('accounting with no leaf selected is unreachable (empty url)', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'accounting', slug: 'x' })).toBe('');
    expect(isReachable({ sectionSlug: 'accounting', slug: 'x' })).toBe(false);
    expect(isReachable({ sectionSlug: 'accounting', slug: 'x', fsliSlug: 'cash-equivalents' })).toBe(true);
  });

  it('green-transition → /green-transition/:phase/:slug', () => {
    expect(
      buildCanonicalUrl({ sectionSlug: 'green-transition', slug: 'g', categorySlug: 'green-transition-future' }),
    ).toBe('/green-transition/future/g');
  });

  it('development-finance includes the phase segment (was previously dropped)', () => {
    expect(
      buildCanonicalUrl({ sectionSlug: 'development-finance', slug: 'swf', categorySlug: 'sovereign-wealth-funds' }),
    ).toBe('/development-finance/sovereign-wealth-funds/swf');
  });

  it('critical-thinking → /critical-thinking-research/:phase/:slug', () => {
    expect(
      buildCanonicalUrl({ sectionSlug: 'critical-thinking', slug: 'c', categorySlug: 'critical-thinking-analyze' }),
    ).toBe('/critical-thinking-research/analyze/c');
  });

  it('next-big-thing → /the-next-big-thing/:slug', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'next-big-thing', slug: 'agi' })).toBe('/the-next-big-thing/agi');
  });

  it('returns empty string without a slug', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'finance', slug: '' })).toBe('');
  });
});
