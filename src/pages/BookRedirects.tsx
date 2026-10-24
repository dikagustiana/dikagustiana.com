/**
 * The old Books addresses (PRD D8), kept working: /books/:category lands on its shelf,
 * /books/:category/:bookId/read on its book's dialog. A category is a shelf's slug (the shelves migration
 * made one shelf per category, under the category's slug). A book id that no longer resolves lands on its
 * shelf instead.
 */
import { Navigate, useParams } from 'react-router-dom';
import { LoadingState } from '@/components/states';
import { useBookById } from '@/hooks/queries/useBooks';

const shelfUrl = (category: string | undefined) => (category ? `/books-academia?shelf=${encodeURIComponent(category)}` : '/books-academia');

export function BooksCategoryRedirect() {
  const { category } = useParams();
  return <Navigate to={shelfUrl(category)} replace />;
}

export function BookRedirect() {
  const { category, bookId } = useParams();
  const { data, isLoading, isError } = useBookById(bookId);
  if (isLoading) return <LoadingState />;
  if (data && !isError) return <Navigate to={`/books-academia?book=${encodeURIComponent(data.slug)}`} replace />;
  return <Navigate to={shelfUrl(category)} replace />;
}
