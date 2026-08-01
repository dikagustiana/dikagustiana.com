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
  /**
   * Saved prose from `fsli_sections`, fetched ONCE per page in FsliDetail —
   * this component used to fire its own query, which made every FSLI page
   * view cost ten single-row requests. Empty string means honestly empty:
   * there is no placeholder fallback any more. Twenty-four line items were
   * all rendering the same cash-equivalents boilerplate as if it were their
   * content, which is worse than saying nothing.
   */
  content: string;
  /** True while the sections query is still in flight. */
  loading?: boolean;
}

export function FsliContentSection({
  id,
  pageSlug,
  sectionKey,
  title,
  subtitle,
  content: savedContent,
  loading,
}: FsliContentSectionProps) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState(savedContent);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // The page-level query resolves after first render; adopt what it found.
  useEffect(() => {
    setContent(savedContent);
  }, [savedContent]);

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
          <Button variant="ghost" size="sm" onClick={handleEdit} aria-label={`Edit ${title}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={`Write the ${title.toLowerCase()} section for this line item`}
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
      ) : loading ? (
        // Skeleton shaped like a short paragraph, not a spinner.
        <div className="space-y-2" aria-hidden>
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        </div>
      ) : content ? (
        <div
          className={`text-muted-foreground leading-relaxed ${isAdmin ? 'cursor-pointer hover:bg-muted/30 p-3 -m-3 rounded-lg transition-colors' : ''}`}
          onClick={isAdmin ? handleEdit : undefined}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        // The honest empty state: one quiet line, sized like the absence it
        // announces. Admins can click straight into writing it.
        <p
          className={`text-sm italic text-muted-foreground/70 ${isAdmin ? 'cursor-pointer hover:text-muted-foreground' : ''}`}
          onClick={isAdmin ? handleEdit : undefined}
        >
          Not written yet.
        </p>
      )}
    </section>
  );
}
