import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';

interface FsliSectionProps {
  pageSlug: string;
  sectionKey: string;
  title: string;
  placeholder: string;
}

export function FsliSection({ pageSlug, sectionKey, title, placeholder }: FsliSectionProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, [pageSlug, sectionKey]);

  const loadContent = async () => {
    const { data } = await supabase
      .from('fsli_sections')
      .select('content')
      .eq('page_slug', pageSlug)
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (data?.content) {
      setContent(data.content);
    }
  };

  const handleEdit = () => {
    setEditValue(content || placeholder);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('fsli_sections')
        .upsert({
          page_slug: pageSlug,
          section_key: sectionKey,
          content: editValue,
        }, {
          onConflict: 'page_slug,section_key'
        });

      if (error) throw error;

      setContent(editValue);
      toast({ title: 'Section saved successfully' });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to save:', error);
      }
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const displayContent = content || placeholder;

  return (
    <div className="py-6 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {isAdmin && !isEditing && (
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full min-h-[150px] p-4 bg-card border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-y"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving} size="sm">
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className={`text-muted-foreground leading-relaxed ${isAdmin ? 'cursor-pointer hover:bg-secondary/50 p-2 -m-2 rounded-lg transition-colors' : ''}`}
          onClick={isAdmin ? handleEdit : undefined}
        >
          <p className="italic">{displayContent}</p>
        </div>
      )}
    </div>
  );
}
