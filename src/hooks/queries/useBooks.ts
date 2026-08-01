import { useQuery } from '@tanstack/react-query';
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
        // maybeSingle, not single: `single()` returns HTTP 406 for zero rows,
        // which the reader saw as a failed request rather than "no such book".
        .maybeSingle();

      if (error) throw error;
      return (data as Book) ?? null;
    },
    enabled: !!id,
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
