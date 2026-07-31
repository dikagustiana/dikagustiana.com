// Manager Fields (Finance, Accounting, Tools)
export interface ManagerFields {
  whenYouNeedThis: string;      // When this applies
  whatToCalculate: string;       // Exact metrics
  procedure: string[];           // Step-by-step
  decisionSupported: string;     // Business question
  commonErrors: Array<{
    error: string;
    consequence: string;
  }>;
}

// Economist Fields (Green Transition, Next Big Thing)
export interface EconomistFields {
  coreQuestion: string;          // Provocative framing
  whyHappening: string;          // Structural forces
  whoBenefits: string[];         // Named actors
  whoLoses: string[];            // Named actors
  tradeOffs: Array<{
    gain: string;
    sacrifice: string;
  }>;
  secondOrderEffects: string[];  // Downstream consequences
}

// Educator Fields (Books)
export interface EducatorFields {
  ignoranceFought: string;       // Specific misconception targeted
  skillSharpened: string;        // Capability gained
  whyNeededNow: string;          // Urgency justification
  howToRead: {
    sequence: string;            // Which chapters, what order
    skip: string;                // What to ignore
    companionActivities: string; // What to do while reading
  };
}

// Coach Fields (IELTS)
export interface CoachFields {
  targetScore: string;           // e.g., "Band 7.0"
  timeRequired: string;          // e.g., "40 minutes"
  taskDescription: string;       // Exact task
  scoringCriteria: string;       // How measured
  method: string[];              // Step sequence
  practiceProtocol: {
    frequency: string;           // e.g., "Daily"
    duration: string;            // e.g., "30 minutes"
    feedbackLoop: string;        // How to self-assess
  };
}

// Content status enum
export type ContentStatus = 'draft' | 'tone_pending' | 'published' | 'archived';

// Voice role enum
export type VoiceRole = 'manager' | 'economist' | 'educator' | 'coach' | 'hybrid';

// Validation functions
export function validateManagerFields(fields: Partial<ManagerFields>): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!fields.whenYouNeedThis?.trim()) missing.push('When You Need This');
  if (!fields.whatToCalculate?.trim()) missing.push('What to Calculate');
  if (!fields.procedure?.length) missing.push('Procedure');
  if (!fields.decisionSupported?.trim()) missing.push('Decision Supported');
  if (!fields.commonErrors?.length) missing.push('Common Errors');
  return { valid: missing.length === 0, missing };
}

export function validateEconomistFields(fields: Partial<EconomistFields>): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!fields.coreQuestion?.trim()) missing.push('Core Question');
  if (!fields.whyHappening?.trim()) missing.push('Why This is Happening');
  if (!fields.whoBenefits?.length) missing.push('Who Benefits');
  if (!fields.whoLoses?.length) missing.push('Who Loses');
  if (!fields.tradeOffs?.length) missing.push('Trade-offs');
  if (!fields.secondOrderEffects?.length) missing.push('Second-Order Effects');
  return { valid: missing.length === 0, missing };
}

export function validateEducatorFields(fields: Partial<EducatorFields>): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!fields.ignoranceFought?.trim()) missing.push('The Ignorance This Fights');
  if (!fields.skillSharpened?.trim()) missing.push('Skill Sharpened');
  if (!fields.whyNeededNow?.trim()) missing.push('Why Needed Now');
  if (!fields.howToRead?.sequence?.trim()) missing.push('How to Read - Sequence');
  if (!fields.howToRead?.skip?.trim()) missing.push('How to Read - What to Skip');
  if (!fields.howToRead?.companionActivities?.trim()) missing.push('How to Read - Companion Activities');
  return { valid: missing.length === 0, missing };
}

export function validateCoachFields(fields: Partial<CoachFields>): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!fields.targetScore?.trim()) missing.push('Target Score');
  if (!fields.timeRequired?.trim()) missing.push('Time Required');
  if (!fields.taskDescription?.trim()) missing.push('Task Description');
  if (!fields.scoringCriteria?.trim()) missing.push('Scoring Criteria');
  if (!fields.method?.length) missing.push('Method');
  if (!fields.practiceProtocol?.frequency?.trim()) missing.push('Practice Protocol - Frequency');
  if (!fields.practiceProtocol?.duration?.trim()) missing.push('Practice Protocol - Duration');
  if (!fields.practiceProtocol?.feedbackLoop?.trim()) missing.push('Practice Protocol - Feedback Loop');
  return { valid: missing.length === 0, missing };
}

export function validateToneFields(
  role: VoiceRole,
  managerFields?: Partial<ManagerFields>,
  economistFields?: Partial<EconomistFields>,
  educatorFields?: Partial<EducatorFields>,
  coachFields?: Partial<CoachFields>
): { valid: boolean; missing: string[] } {
  switch (role) {
    case 'manager':
      return validateManagerFields(managerFields || {});
    case 'economist':
      return validateEconomistFields(economistFields || {});
    case 'educator':
      return validateEducatorFields(educatorFields || {});
    case 'coach':
      return validateCoachFields(coachFields || {});
    case 'hybrid':
      return { valid: true, missing: [] }; // Hybrid has no required tone fields
    default:
      return { valid: false, missing: ['Unknown voice role'] };
  }
}
