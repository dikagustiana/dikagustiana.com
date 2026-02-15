import { VoiceRole } from '@/components/layouts/PageLayout';
import { contentTemplates, TemplateField, validateContentAgainstTemplate } from './ContentTemplates';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface ContentHealthIndicatorProps {
  role: VoiceRole;
  content: Record<string, string | string[] | undefined>;
  fullText?: string;
}

interface HealthStatus {
  level: 'good' | 'warning' | 'error';
  message: string;
}

export function ContentHealthIndicator({
  role,
  content,
  fullText = '',
}: ContentHealthIndicatorProps) {
  const template = contentTemplates[role];
  
  const checkFieldCompletion = (): HealthStatus[] => {
    const statuses: HealthStatus[] = [];
    
    template.fields.forEach((field) => {
      const value = content[field.key];
      const isEmpty = 
        value === undefined || 
        value === '' || 
        (Array.isArray(value) && value.length === 0);
      
      if (field.required && isEmpty) {
        statuses.push({
          level: 'error',
          message: `Missing required field: ${field.label}`,
        });
      }
    });
    
    return statuses;
  };

  const checkForbiddenPatterns = (): HealthStatus[] => {
    const statuses: HealthStatus[] = [];
    const validation = validateContentAgainstTemplate(fullText, role);
    
    validation.violations.forEach((violation) => {
      statuses.push({
        level: 'warning',
        message: violation,
      });
    });
    
    return statuses;
  };

  const fieldStatuses = checkFieldCompletion();
  const patternStatuses = checkForbiddenPatterns();
  const allStatuses = [...fieldStatuses, ...patternStatuses];

  const errorCount = allStatuses.filter((s) => s.level === 'error').length;
  const warningCount = allStatuses.filter((s) => s.level === 'warning').length;

  const overallHealth = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'good';

  const getHealthIcon = () => {
    switch (overallHealth) {
      case 'good':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getHealthBadge = () => {
    switch (overallHealth) {
      case 'good':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Warnings</Badge>;
      case 'error':
        return <Badge variant="destructive">Issues</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {getHealthIcon()}
        <span className="font-medium">Content Health</span>
        {getHealthBadge()}
      </div>

      {allStatuses.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {allStatuses.map((status, index) => (
            <li
              key={index}
              className={`flex items-start gap-2 ${
                status.level === 'error'
                  ? 'text-destructive'
                  : status.level === 'warning'
                  ? 'text-amber-600'
                  : 'text-muted-foreground'
              }`}
            >
              {status.level === 'error' ? (
                <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              )}
              {status.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          All required fields complete. No forbidden patterns detected.
        </p>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2">
        <span className="font-medium">Template:</span> {template.name} •{' '}
        <span className="font-medium">Required fields:</span>{' '}
        {template.fields.filter((f) => f.required).length}
      </div>
    </div>
  );
}
