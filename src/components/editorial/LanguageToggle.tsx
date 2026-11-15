/**
 * LanguageToggle — `EN · ID`, the switch between an essay's English and
 * Indonesian versions. Same shape and behaviour as BriefToggle, beside which
 * it sits. Rendered ONLY when a published Indonesian version exists (the
 * caller guards): no placeholder, no disabled state.
 * docs/prd/essay-language/03-PEMBACA.md §C1.
 */

import { cn } from '@/lib/utils';
import type { EssayLanguage } from '@/lib/essayLanguage';

interface LanguageToggleProps {
  language: EssayLanguage;
  onChange: (language: EssayLanguage) => void;
  className?: string;
}

const LABELS: Record<EssayLanguage, { short: string; full: string }> = {
  en: { short: 'EN', full: 'English' },
  id: { short: 'ID', full: 'Bahasa Indonesia' },
};

export function LanguageToggle({ language, onChange, className }: LanguageToggleProps) {
  const item = (value: EssayLanguage) => (
    <button
      type="button"
      lang={value}
      aria-pressed={language === value}
      aria-label={LABELS[value].full}
      title={LABELS[value].full}
      onClick={() => onChange(value)}
      className={cn(
        'rounded-sm px-1 py-0.5 transition-colors',
        language === value
          ? 'font-semibold text-foreground underline decoration-2 underline-offset-[6px]'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {LABELS[value].short}
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Essay language"
      data-testid="essay-language-toggle"
      className={cn('flex items-center gap-1.5 text-sm', className)}
    >
      {item('en')}
      <span aria-hidden className="text-muted-foreground/60">
        ·
      </span>
      {item('id')}
    </div>
  );
}
