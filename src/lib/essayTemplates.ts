export type EssayTemplateType =
  | 'blank'
  | 'essay'
  | 'analysis'
  | 'case-study'
  | 'tutorial'
  | 'foundations'
  | 'strategic-finance'
  | 'planning'
  | 'analytics-review';

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

  // ── Finance-specific templates ──

  foundations: {
    id: 'foundations',
    name: 'Finance Foundations',
    title: '[Concept] — A Foundational Idea',
    snippet: 'Why [Concept] matters, how it works, and the blind spots to avoid.',
    content: `## Core Idea
State the concept in one sentence. Why does this matter?

## Why This Is Foundational
Explain why this concept sits at the base of financial thinking. What breaks without it?

## Key Concepts
- Concept A: Definition and implication.
- Concept B: Definition and implication.
- Concept C: Definition and implication.

## How It Works in Practice
Walk through a concrete example. Use numbers where possible.

## The Blind Spot
What do people consistently get wrong about this concept? Why?

## Essays to Write
- Essay 1: [Specific angle to explore]
- Essay 2: [Specific angle to explore]

## Connection to Other Fundamentals
How does this concept link to related foundational ideas?

## Conclusion
Restate the core insight. What should the reader remember?`,
  },

  'strategic-finance': {
    id: 'strategic-finance',
    name: 'Strategic Finance',
    title: '[Decision Type]: A Strategic Finance Framework',
    snippet: 'How to think about [decision] — the framework, the trade-offs, and the judgment calls.',
    content: `## The Decision
What decision is being analyzed? Who makes it? What is at stake?

## Framework
What analytical structure supports this decision?

### Inputs Required
- Input 1: What data is needed and why.
- Input 2: What data is needed and why.

### Key Trade-offs
What are the competing forces? What makes this decision hard?

## Quantitative Analysis
Walk through the numbers. Show the model structure, not just the output.

## Qualitative Judgment
What cannot be captured in the numbers? What requires experience?

## Decision Criteria
Under what conditions would you choose option A vs. option B?

## Implementation Considerations
What happens after the decision is made? What execution risks exist?

## Common Mistakes
What errors do decision-makers typically make here?

## Conclusion
Summarize the framework and the key judgment call.`,
  },

  planning: {
    id: 'planning',
    name: 'Financial Planning',
    title: 'Planning [Subject]: From Assumptions to Action',
    snippet: 'Building a financial plan for [Subject] — assumptions, drivers, scenarios, and action triggers.',
    content: `## Objective
What is this plan trying to achieve? What question does it answer?

## Key Assumptions
- Assumption 1: What you believe and why.
- Assumption 2: What you believe and why.
- Assumption 3: What you believe and why.

## Revenue Drivers
What drives the top line? List the key variables and their relationships.

## Cost Structure
What are the fixed and variable components? Where is operating leverage?

## Scenario Analysis
### Base Case
Expected outcome with current assumptions.

### Upside Case
What happens if key drivers outperform?

### Downside Case
What happens if key drivers underperform?

## Cash Flow Implications
How does the P&L translate to cash? What is the working capital impact?

## Action Triggers
What signals should prompt a plan revision? What thresholds matter?

## Risks and Mitigations
What could go wrong? What is the contingency?

## Conclusion
State the planning recommendation and the key sensitivity.`,
  },

  'analytics-review': {
    id: 'analytics-review',
    name: 'Analytics Review',
    title: 'Analytics Review: [Period or Topic]',
    snippet: 'A structured review of [Subject] — what the numbers say, what they hide, and what to do next.',
    content: `## Executive Summary
One-paragraph summary of findings and recommended actions.

## Scope and Period
What is being reviewed? What time period? What benchmarks?

## Key Metrics
| Metric | Actual | Budget | Variance | Comment |
|--------|--------|--------|----------|---------|
| Revenue | | | | |
| Gross Margin | | | | |
| EBITDA | | | | |
| Cash Flow | | | | |

## Variance Analysis
### Favorable Variances
What went better than expected? Is it sustainable?

### Unfavorable Variances
What underperformed? Is it structural or one-time?

## Root Causes
Go beyond the numbers. What business events drove these results?

## Trend Analysis
How do these numbers compare to prior periods? What is the trajectory?

## Blind Spots
What is this analysis not capturing? What data gaps exist?

## Recommended Actions
- Action 1: What to do and why.
- Action 2: What to do and why.

## Conclusion
State the overall assessment and the most important next step.`,
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
