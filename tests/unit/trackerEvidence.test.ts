import { describe, it, expect } from 'vitest';
import {
  trackerIssues,
  SECTION_META,
  READING_META,
  TRACKER_COVERAGE,
  EVIDENCE_LABEL,
  EVIDENCE_MEANS,
  type TrackerEntry,
  type Correction,
} from '@/data/trackerIssues';

/**
 * The tracker's evidence contract.
 *
 * These are not tests of copy. Each one pins a rule that, when it broke,
 * produced the specific failure the 2026-09 audit found: an unsourced
 * assertion reading as reporting, a contradicted premise standing unqualified,
 * or a correction that quietly replaced the text it corrected.
 */

const allEntries = (): { issue: string; section: string; entry: TrackerEntry }[] =>
  trackerIssues.flatMap((issue) =>
    SECTION_META.flatMap((meta) =>
      (issue.sections[meta.key] ?? []).map((entry) => ({ issue: issue.slug, section: meta.key, entry })),
    ),
  );

const allCorrections = (): { where: string; correction: Correction; against: string }[] => [
  ...trackerIssues.flatMap((issue) =>
    (issue.corrections ?? []).map((correction) => ({
      where: issue.slug,
      correction,
      against: issue.publishedAt,
    })),
  ),
  ...allEntries().flatMap(({ issue, entry }) =>
    (entry.corrections ?? []).map((correction) => ({
      where: `${issue}/${entry.slug}`,
      correction,
      against: entry.publishedAt,
    })),
  ),
];

describe('tracker evidence status', () => {
  it('gives every entry an explicit evidence status', () => {
    // An absent status is what let unsourced assertions read as reporting.
    const missing = allEntries().filter(({ entry }) => !entry.evidence);
    expect(missing.map((m) => `${m.issue}/${m.entry.slug}`)).toEqual([]);
  });

  it('labels and explains every status it can render', () => {
    for (const { entry } of allEntries()) {
      const status = entry.evidence!;
      expect(EVIDENCE_LABEL[status]).toBeTruthy();
      expect(EVIDENCE_MEANS[status]).toBeTruthy();
    }
  });

  it('distinguishes unsupported from contradicted', () => {
    // Unchecked is not false. The two statuses must not collapse into one.
    const statuses = new Set(allEntries().map(({ entry }) => entry.evidence));
    expect(statuses.has('unsupported')).toBe(true);
    expect(statuses.has('contradicted')).toBe(true);
    // ...and a corrected archive is not a discredited one: at least one entry
    // survived its source check.
    expect(statuses.has('verified')).toBe(true);
  });

  it('backs every contradicted entry with a correction and a named source', () => {
    for (const { issue, entry } of allEntries()) {
      if (entry.evidence !== 'contradicted') continue;
      expect(entry.corrections?.length, `${issue}/${entry.slug} corrections`).toBeGreaterThan(0);
      expect(entry.sources?.length, `${issue}/${entry.slug} sources`).toBeGreaterThan(0);
    }
  });

  it('backs every verified entry with a named source', () => {
    for (const { issue, entry } of allEntries()) {
      if (entry.evidence !== 'verified') continue;
      expect(entry.sources?.length, `${issue}/${entry.slug}`).toBeGreaterThan(0);
    }
  });
});

describe('corrections', () => {
  it('exist', () => {
    expect(allCorrections().length).toBeGreaterThan(0);
  });

  it('are never backdated onto the entry they correct', () => {
    for (const { where, correction, against } of allCorrections()) {
      expect(
        Date.parse(correction.issuedAt),
        `${where}: correction issued ${correction.issuedAt} against text published ${against}`,
      ).toBeGreaterThan(Date.parse(against));
    }
  });

  it('always say what the correction does to the conclusion', () => {
    // A correction that states a fact and stops leaves the reader to guess
    // whether the argument survived. That guess is the author's job.
    for (const { where, correction } of allCorrections()) {
      expect(correction.claim.trim().length, `${where} claim`).toBeGreaterThan(20);
      expect(correction.correction.trim().length, `${where} correction`).toBeGreaterThan(20);
      expect(correction.effect.trim().length, `${where} effect`).toBeGreaterThan(20);
    }
  });

  it('cite a dated primary source wherever they correct a matter of fact', () => {
    for (const { where, correction } of allCorrections()) {
      // The one correction that cites nothing is the A06 narrowing, which
      // withdraws an over-claim rather than asserting a new fact.
      for (const source of correction.sources) {
        expect(source.url, where).toMatch(/^https:\/\//);
        expect(source.publishedAt, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(source.supports.trim().length, `${where} supports`).toBeGreaterThan(20);
      }
    }
  });
});

describe('the RUPTL premise', () => {
  const entry = trackerIssues
    .find((i) => i.slug === 'q2-2025')!
    .sections.policyMovement.find((e) => e.slug === 'geothermal-pricing-framework-revision')!;

  it('still carries its original text, unedited', () => {
    // The body is the historical record. Silently rewriting it is the failure
    // this whole mechanism exists to avoid.
    expect(entry.body).toContain('No material progress was observed on the long-awaited RUPTL update');
  });

  it('no longer stands unqualified', () => {
    expect(entry.evidence).toBe('contradicted');
    const correction = entry.corrections![0];
    expect(correction.correction).toContain('26 May 2025');
    expect(correction.sources.some((s) => s.url.includes('esdm.go.id'))).toBe(true);
  });

  it('does not overclaim in the other direction', () => {
    // Approval of a plan is not procurement. The correction must not turn one
    // wrong certainty into another.
    expect(entry.corrections![0].effect).toMatch(/not establish|does NOT establish/);
  });
});

describe('the quarterly label', () => {
  it('defines what each reading claims and what it excludes', () => {
    for (const issue of trackerIssues) {
      const meta = READING_META[issue.directionalReading];
      expect(meta, issue.slug).toBeTruthy();
      expect(meta.means.length).toBeGreaterThan(20);
      expect(meta.excludes.length).toBeGreaterThan(20);
    }
  });

  it('says that divergence is not a direction', () => {
    expect(READING_META.Fragmenting.excludes).toMatch(/not a direction/i);
  });

  it('states what every issue was read from', () => {
    for (const issue of trackerIssues) {
      expect(issue.readingBasis, issue.slug).toBeTruthy();
    }
  });

  it('no longer calls one posture the only rational one', () => {
    const implication = trackerIssues
      .find((i) => i.slug === 'q2-2025')!
      .sections.strategicImplication[0];
    // The sentence stays in the body as published; the withdrawal is the
    // correction beside it.
    expect(implication.corrections?.length).toBeGreaterThan(0);
    expect(implication.corrections![0].effect).toMatch(/withdrawn/);
  });
});

describe('coverage', () => {
  it('names the newest issue as the end of coverage', () => {
    expect(TRACKER_COVERAGE.coverageEndsWith).toBe(trackerIssues[0].label);
  });

  it('is paused while no issue follows the newest one', () => {
    expect(TRACKER_COVERAGE.state).toBe('paused');
  });

  it('dates its own last substantive update after the newest issue', () => {
    expect(Date.parse(TRACKER_COVERAGE.lastSubstantiveUpdate)).toBeGreaterThan(
      Date.parse(trackerIssues[0].publishedAt),
    );
  });
});
