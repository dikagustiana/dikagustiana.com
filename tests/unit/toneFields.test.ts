import { describe, it, expect } from 'vitest';
import {
  validateManagerFields,
  validateEconomistFields,
  validateEducatorFields,
  validateCoachFields,
  validateToneFields,
} from '@/lib/types/toneFields';

describe('validateManagerFields', () => {
  it('reports all missing fields for an empty object', () => {
    const { valid, missing } = validateManagerFields({});
    expect(valid).toBe(false);
    expect(missing).toContain('When You Need This');
    expect(missing).toContain('Procedure');
    expect(missing).toContain('Common Errors');
  });
  it('treats whitespace-only strings as missing', () => {
    const { valid } = validateManagerFields({
      whenYouNeedThis: '   ',
      whatToCalculate: 'x',
      procedure: ['a'],
      decisionSupported: 'y',
      commonErrors: [{ error: 'e', consequence: 'c' }],
    });
    expect(valid).toBe(false);
  });
  it('is valid when every field is provided', () => {
    const { valid, missing } = validateManagerFields({
      whenYouNeedThis: 'now',
      whatToCalculate: 'NPV',
      procedure: ['step 1'],
      decisionSupported: 'invest?',
      commonErrors: [{ error: 'e', consequence: 'c' }],
    });
    expect(valid).toBe(true);
    expect(missing).toEqual([]);
  });
});

describe('validateEconomistFields', () => {
  it('flags empty arrays as missing', () => {
    const { valid, missing } = validateEconomistFields({
      coreQuestion: 'q',
      whyHappening: 'w',
      whoBenefits: [],
      whoLoses: ['x'],
      tradeOffs: [{ gain: 'g', sacrifice: 's' }],
      secondOrderEffects: ['e'],
    });
    expect(valid).toBe(false);
    expect(missing).toContain('Who Benefits');
  });
});

describe('validateEducatorFields', () => {
  it('checks nested howToRead fields', () => {
    const { missing } = validateEducatorFields({
      ignoranceFought: 'a',
      skillSharpened: 'b',
      whyNeededNow: 'c',
      howToRead: { sequence: 'ch1', skip: '', companionActivities: 'notes' },
    });
    expect(missing).toContain('How to Read - What to Skip');
  });
});

describe('validateCoachFields', () => {
  it('checks nested practiceProtocol fields', () => {
    const { missing } = validateCoachFields({
      targetScore: '7',
      timeRequired: '40m',
      taskDescription: 't',
      scoringCriteria: 's',
      method: ['m'],
      practiceProtocol: { frequency: 'daily', duration: '', feedbackLoop: 'self' },
    });
    expect(missing).toContain('Practice Protocol - Duration');
  });
});

describe('validateToneFields (dispatch)', () => {
  it('hybrid role is always valid with no required fields', () => {
    expect(validateToneFields('hybrid')).toEqual({ valid: true, missing: [] });
  });
  it('dispatches to the role-specific validator', () => {
    expect(validateToneFields('manager', {}).valid).toBe(false);
    expect(
      validateToneFields('coach', undefined, undefined, undefined, {
        targetScore: '7',
        timeRequired: '40m',
        taskDescription: 't',
        scoringCriteria: 's',
        method: ['m'],
        practiceProtocol: { frequency: 'd', duration: '30m', feedbackLoop: 'self' },
      }).valid,
    ).toBe(true);
  });
  it('returns invalid for an unknown role', () => {
    // @ts-expect-error intentionally invalid role
    expect(validateToneFields('wizard').valid).toBe(false);
  });
});
