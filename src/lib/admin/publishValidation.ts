/**
 * Publish-time validation.
 *
 * NO validation runs while the writer is typing.
 * Validation fires ONLY when:
 *   1. The user clicks Publish
 *   2. The user explicitly opens the Content Health panel
 *
 * Rules enforced at publish:
 *   - Section must be resolved and valid
 *   - Every FigureBlock must have altText
 *   - green-transition figures need sourceName (unless noSource)
 *   - Tone fields must be complete (non-hybrid roles)
 *   - Title and slug must exist
 */

import type { JSONContent } from '@tiptap/core';
import type { FigureBlockData } from '@/components/editorial/FigureBlock';
import { extractFiguresFromJson } from '@/lib/tiptap/serialize';
import { validateToneFields, VoiceRole, ManagerFields, EconomistFields, EducatorFields, CoachFields } from '@/lib/types/toneFields';

export interface PublishError {
  field: string;
  message: string;
  /** CSS selector or element id to scroll to — optional */
  scrollTarget?: string;
}

export interface PublishValidationResult {
  canPublish: boolean;
  errors: PublishError[];
  warnings: PublishError[];
}

interface PublishValidationInput {
  title: string;
  slug: string;
  resolvedSection: string;
  sectionValidated: boolean;
  contentJson: JSONContent | null;
  voiceRole: VoiceRole;
  managerFields: Partial<ManagerFields>;
  economistFields: Partial<EconomistFields>;
  educatorFields: Partial<EducatorFields>;
  coachFields: Partial<CoachFields>;
}

export function validateForPublish(input: PublishValidationInput): PublishValidationResult {
  const errors: PublishError[] = [];
  const warnings: PublishError[] = [];

  // ---- Required fields -------------------------------------------------
  if (!input.title.trim()) {
    errors.push({ field: 'title', message: 'Title is required.', scrollTarget: '#editor-title' });
  }
  if (!input.slug.trim()) {
    errors.push({ field: 'slug', message: 'Slug is required.', scrollTarget: '#post-settings' });
  }

  // ---- Section ---------------------------------------------------------
  if (!input.resolvedSection || !input.sectionValidated) {
    errors.push({
      field: 'section',
      message: 'Select a valid section before publishing.',
      scrollTarget: '#section-selector',
    });
  }

  // ---- Figure validation -----------------------------------------------
  const figures = extractFiguresFromJson(input.contentJson);

  figures.forEach((figure: FigureBlockData, idx: number) => {
    const num = idx + 1;

    if (!figure.altText || !figure.altText.trim()) {
      errors.push({
        field: `figure_${num}`,
        message: `Figure ${num}: Alt text is required.`,
      });
    }

    // green-transition requires source
    if (input.resolvedSection === 'green-transition') {
      if (!figure.noSource && (!figure.sourceName || !figure.sourceName.trim())) {
        errors.push({
          field: `figure_${num}`,
          message: `Figure ${num}: Source is required for Green Transition (or mark as self-created).`,
        });
      }
    }

    // Warn for tall aspect ratios
    if (figure.aspectRatio && figure.aspectRatio > 2) {
      warnings.push({
        field: `figure_${num}`,
        message: `Figure ${num}: Very tall image may hurt reading flow.`,
      });
    }
  });

  if (figures.length > 8) {
    warnings.push({
      field: 'figures',
      message: `${figures.length} figures may overwhelm the essay. Consider using fewer.`,
    });
  }

  // ---- Tone fields (non-hybrid only) -----------------------------------
  if (input.voiceRole !== 'hybrid') {
    const tone = validateToneFields(
      input.voiceRole,
      input.managerFields,
      input.economistFields,
      input.educatorFields,
      input.coachFields,
    );
    if (!tone.valid) {
      errors.push({
        field: 'tone_fields',
        message: `Missing tone fields for ${input.voiceRole}: ${tone.missing.join(', ')}`,
        scrollTarget: '#tone-fields',
      });
    }
  }

  return {
    canPublish: errors.length === 0,
    errors,
    warnings,
  };
}
