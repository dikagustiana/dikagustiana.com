import { VoiceRole } from '@/components/layouts/PageLayout';
import { AlertTriangle, Calculator, TrendingUp, BookOpen, Target } from 'lucide-react';

interface SectionIntroProps {
  role: VoiceRole;
  manifesto?: string;
  details?: {
    // Manager voice
    whatToCalculate?: string;
    decisionSupported?: string;
    commonErrors?: string[];
    // Economist voice
    coreQuestion?: string;
    whoBenefits?: string;
    whoLoses?: string;
    tradeOffs?: string;
    // Educator voice
    ignoranceFought?: string;
    skillSharpened?: string;
    whyNeededNow?: string;
    howToRead?: string;
    // Coach voice
    targetScore?: string;
    timeRequired?: string;
    method?: string;
  };
}

const roleIcons = {
  manager: Calculator,
  economist: TrendingUp,
  educator: BookOpen,
  coach: Target,
  hybrid: AlertTriangle,
};

const roleColors = {
  manager: 'border-blue-500/30 bg-blue-500/5',
  economist: 'border-amber-500/30 bg-amber-500/5',
  educator: 'border-purple-500/30 bg-purple-500/5',
  coach: 'border-green-500/30 bg-green-500/5',
  hybrid: 'border-border bg-muted/30',
};

export function SectionIntro({ role, manifesto, details }: SectionIntroProps) {
  const Icon = roleIcons[role];
  const colorClass = roleColors[role];

  if (!manifesto && !details) return null;

  return (
    <div className={`border-b ${colorClass}`}>
      <div className="container py-6">
        {manifesto && (
          <div className="flex items-start gap-3 max-w-3xl">
            <Icon className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground italic">{manifesto}</p>
          </div>
        )}

        {details && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Manager details */}
            {role === 'manager' && (
              <>
                {details.whatToCalculate && (
                  <DetailCard label="What You Calculate" value={details.whatToCalculate} />
                )}
                {details.decisionSupported && (
                  <DetailCard label="Decision Supported" value={details.decisionSupported} />
                )}
                {details.commonErrors && details.commonErrors.length > 0 && (
                  <DetailCard 
                    label="Common Errors" 
                    value={details.commonErrors.join('; ')} 
                    variant="warning"
                  />
                )}
              </>
            )}

            {/* Economist details */}
            {role === 'economist' && (
              <>
                {details.coreQuestion && (
                  <DetailCard label="Core Question" value={details.coreQuestion} />
                )}
                {details.whoBenefits && (
                  <DetailCard label="Who Benefits" value={details.whoBenefits} variant="success" />
                )}
                {details.whoLoses && (
                  <DetailCard label="Who Loses" value={details.whoLoses} variant="warning" />
                )}
              </>
            )}

            {/* Educator details */}
            {role === 'educator' && (
              <>
                {details.ignoranceFought && (
                  <DetailCard label="The Ignorance This Fights" value={details.ignoranceFought} />
                )}
                {details.whyNeededNow && (
                  <DetailCard label="Why Needed Now" value={details.whyNeededNow} />
                )}
                {details.howToRead && (
                  <DetailCard label="How to Read" value={details.howToRead} />
                )}
              </>
            )}

            {/* Coach details */}
            {role === 'coach' && (
              <>
                {details.targetScore && (
                  <DetailCard label="Target Score" value={details.targetScore} />
                )}
                {details.timeRequired && (
                  <DetailCard label="Time Required" value={details.timeRequired} />
                )}
                {details.method && (
                  <DetailCard label="The Method" value={details.method} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DetailCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning';
}

function DetailCard({ label, value, variant = 'default' }: DetailCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm ${variantStyles[variant]}`}>{value}</p>
    </div>
  );
}
