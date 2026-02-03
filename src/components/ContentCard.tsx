import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { VoiceRole } from '@/components/layouts/PageLayout';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  title: string;
  description: string;
  linkUrl?: string;
  linkText?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  role?: VoiceRole;
  // Manager voice fields
  whatYouCalculate?: string;
  decisionSupported?: string;
  // Economist voice fields
  whoBenefits?: string;
  whoLoses?: string;
  // Educator voice fields
  ignoranceFought?: string;
  // Coach voice fields
  targetScore?: string;
  timeRequired?: string;
  // Custom children
  children?: ReactNode;
  className?: string;
}

const roleAccentColors: Record<VoiceRole, string> = {
  manager: 'border-l-blue-500',
  economist: 'border-l-amber-500',
  educator: 'border-l-purple-500',
  coach: 'border-l-green-500',
  hybrid: 'border-l-primary',
};

export function ContentCard({
  title,
  description,
  linkUrl,
  linkText = 'Learn more',
  onClick,
  icon: Icon,
  role = 'hybrid',
  whatYouCalculate,
  decisionSupported,
  whoBenefits,
  whoLoses,
  ignoranceFought,
  targetScore,
  timeRequired,
  children,
  className,
}: ContentCardProps) {
  const hasVoiceFields = whatYouCalculate || decisionSupported || whoBenefits || whoLoses || ignoranceFought || targetScore;
  
  const cardContent = (
    <Card className={cn(
      'h-full transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group',
      hasVoiceFields && `border-l-4 ${roleAccentColors[role]}`,
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="p-2.5 rounded-lg bg-secondary flex-shrink-0">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {description}
            </p>

            {/* Manager Voice Fields */}
            {role === 'manager' && (whatYouCalculate || decisionSupported) && (
              <div className="space-y-3 mb-4 pt-3 border-t border-border">
                {whatYouCalculate && (
                  <div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-1">What You Calculate</p>
                    <p className="text-sm text-foreground">{whatYouCalculate}</p>
                  </div>
                )}
                {decisionSupported && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Decision Supported</p>
                    <p className="text-sm text-muted-foreground">{decisionSupported}</p>
                  </div>
                )}
              </div>
            )}

            {/* Economist Voice Fields */}
            {role === 'economist' && (whoBenefits || whoLoses) && (
              <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-border">
                {whoBenefits && (
                  <div>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-1">Who Benefits</p>
                    <p className="text-sm text-foreground">{whoBenefits}</p>
                  </div>
                )}
                {whoLoses && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-1">Who Loses</p>
                    <p className="text-sm text-foreground">{whoLoses}</p>
                  </div>
                )}
              </div>
            )}

            {/* Educator Voice Fields */}
            {role === 'educator' && ignoranceFought && (
              <div className="mb-4 pt-3 border-t border-border">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase mb-1">The Ignorance This Fights</p>
                <p className="text-sm text-foreground">{ignoranceFought}</p>
              </div>
            )}

            {/* Coach Voice Fields */}
            {role === 'coach' && (targetScore || timeRequired) && (
              <div className="flex gap-4 mb-4 pt-3 border-t border-border">
                {targetScore && (
                  <div>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-1">Target</p>
                    <p className="text-sm font-semibold text-foreground">{targetScore}</p>
                  </div>
                )}
                {timeRequired && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Time</p>
                    <p className="text-sm text-foreground">{timeRequired}</p>
                  </div>
                )}
              </div>
            )}

            {children}

            {(linkUrl || onClick) && (
              <span className="text-sm font-medium text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                {linkText}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (linkUrl) {
    return <Link to={linkUrl}>{cardContent}</Link>;
  }

  if (onClick) {
    return <div onClick={onClick}>{cardContent}</div>;
  }

  return cardContent;
}
