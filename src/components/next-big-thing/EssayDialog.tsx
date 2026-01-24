import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Essay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  phase: string | null;
  published: boolean | null;
  content: string | null;
}

interface EssayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  essay?: Essay | null;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: 'technology', label: 'Technology' },
  { id: 'economy', label: 'Economy' },
  { id: 'society', label: 'Society' },
  { id: 'environment', label: 'Environment' },
  { id: 'governance', label: 'Governance' },
];

export function EssayDialog({ open, onOpenChange, essay, onSuccess }: EssayDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    snippet: '',
    author: 'Dika Gustiana',
    date: '',
    read_time: '',
    thumbnail_url: '',
    phase: 'technology',
    published: false,
    content: '',
  });

  const isEditing = !!essay;

  useEffect(() => {
    if (essay) {
      setFormData({
        title: essay.title || '',
        slug: essay.slug || '',
        snippet: essay.snippet || '',
        author: essay.author || 'Dika Gustiana',
        date: essay.date || '',
        read_time: essay.read_time || '',
        thumbnail_url: essay.thumbnail_url || '',
        phase: essay.phase || 'technology',
        published: essay.published || false,
        content: essay.content || '',
      });
    } else {
      setFormData({
        title: '',
        slug: '',
        snippet: '',
        author: 'Dika Gustiana',
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        read_time: '5 min read',
        thumbnail_url: '',
        phase: 'technology',
        published: false,
        content: '',
      });
    }
  }, [essay, open]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: isEditing ? prev.slug : generateSlug(title),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && essay) {
        const { error } = await supabase
          .from('essays')
          .update({
            title: formData.title,
            slug: formData.slug,
            snippet: formData.snippet || null,
            author: formData.author || null,
            date: formData.date || null,
            read_time: formData.read_time || null,
            thumbnail_url: formData.thumbnail_url || null,
            phase: formData.phase,
            published: formData.published,
            content: formData.content || null,
          })
          .eq('id', essay.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Essay updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('essays')
          .insert({
            section: 'next-big-thing',
            title: formData.title,
            slug: formData.slug,
            snippet: formData.snippet || null,
            author: formData.author || null,
            date: formData.date || null,
            read_time: formData.read_time || null,
            thumbnail_url: formData.thumbnail_url || null,
            phase: formData.phase,
            published: formData.published,
            content: formData.content || null,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Essay created successfully',
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving essay:', error);
      toast({
        title: 'Error',
        description: 'Failed to save essay',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Essay' : 'Add New Essay'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Essay title"
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="essay-slug"
              />
            </div>

            <div>
              <Label htmlFor="phase">Category</Label>
              <Select
                value={formData.phase}
                onValueChange={(value) => setFormData(prev => ({ ...prev, phase: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="snippet">Snippet</Label>
              <Textarea
                id="snippet"
                value={formData.snippet}
                onChange={(e) => setFormData(prev => ({ ...prev, snippet: e.target.value }))}
                placeholder="Brief description of the essay..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                placeholder="Author name"
              />
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                placeholder="Jan 2025"
              />
            </div>

            <div>
              <Label htmlFor="read_time">Read Time</Label>
              <Input
                id="read_time"
                value={formData.read_time}
                onChange={(e) => setFormData(prev => ({ ...prev, read_time: e.target.value }))}
                placeholder="5 min read"
              />
            </div>

            <div>
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Full essay content (supports markdown)..."
                rows={8}
              />
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
              />
              <Label htmlFor="published" className="cursor-pointer">
                Published
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Essay'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
