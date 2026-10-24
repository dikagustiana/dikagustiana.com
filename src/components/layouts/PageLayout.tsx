import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb, BreadcrumbItem } from '@/components/Breadcrumb';
import { SectionSubNav, SubNavTab } from '@/components/SectionSubNav';
import { PAGE_COLUMN, type PageWidth } from './pageColumn';

export type VoiceRole = 'manager' | 'economist' | 'educator' | 'coach' | 'hybrid';
export type LayoutVariant = 'content' | 'dashboard' | 'essay' | 'tool';


interface PageLayoutProps {
  children: ReactNode;
  variant?: LayoutVariant;
  // Accepted so existing call sites compile; nothing reads it since the
  // manifesto banner was retired.
  role?: VoiceRole;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  subNav?: {
    tabs: SubNavTab[];
    backLink?: { label: string; path: string };
  };
  className?: string;
  /** The column the breadcrumb sits in; the page's content uses PAGE_COLUMN[width] to match it. */
  width?: PageWidth;
}

export function PageLayout({
  children,
  variant = 'content',
  title,
  breadcrumbs,
  subNav,
  className = '',
  width = 'full',
}: PageLayoutProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'dashboard':
        return 'bg-background';
      case 'essay':
        return 'bg-background';
      case 'tool':
        return 'bg-muted/30';
      default:
        return 'bg-background';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${getVariantStyles()}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Header />

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="bg-muted/30 border-b border-border py-3">
          <div className={PAGE_COLUMN[width]}>
            <Breadcrumb items={breadcrumbs} />
          </div>
        </div>
      )}

      {subNav && (
        <SectionSubNav
          tabs={subNav.tabs}
          backLink={subNav.backLink}
        />
      )}

      <main id="main-content" tabIndex={-1} className={`flex-1 outline-none ${className}`}>
        {children}
      </main>

      <Footer />
    </div>
  );
}
