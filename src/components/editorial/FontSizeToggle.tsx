import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type FontSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'editorial-font-size';

const fontSizeClasses: Record<FontSize, string> = {
  small: 'text-base leading-relaxed',
  medium: 'text-lg leading-relaxed',
  large: 'text-xl leading-loose',
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
    <div className={cn("flex items-center gap-1 bg-muted rounded-lg p-1", className)}>
      <span className="text-xs text-muted-foreground px-2 hidden sm:inline">Text</span>
      {sizes.map((size) => (
        <button
          key={size.value}
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
