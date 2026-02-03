import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateEssay } from '@/hooks/queries/useAdminEssays';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, X, Pencil, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InlineEssayEditorProps {
  essayId: string;
  field: 'title' | 'snippet' | 'content';
  value: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
  multiline?: boolean;
  onUpdate?: (newValue: string) => void;
}

export function InlineEssayEditor({
  essayId,
  field,
  value,
  className = '',
  as: Component = 'p',
  multiline = false,
  onUpdate,
}: InlineEssayEditorProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const updateEssay = useUpdateEssay();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    try {
      await updateEssay.mutateAsync({
        id: essayId,
        data: { [field]: editValue },
      });
      onUpdate?.(editValue);
      toast({ title: 'Updated successfully' });
      setIsEditing(false);
    } catch (error) {
      toast({ title: 'Failed to save', variant: 'destructive' });
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isAdmin) {
    return <Component className={className}>{value}</Component>;
  }

  if (isEditing) {
    const InputComponent = multiline ? Textarea : Input;

    return (
      <div className="relative w-full">
        <InputComponent
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={updateEssay.isPending}
          className={`${className} w-full`}
          rows={multiline ? Math.max(4, editValue.split('\n').length) : undefined}
        />
        <div className="flex gap-1 mt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateEssay.isPending}
          >
            {updateEssay.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={updateEssay.isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative inline-block w-full">
      <Component className={`${className} admin-highlight cursor-pointer pr-8`} onClick={() => setIsEditing(true)}>
        {value || <span className="text-muted-foreground italic">Click to add {field}...</span>}
      </Component>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface AdminEditBannerProps {
  essayId: string;
  essaySlug: string;
}

export function AdminEditBanner({ essayId, essaySlug }: AdminEditBannerProps) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-primary/20">Admin</Badge>
        <span className="text-sm text-muted-foreground">
          You can edit this content inline or use the full editor
        </span>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to={`/admin/content/${essayId}`}>
          <Pencil className="h-4 w-4 mr-2" />
          Full Editor
        </Link>
      </Button>
    </div>
  );
}
