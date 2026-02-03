import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb, BreadcrumbItem } from '@/components/Breadcrumb';
import { SectionIntro } from '@/components/sections/SectionIntro';

export type VoiceRole = 'manager' | 'economist' | 'educator' | 'coach' | 'hybrid';
export type LayoutVariant = 'content' | 'dashboard' | 'essay' | 'tool';

interface PageLayoutProps {
  children: ReactNode;
  variant?: LayoutVariant;
  role?: VoiceRole;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  showManifesto?: boolean;
  manifesto?: string;
  className?: string;
}

export function PageLayout({
  children,
  variant = 'content',
  role = 'hybrid',
  title,
  breadcrumbs,
  showManifesto = false,
  manifesto,
  className = '',
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
      <Header />
      
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="bg-muted/30 border-b border-border py-3">
          <div className="container">
            <Breadcrumb items={breadcrumbs} />
          </div>
        </div>
      )}

      {showManifesto && manifesto && (
        <SectionIntro role={role} manifesto={manifesto} />
      )}

      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      
      <Footer />
    </div>
  );
}
