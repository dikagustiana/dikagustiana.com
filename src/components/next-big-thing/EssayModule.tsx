import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowRight, Clock, User, Calendar, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EssayDialog } from './EssayDialog';

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

const CATEGORIES = [
  { id: 'all', label: 'All Topics' },
  { id: 'technology', label: 'Technology' },
  { id: 'economy', label: 'Economy' },
  { id: 'society', label: 'Society' },
  { id: 'environment', label: 'Environment' },
  { id: 'governance', label: 'Governance' },
];

const defaultThumbnail = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80';

export function EssayModule() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEssay, setEditingEssay] = useState<Essay | null>(null);

  useEffect(() => {
    loadEssays();
  }, [sortBy]);

  const loadEssays = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('essays')
        .select('id, slug, title, snippet, author, date, read_time, thumbnail_url, phase, published, content')
        .eq('section', 'next-big-thing');

      if (sortBy === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'title') {
        query = query.order('title', { ascending: true });
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setEssays(data || []);
    } catch (error) {
      console.error('Failed to load essays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (essayId: string) => {
    try {
      const { error } = await supabase
        .from('essays')
        .delete()
        .eq('id', essayId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Essay deleted successfully',
      });
      loadEssays();
    } catch (error) {
      console.error('Error deleting essay:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete essay',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (essay: Essay) => {
    setEditingEssay(essay);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEssay(null);
    setDialogOpen(true);
  };

  const filteredEssays = selectedCategory === 'all'
    ? essays
    : essays.filter((e) => e.phase === selectedCategory);

  return (
    <div id="all-essays" className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredEssays.length} essays
          </span>
        </div>

        {isAdmin && (
          <Button onClick={handleAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Essay
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors",
              selectedCategory === cat.id
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Essays Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-muted" />
              <CardContent className="p-5">
                <div className="h-6 bg-muted rounded mb-3 w-3/4" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEssays.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No essays found in this section yet.</p>
          {isAdmin && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Essay
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEssays.map((essay) => (
            <Card 
              key={essay.id} 
              className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 h-full flex flex-col relative group"
            >
              {/* Admin Actions */}
              {isAdmin && (
                <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEdit(essay);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Essay</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{essay.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(essay.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {/* Thumbnail */}
              <div className="aspect-[16/10] bg-muted overflow-hidden">
                <img 
                  src={essay.thumbnail_url || defaultThumbnail}
                  alt={essay.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <CardContent className="p-5 flex flex-col flex-1">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  {essay.phase && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {essay.phase}
                    </Badge>
                  )}
                  {!essay.published && isAdmin && (
                    <Badge variant="outline" className="text-xs">
                      Draft
                    </Badge>
                  )}
                </div>

                <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                  {essay.title}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                  {essay.snippet}
                </p>
                
                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  {essay.author && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {essay.author}
                    </span>
                  )}
                  {essay.read_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {essay.read_time}
                    </span>
                  )}
                  {essay.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {essay.date}
                    </span>
                  )}
                </div>
                
                <Link 
                  to={`/the-next-big-thing/${essay.slug}`}
                  className="text-sm font-medium text-accent inline-flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Read Essay
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Essay Dialog */}
      <EssayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        essay={editingEssay}
        onSuccess={loadEssays}
      />
    </div>
  );
}
