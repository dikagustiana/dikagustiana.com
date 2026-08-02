import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Book {
  id: string;
  category: string;
  filepath: string;
  filename: string;
  mime_type: string | null;
  title: string | null;
  author: string | null;
  cover_path: string | null;
  size_bytes: number | null;
  year: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

interface UseBooksParams {
  category?: string;
  limit?: number;
}

export const useBooks = (params: UseBooksParams = {}) => {
  return useQuery({
    queryKey: ['books', params],
    queryFn: async () => {
      let query = supabase.from('books_uploads').select('*');

      if (params.category) {
        query = query.eq('category', params.category);
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query.order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as Book[];
    },
  });
};

export const useBook = (id: string) => {
  return useQuery({
    queryKey: ['books', 'single', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books_uploads')
        .select('*')
        .eq('id', id)
        // books_uploads is currently empty, so every read hit 406. A missing
        // book is a not-found for BookReader to render.
        .maybeSingle();

      if (error) throw error;
      return data as Book | null;
    },
    enabled: !!id,
  });
};

/**
 * The insert path for books. `books_uploads` had read, render and empty-state
 * paths but no way to gain a row — the whole Books surface was unreachable by
 * construction. Storage write is admin-only by RLS
 * (`public_buckets_admin_insert`), as is the table insert, so the database
 * refuses non-admin uploads regardless of what the UI shows.
 */
export interface UploadBookInput {
  file: File;
  category: string;
  title: string;
  author?: string;
  year?: number;
}

export const useUploadBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, category, title, author, year }: UploadBookInput) => {
      const safeName = file.name.replace(/[^\w.-]+/g, '_');
      const filepath = `${category}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(filepath, file, { cacheControl: '31536000', upsert: false });
      if (uploadError) throw uploadError;

      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('books_uploads')
        .insert({
          category,
          filepath,
          filename: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          title: title || file.name,
          author: author || null,
          year: year ?? null,
          uploaded_by: auth?.user?.id ?? null,
        })
        .select()
        .single();

      if (error) {
        // The row is the catalogue entry; without it the object is orphaned.
        await supabase.storage.from('books').remove([filepath]);
        throw error;
      }
      return data as Book;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useBookCategories = () => {
  return useQuery({
    queryKey: ['books', 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books_uploads')
        .select('category')
        .order('category');

      if (error) throw error;
      
      // Get unique categories
      const categories = [...new Set(data?.map(b => b.category) || [])];
      return categories;
    },
  });
};
