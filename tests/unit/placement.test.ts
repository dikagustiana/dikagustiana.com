import { describe, it, expect } from 'vitest';
import {
  derivePhase,
  resolvePlacementFields,
  buildCanonicalUrl,
  isReachable,
} from '@/domains/writing/schema/placement';
import { NEXT_BIG_THING_THEMES } from '@/config/nextBigThingThemes';

describe('derivePhase', () => {
  it('strips the section prefix from a category slug', () => {
    expect(derivePhase('green-transition', 'green-transition-where-we-are-now')).toBe('where-we-are-now');
    expect(derivePhase('critical-thinking', 'critical-thinking-before-we-go-far')).toBe('before-we-go-far');
  });
  it('maps the live next-big-thing category slugs to the theme ids the reader filters on', () => {
    // Written out, not derived: these are the category rows in the database the site offers. Society and
    // Governance still have rows, retired on 2026-10-24 (nextBigThingThemes.ts), and still derive.
    for (const retired of ['society', 'governance']) expect(derivePhase('next-big-thing', `next-big-thing-${retired}`)).toBe(retired);
    // development-finance: the former section, a theme since 2026-10-24 (migration 20261024185538).
    const themes = ['technology', 'economy', 'environment', 'growth', 'development-finance'];
    for (const theme of themes) {
      expect(derivePhase('next-big-thing', `next-big-thing-${theme}`)).toBe(theme);
    }
    // Tied to the frontend list, so a theme cannot be added to one without the
    // other (a new theme also needs its category row — a migration).
    expect(themes).toHaveLength(NEXT_BIG_THING_THEMES.length);
    expect(new Set(themes)).toEqual(new Set(NEXT_BIG_THING_THEMES.map(t => t.id)));
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
  it('finance via module → three segments, module NOT in the address', () => {
    expect(
      buildCanonicalUrl({
        sectionSlug: 'finance',
        slug: 'wacc',
        moduleId: 'm1',
        moduleTrackSlug: 'fundamentals',
        moduleSlug: 'cost-of-capital',
      }),
    ).toBe('/finance/fundamentals/wacc');
  });

  it('finance without module uses the row track; no track → universal route', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'finance', slug: 'wacc', financeSection: 'analytics' }))
      .toBe('/finance/analytics/wacc');
    // `/finance/<slug>` is the TRACK INDEX route — emitting it for an essay
    // was a dead link. The universal route resolves placement-less essays.
    expect(buildCanonicalUrl({ sectionSlug: 'finance', slug: 'wacc' })).toBe('/essays/wacc');
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

  it('critical-thinking → /foundations-of-knowing/:part/:slug', () => {
    expect(
      buildCanonicalUrl({ sectionSlug: 'critical-thinking', slug: 'c', categorySlug: 'critical-thinking-evidence-and-sources' }),
    ).toBe('/foundations-of-knowing/evidence-and-sources/c');
  });

  it('critical-thinking with no part → the universal route (agrees with essayUrl)', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'critical-thinking', slug: 'c' })).toBe('/essays/c');
  });

  it('next-big-thing with a category → /the-next-big-thing/:theme/:slug (agrees with essayUrl)', () => {
    expect(
      buildCanonicalUrl({
        sectionSlug: 'next-big-thing',
        slug: 'agi',
        categorySlug: 'next-big-thing-technology',
      }),
    ).toBe('/the-next-big-thing/technology/agi');
  });

  it('next-big-thing without a category keeps the two-segment resolver shape', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'next-big-thing', slug: 'agi' })).toBe('/the-next-big-thing/agi');
  });

  it('returns empty string without a slug', () => {
    expect(buildCanonicalUrl({ sectionSlug: 'finance', slug: '' })).toBe('');
  });
});

describe('the retired Next Big Thing themes (docs/prd/2026-10-fia-fixes item 13)', () => {
  it('are not listed anywhere the site derives its themes from', () => {
    const ids = NEXT_BIG_THING_THEMES.map((t) => t.id as string);
    expect(ids).not.toContain('society');
    expect(ids).not.toContain('governance');
    expect(ids).toEqual(['technology', 'economy', 'environment', 'growth', 'development-finance']);
  });
});
