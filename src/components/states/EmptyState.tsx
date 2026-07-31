import { FileQuestion, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'No content yet',
  message = 'There is no content to display at this time.',
  actionLabel,
  actionPath,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        {icon || <FileQuestion className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{message}</p>
      {actionLabel && (actionPath || onAction) && (
        actionPath ? (
          <Button asChild>
            <Link to={actionPath} className="gap-2">
              <Plus className="h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <Button onClick={onAction} className="gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}
