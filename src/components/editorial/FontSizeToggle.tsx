import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type FontSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'editorial-font-size';

const fontSizeClasses: Record<FontSize, string> = {
  // Medium is the editorial default — NO utility class, so the measured
  // 19px/1.6 from .prose-editorial (src/index.css) applies untouched. A
  // `text-lg` here silently overrode the type system: same specificity,
  // later in the built stylesheet. S and L scale around the default; the
  // em-based heading scale follows the root size automatically.
  small: 'text-[17px] leading-[1.6]',
  medium: '',
  large: 'text-[21px] leading-[1.6]',
};

export function useFontSize() {
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as FontSize | null;
    if (stored && ['small', 'medium', 'large'].includes(stored)) {
      setFontSize(stored);
    }
  }, []);

  const changeFontSize = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem(STORAGE_KEY, size);
  };

  return { fontSize, changeFontSize, fontSizeClass: fontSizeClasses[fontSize] };
}

interface FontSizeToggleProps {
  fontSize: FontSize;
  onChange: (size: FontSize) => void;
  className?: string;
}

export function FontSizeToggle({ fontSize, onChange, className }: FontSizeToggleProps) {
  const sizes: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'S' },
    { value: 'medium', label: 'M' },
    { value: 'large', label: 'L' },
  ];

  return (
    // radiogroup semantics: exactly one of three mutually-exclusive options
    // is active; without aria-pressed/checked a screen reader announced
    // three identical buttons with no way to tell which size is on.
    <div
      role="radiogroup"
      aria-label="Font size"
      className={cn("flex items-center gap-1 bg-muted rounded-lg p-1", className)}
    >
      <span className="text-xs text-muted-foreground px-2 hidden sm:inline" aria-hidden>
        Text
      </span>
      {sizes.map((size) => (
        <button
          key={size.value}
          role="radio"
          aria-checked={fontSize === size.value}
          onClick={() => onChange(size.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded transition-colors",
            fontSize === size.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={`Font size ${size.value}`}
        >
          {size.label}
        </button>
      ))}
    </div>
  );
}
