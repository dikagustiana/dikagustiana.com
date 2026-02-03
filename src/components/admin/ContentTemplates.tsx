import { VoiceRole } from '@/components/layouts/PageLayout';

export interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: 'text' | 'textarea' | 'array';
}

export interface ContentTemplate {
  role: VoiceRole;
  name: string;
  fields: TemplateField[];
  forbiddenPatterns: string[];
}

export const contentTemplates: Record<VoiceRole, ContentTemplate> = {
  manager: {
    role: 'manager',
    name: 'Manager Template',
    fields: [
      {
        key: 'when_you_need_this',
        label: 'When You Need This',
        placeholder: 'Describe the specific situation or decision point...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'what_to_calculate',
        label: 'What to Calculate',
        placeholder: 'List the specific calculations or metrics...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'decision_supported',
        label: 'Decision Supported',
        placeholder: 'What decision does this help make?',
        required: true,
        type: 'text',
      },
      {
        key: 'procedure',
        label: 'Procedure',
        placeholder: 'Step-by-step instructions...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'common_errors',
        label: 'Common Errors to Avoid',
        placeholder: 'List common mistakes...',
        required: true,
        type: 'array',
      },
    ],
    forbiddenPatterns: [
      "In this article, we'll explore",
      'important metric',
      'helps you understand',
      'conceptual overview',
    ],
  },
  economist: {
    role: 'economist',
    name: 'Economist Template',
    fields: [
      {
        key: 'core_question',
        label: 'The Core Question',
        placeholder: 'What is the provocative question that frames the stakes?',
        required: true,
        type: 'textarea',
      },
      {
        key: 'why_happening',
        label: 'Why This is Happening',
        placeholder: 'Explain the structural forces at play...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'who_benefits',
        label: 'Who Benefits',
        placeholder: 'Name specific groups, industries, or actors...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'who_loses',
        label: 'Who Loses',
        placeholder: 'Name specific groups, industries, or actors...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'trade_offs',
        label: 'Trade-offs',
        placeholder: 'What must be sacrificed for what gain?',
        required: true,
        type: 'textarea',
      },
      {
        key: 'second_order_effects',
        label: 'Second-Order Effects',
        placeholder: 'What happens after the initial change?',
        required: true,
        type: 'textarea',
      },
    ],
    forbiddenPatterns: [
      'Time will tell',
      'remains to be seen',
      'one of many tools',
      'neutral summary',
    ],
  },
  educator: {
    role: 'educator',
    name: 'Educator Template (Tan Malaka)',
    fields: [
      {
        key: 'ignorance_fought',
        label: 'The Ignorance This Fights',
        placeholder: 'What specific misconception or gap does this address?',
        required: true,
        type: 'textarea',
      },
      {
        key: 'skill_sharpened',
        label: 'Skill Sharpened',
        placeholder: 'What capability will the reader gain?',
        required: true,
        type: 'text',
      },
      {
        key: 'why_needed_now',
        label: 'Why Needed Now',
        placeholder: 'Why is this urgent? What current context makes this essential?',
        required: true,
        type: 'textarea',
      },
      {
        key: 'how_to_read',
        label: 'How to Read',
        placeholder: 'Specific instructions: which chapters, what to skip, how to engage...',
        required: true,
        type: 'textarea',
      },
    ],
    forbiddenPatterns: [
      'interesting book',
      'classic in its field',
      'thought-provoking',
      'fascinating',
      '⭐',
      'star rating',
      'you can do it',
    ],
  },
  coach: {
    role: 'coach',
    name: 'Coach Template',
    fields: [
      {
        key: 'target_score',
        label: 'Target Score',
        placeholder: 'e.g., Band 7.0, 85%, etc.',
        required: true,
        type: 'text',
      },
      {
        key: 'time_required',
        label: 'Time Required',
        placeholder: 'e.g., 40 minutes, 2 hours practice...',
        required: true,
        type: 'text',
      },
      {
        key: 'task_description',
        label: 'Exact Task Description',
        placeholder: 'Precisely what the learner must do...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'scoring_criteria',
        label: 'Scoring Criteria',
        placeholder: 'How performance is measured...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'method',
        label: 'The Method',
        placeholder: 'Step-by-step approach...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'practice_protocol',
        label: 'Practice Protocol',
        placeholder: 'How to practice: frequency, duration, feedback loop...',
        required: true,
        type: 'textarea',
      },
    ],
    forbiddenPatterns: [
      'You can do it',
      'dream score',
      'journey',
      'believe in yourself',
      'tips and tricks',
    ],
  },
  hybrid: {
    role: 'hybrid',
    name: 'Hybrid Template',
    fields: [
      {
        key: 'what_this_covers',
        label: 'What This Covers',
        placeholder: 'Clear scope statement...',
        required: true,
        type: 'textarea',
      },
      {
        key: 'who_its_for',
        label: 'Who This is For',
        placeholder: 'Target audience...',
        required: true,
        type: 'text',
      },
      {
        key: 'what_to_do_next',
        label: 'What to Do Next',
        placeholder: 'Clear call to action...',
        required: true,
        type: 'textarea',
      },
    ],
    forbiddenPatterns: [
      'Your journey',
      'motivational quote',
      'dream',
      'believe',
    ],
  },
};

export function getTemplateForRole(role: VoiceRole): ContentTemplate {
  return contentTemplates[role];
}

export function validateContentAgainstTemplate(
  content: string,
  role: VoiceRole
): { valid: boolean; violations: string[] } {
  const template = contentTemplates[role];
  const violations: string[] = [];

  template.forbiddenPatterns.forEach((pattern) => {
    if (content.toLowerCase().includes(pattern.toLowerCase())) {
      violations.push(`Contains forbidden pattern: "${pattern}"`);
    }
  });

  return {
    valid: violations.length === 0,
    violations,
  };
}

export function getEmptyTemplateContent(role: VoiceRole): Record<string, string> {
  const template = contentTemplates[role];
  const content: Record<string, string> = {};

  template.fields.forEach((field) => {
    content[field.key] = '';
  });

  return content;
}
