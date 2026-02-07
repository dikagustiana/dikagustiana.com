import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ReadingProgress } from './ReadingProgress';
import { FontSizeToggle, useFontSize } from './FontSizeToggle';
import { cn } from '@/lib/utils';

interface ArticleLayoutProps {
  children: ReactNode;
  showProgress?: boolean;
  showFontToggle?: boolean;
  className?: string;
}

export function ArticleLayout({
  children,
  showProgress = true,
  showFontToggle = true,
  className,
}: ArticleLayoutProps) {
  const { fontSize, changeFontSize, fontSizeClass } = useFontSize();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showProgress && <ReadingProgress />}
      <Header />

      <main className="flex-1">
        {/* Reader controls bar */}
        {showFontToggle && (
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
            <div className="container max-w-3xl py-2 flex justify-end">
              <FontSizeToggle fontSize={fontSize} onChange={changeFontSize} />
            </div>
          </div>
        )}

        {/* Article content with max-width for readability */}
        <div className={cn("container max-w-3xl py-8 md:py-12", className)}>
          <div className={fontSizeClass}>
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
