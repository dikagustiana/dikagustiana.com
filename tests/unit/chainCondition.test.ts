import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  BASIS,
  BANDS,
  CHAIN_COPY,
  CONDITION_AS_OF,
  LEVERS,
  MECHANISMS,
  SHIFTS,
  SHIFT_BY_ID,
  STAGES,
  STATUS,
  STATUS_NOTE,
  TENSIONS,
  drawnAtOverview,
  isWritten,
  markedTargets,
  type LensId,
} from '@/data/industryChain';

const LENSES: LensId[] = ['economy', 'finance'];
const allConditions = () =>
  SHIFTS.flatMap((shift) =>
    markedTargets(shift.id).map((t) => ({ shift: shift.id, id: t.id, condition: t.condition!, target: t })),
  );

/**
 * The condition layer claims things about the world. These pin the rules that
 * keep a scenario from reading as a finding, and a mark from claiming more
 * than the evidence behind it.
 */

describe('what a status is', () => {
  it('says what dimension each status reads on, not just what it means', () => {
    for (const status of Object.values(STATUS)) {
      expect(status.means.length, status.id).toBeGreaterThan(20);
      expect(status.reads.length, status.id).toBeGreaterThan(20);
    }
  });

  it('does not treat the three as exclusive values of one dial', () => {
    expect(STATUS_NOTE).toMatch(/not exclusive|not a scale/);
    expect(STATUS.stuck.reads.toLowerCase()).toContain('obstacle');
    expect(STATUS.moving.reads.toLowerCase()).toContain('activity');
    expect(STATUS.unpriced.reads.toLowerCase()).toContain('payment condition');
  });

  it('no longer says an unpriced joint does not exist economically', () => {
    // "economically it does not exist" contradicted the map's own note that
    // informal activity is inside the national-accounts production boundary,
    // and it wrote a great deal of real work out of the economy on the way.
    const unpriced = `${STATUS.unpriced.means} ${STATUS.unpriced.reads}`.toLowerCase();
    expect(unpriced).not.toContain('does not exist');
    expect(unpriced).toContain('production boundary');
  });
});

describe('scenario against finding', () => {
  it('makes every marked element declare which it is', () => {
    for (const { shift, id, condition } of allConditions()) {
      expect(condition.basis, `${shift} ${id}`).toBeTruthy();
      expect(BASIS[condition.basis]).toBeTruthy();
    }
  });

  it('calls a mark assessed only when its four lines are written in both voices', () => {
    for (const { shift, id, condition } of allConditions()) {
      if (condition.basis !== 'assessed') continue;
      for (const lens of LENSES) {
        for (const [name, note] of Object.entries({
          now: condition.now,
          holds: condition.holds,
          action: condition.action,
          funds: condition.funds,
        })) {
          expect(isWritten(note, lens), `${shift} ${id} ${name} at ${lens}`).toBe(true);
        }
      }
    }
  });

  it('backs an assessed mark with at least one essay', () => {
    for (const { shift, id, condition, target } of allConditions()) {
      if (condition.basis !== 'assessed') continue;
      expect(target.articles?.length, `${shift} ${id}`).toBeGreaterThan(0);
    }
  });

  it('has at least one assessed mark and is honest that the rest are not', () => {
    const bases = allConditions().map((c) => c.condition.basis);
    expect(bases).toContain('assessed');
    expect(bases).toContain('scenario');
    expect(BASIS.scenario.means.toLowerCase()).toMatch(/not a finding|unwritten/);
  });

  it('dates the condition layer', () => {
    expect(CONDITION_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CHAIN_COPY.conditionNote(CONDITION_AS_OF)).toContain(CONDITION_AS_OF);
  });
});

describe('the levers are what the map can draw, not a theory', () => {
  it('names mechanisms the three levers cannot express', () => {
    for (const key of ['capacity', 'contract', 'operating-rights', 'risk-allocation'] as const) {
      expect(MECHANISMS[key].means.length, key).toBeGreaterThan(30);
    }
    expect(Object.keys(LEVERS)).toHaveLength(3);
  });

  it('lets a reading say when the lever is not the mechanism', () => {
    // The point of the field: the map can only draw a repricing, so without
    // this a capacity or contract problem is silently relabelled as one.
    const withMechanism = allConditions().filter((c) => c.condition.mechanism && c.condition.mechanism !== 'price');
    expect(withMechanism.length).toBeGreaterThan(0);
    for (const { condition } of withMechanism) {
      expect(MECHANISMS[condition.mechanism!]).toBeTruthy();
    }
  });

  it('does not say capacity is the same thing as a price', () => {
    expect(MECHANISMS.capacity.means).toMatch(/cannot substitute/);
    expect(MECHANISMS.contract.means.toLowerCase()).toContain('inflexibility is not scarcity');
    expect(MECHANISMS['risk-allocation'].means.toLowerCase()).toContain('does not disappear');
  });
});

describe('energy is not one thing', () => {
  const energy = BANDS.find((b) => b.id === 'band-energy')!;

  it('separates generation, network capacity and connection', () => {
    const labels = (energy.shortages ?? []).map((s) => s.label);
    expect(labels).toEqual(['Generation', 'Network capacity', 'Connection']);
  });

  /**
   * Energy is an argument this site turns on, and the entrance most readers
   * meet used to show it as nothing at all. It is now a band with a door at
   * BOTH levels, not a name in a description: the overview draws the same
   * seven layers the detail does.
   */
  it('is a layer with a door at the overview, not only on the detail', () => {
    expect(drawnAtOverview('band-energy')).toBe(true);
    const overviewSrc = readFileSync(
      resolve(process.cwd(), 'src/components/industry-chain/ChainPlateSvg.tsx'),
      'utf8',
    ).split('export function ChainPlateCompact')[1];
    expect(overviewSrc).toContain('<BandHit id="band-energy"');
    expect(overviewSrc).toContain('<LayerSwitch id="band-energy"');
    expect(overviewSrc.match(/cp-energy-in" data-for="/g) ?? []).toHaveLength(STAGES.length);
  });
});

describe('the shifts', () => {
  it('carries the employment criterion on the shift whose motive it is', () => {
    const criterion = SHIFT_BY_ID.reindustrialisation.criterion!;
    expect(criterion.means.toLowerCase()).toContain('durable');
    // The four distinctions a value-added number cannot make.
    expect(criterion.means.toLowerCase()).toContain('construction');
    expect(criterion.means.toLowerCase()).toContain('gross');
    expect(criterion.means.toLowerCase()).toMatch(/public cost/);
    // A case where every arrow points the right way and the motive still fails.
    expect(criterion.counterexample.toLowerCase()).toContain('hypothetical');
    // The trade-off is prepared, not answered.
    expect(criterion.unresolved.toLowerCase()).toMatch(/not made here|decision/);
  });

  it('does not let a border cut stand in for reindustrialisation', () => {
    expect(SHIFT_BY_ID.reindustrialisation.read.economy.toLowerCase()).toMatch(/one mechanism|wider agenda/);
  });

  it('writes out where the two shifts pull against each other', () => {
    // Showing the overlays one at a time keeps their mechanisms separable and
    // explains no conflict; a reader who saw each alone could believe both run
    // at full strength.
    expect(TENSIONS.length).toBeGreaterThan(0);
    for (const t of TENSIONS) {
      for (const lens of LENSES) expect(t.note[lens].length, `${t.id} ${lens}`).toBeGreaterThan(60);
    }
  });
});

describe('the map does not teach a category error', () => {
  /**
   * The line that carried this correction was the standfirst, which the owner
   * replaced with one of their own. The correction is not lost — it moved to
   * `basis`, which is where a reader who asks what value added IS now finds
   * it — and no copy on the map may re-teach the error.
   */
  it('keeps margin and value added apart, and lets no line on the map re-join them', () => {
    expect(CHAIN_COPY.basis.toLowerCase()).toContain('value added');
    expect(CHAIN_COPY.basis.toLowerCase()).toContain('not gross profit');
    expect(JSON.stringify(CHAIN_COPY).toLowerCase()).not.toMatch(/add them up and you (have|get) an economy/);
  });

  it('says a mark number is a position on the drawing, not a ranking', () => {
    expect(CHAIN_COPY.markOrderNote.toLowerCase()).toMatch(/not a priority|not a ranking/);
    expect(CHAIN_COPY.markOrderNote.toLowerCase()).toContain('renumber');
  });

  it('names the three funding roles rather than one', () => {
    const roles = CHAIN_COPY.panel.fundsRoles.toLowerCase();
    expect(roles).toContain('capital provider');
    expect(roles).toContain('payer');
    expect(roles).toContain('loss bearer');
    expect(roles).toContain('does not remove it');
  });
});

describe('no escape sequence reaches a reader', () => {
  it('never leaves a \\uXXXX literal in JSX text', async () => {
    // JSX children are raw text, not a string literal, so `·` written
    // between tags renders as those six characters. It shipped once, in the
    // separator of the tensions list, and was visible only in a screenshot.
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (name.endsWith('.tsx')) out.push(full);
      }
      return out;
    };
    const offenders: string[] = [];
    for (const file of walk('src')) {
      readFileSync(file, 'utf-8')
        .split('\n')
        .forEach((line, i) => {
          const stripped = line.trimStart();
          if (stripped.startsWith('*') || stripped.startsWith('//') || stripped.startsWith('/*')) return;
          // A real escape lives inside quotes or a template; flag one that has
          // no open quote before it on the line.
          for (const match of line.matchAll(/\\u[0-9a-fA-F]{4}/g)) {
            const before = line.slice(0, match.index);
            const open = (s: string) => (before.split(s).length - 1) % 2 === 1;
            if (!open("'") && !open('"') && !open('`')) offenders.push(`${file}:${i + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});
