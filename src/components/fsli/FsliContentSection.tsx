import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';

interface FsliContentSectionProps {
  id: string;
  pageSlug: string;
  sectionKey: string;
  title: string;
  subtitle?: string;
}

export function FsliContentSection({ 
  id, 
  pageSlug, 
  sectionKey, 
  title, 
  subtitle,
}: FsliContentSectionProps) {
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
    setEditValue(content);
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


  return (
    <section id={id} className="py-8 border-b border-border last:border-0 scroll-mt-28">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary underline decoration-primary underline-offset-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground mt-2">{subtitle}</p>
          )}
        </div>
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
            className="w-full min-h-[200px] p-4 bg-card border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-y text-sm"
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
      ) : content ? (
        <div 
          className={`text-muted-foreground leading-relaxed ${isAdmin ? 'cursor-pointer hover:bg-muted/30 p-3 -m-3 rounded-lg transition-colors' : ''}`}
          onClick={isAdmin ? handleEdit : undefined}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        /* Honest empty state. All 24 FSLI pages used to fall back to prose
           written about cash and cash equivalents — pages that LOOKED finished
           while showing another line item's content. Unwritten is unwritten. */
        <p
          className={`text-sm italic text-muted-foreground/80 ${isAdmin ? 'cursor-pointer hover:text-foreground transition-colors' : ''}`}
          onClick={isAdmin ? handleEdit : undefined}
        >
          This section hasn't been written yet.{isAdmin ? ' Click to write it.' : ''}
        </p>
      )}
    </section>
  );
}