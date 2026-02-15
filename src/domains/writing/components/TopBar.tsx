import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import type { PublishValidationError } from '../schema/types';

interface TopBarProps {
  isDirty: boolean;
  isSaving: boolean;
  publishErrors: PublishValidationError[];
  onSave: () => void;
  onPublish: () => void;
  essayTitle: string;
}

export function TopBar({
  isDirty,
  isSaving,
  publishErrors,
  onSave,
  onPublish,
  essayTitle,
}: TopBarProps) {
  const navigate = useNavigate();

  const canPublish = publishErrors.length === 0;

  return (
    <div className="h-14 shrink-0 border-b border-border bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => navigate('/admin/content')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
          {essayTitle || 'Untitled Essay'}
        </span>
        {isDirty && (
          <span className="text-xs text-amber-600 flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Unsaved
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save Draft
        </Button>
        <Button
          size="sm"
          onClick={onPublish}
          disabled={isSaving || !canPublish}
          title={!canPublish ? publishErrors.map(e => e.message).join(', ') : 'Publish'}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Publish
        </Button>
      </div>
    </div>
  );
}
