import { useState, useRef, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

interface EditableTextProps {
  content: string;
  pageSlug: string;
  blockKey: string;
  className?: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'div';
  onUpdate?: (newContent: string) => void;
  children?: ReactNode;
}

export function EditableText({ 
  content, 
  pageSlug, 
  blockKey, 
  className = '', 
  as: Component = 'p',
  onUpdate 
}: EditableTextProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(content);
  }, [content]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('content_blocks')
        .upsert({
          page_slug: pageSlug,
          block_key: blockKey,
          content: editValue,
        }, {
          onConflict: 'page_slug,block_key'
        });

      if (error) throw error;

      onUpdate?.(editValue);
      toast({ title: 'Content updated successfully' });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to save:', error);
      }
      toast({ title: 'Failed to save', variant: 'destructive' });
      setEditValue(content);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isAdmin) {
    return <Component className={className}>{content}</Component>;
  }

  if (isEditing) {
    return (
      <div className="relative inline-block w-full">
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className={`${className} editable-field w-full bg-card border border-primary/50 rounded p-2 resize-none min-h-[60px]`}
          rows={Math.max(2, editValue.split('\n').length)}
        />
        <div className="absolute top-1 right-1 flex gap-1">
          <button 
            onClick={handleSave}
            className="p-1 bg-accent text-accent-foreground rounded hover:opacity-80"
          >
            <Check className="w-4 h-4" />
          </button>
          <button 
            onClick={handleCancel}
            className="p-1 bg-destructive text-destructive-foreground rounded hover:opacity-80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Component 
      className={`${className} admin-highlight cursor-pointer`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      {content}
    </Component>
  );
}
