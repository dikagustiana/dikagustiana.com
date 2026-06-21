import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Upload, Check, Loader2, AlertCircle } from 'lucide-react';
import type { PublishValidationError, SaveStatus } from '../schema/types';

interface TopBarProps {
  saveStatus: SaveStatus;
  isSaving: boolean;
  publishErrors: PublishValidationError[];
  onSave: () => void;
  onPublish: () => void;
  essayTitle: string;
}

function StatusIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case 'saving':
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </span>
      );
    case 'saved':
      return (
        <span className="text-xs text-emerald-600 flex items-center gap-1.5 shrink-0">
          <Check className="h-3.5 w-3.5" /> Saved
        </span>
      );
    case 'unsaved':
      return (
        <span className="text-xs text-amber-600 flex items-center gap-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved
        </span>
      );
    case 'error':
      return (
        <span className="text-xs text-destructive flex items-center gap-1.5 shrink-0">
          <AlertCircle className="h-3.5 w-3.5" /> Save failed
        </span>
      );
    default:
      return null;
  }
}

export function TopBar({
  saveStatus,
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
          aria-label="Back to content"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
          {essayTitle || 'Untitled Essay'}
        </span>
        <StatusIndicator status={saveStatus} />
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
