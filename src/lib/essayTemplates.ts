export type EssayTemplateType = 'blank' | 'essay' | 'analysis' | 'case-study' | 'tutorial';

export interface EssayTemplate {
  id: EssayTemplateType;
  name: string;
  title: string;
  snippet: string;
  content: string;
  keyPoints?: string[];
  steps?: string[];
}

export const essayTemplates: Record<EssayTemplateType, EssayTemplate> = {
  blank: {
    id: 'blank',
    name: 'Blank',
    title: '',
    snippet: '',
    content: '',
  },
  essay: {
    id: 'essay',
    name: 'Essay',
    title: 'How to Think About [Topic]',
    snippet: 'This essay explains what [Topic] is, why it matters, and what to do about it.',
    content: `## Introduction
Define the topic.

## Context
Why this matters now.

## Key Points
[KEY_POINTS]

## Analysis
Explain implications.

## What To Do Next
Give actions.

## Conclusion
Summarize.`,
    keyPoints: ['Point 1', 'Point 2'],
  },
  analysis: {
    id: 'analysis',
    name: 'Analysis',
    title: 'Analysis of [Subject]',
    snippet: 'A structured analysis of [Subject] using assumptions and evidence.',
    content: `## Problem Statement
What is being analyzed.

## Assumptions
List assumptions.

## Evidence
List data or facts.

## Reasoning
Explain logic.

## Findings
What this shows.

## Limitations
What is excluded.

## Conclusion
Final judgment.`,
  },
  'case-study': {
    id: 'case-study',
    name: 'Case Study',
    title: 'Case Study: [Company or Event]',
    snippet: 'This case study examines [Company/Event], the problem, and the outcome.',
    content: `## Background
Who and what.

## Problem
What needed change.

## Actions
What was done.

## Results
What happened.

## Lessons
Key takeaways.

## Conclusion
Main insight.`,
  },
  tutorial: {
    id: 'tutorial',
    name: 'Tutorial',
    title: 'How to [Do Something]',
    snippet: 'A practical guide to achieve [Goal].',
    content: `## Objective
What you will learn.

## Requirements
What you need.

## Steps
[STEPS]

## Common Mistakes
What to avoid.

## Tips
How to improve.

## Conclusion
Final note.`,
    steps: ['Step 1', 'Step 2'],
  },
};

export function getTemplateOptions(): { value: EssayTemplateType; label: string }[] {
  return Object.values(essayTemplates).map((t) => ({
    value: t.id,
    label: t.name,
  }));
}

export function applyTemplate(
  templateId: EssayTemplateType,
  keyPoints: string[],
  steps: string[]
): { title: string; snippet: string; content: string } {
  const template = essayTemplates[templateId];
  
  if (templateId === 'blank') {
    return { title: '', snippet: '', content: '' };
  }

  let content = template.content;

  // Replace [KEY_POINTS] placeholder with formatted key points
  if (content.includes('[KEY_POINTS]')) {
    const formattedPoints = keyPoints.length > 0
      ? keyPoints.map((p) => `- ${p}`).join('\n')
      : '- Point 1\n- Point 2';
    content = content.replace('[KEY_POINTS]', formattedPoints);
  }

  // Replace [STEPS] placeholder with formatted steps
  if (content.includes('[STEPS]')) {
    const formattedSteps = steps.length > 0
      ? steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
      : '1. Step 1\n2. Step 2';
    content = content.replace('[STEPS]', formattedSteps);
  }

  return {
    title: template.title,
    snippet: template.snippet,
    content,
  };
}
