import type { ReactNode } from 'react';

/**
 * Marks its children with `lang` when the essay is shown in a language other
 * than the page's — and adds nothing at all otherwise, so an English essay's
 * markup is exactly what it was before translations existed.
 */
export function LangScope({ lang, children }: { lang?: string; children: ReactNode }) {
  return lang ? <div lang={lang}>{children}</div> : <>{children}</>;
}
