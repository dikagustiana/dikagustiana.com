/**
 * BookUploadCard — the admin insert path for the library.
 *
 * `books_uploads` had select hooks, a list page, a reader and an empty state,
 * and no way for a row to ever exist. This is the missing way in. Renders
 * nothing for non-admins; the storage bucket and the table both refuse
 * non-admin writes by RLS, so the UI gate is a courtesy, not the defence.
 */

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUploadBook } from '@/hooks/queries/useBooks';

const ACCEPTED = ['application/pdf', 'application/epub+zip'];
const MAX_BYTES = 50 * 1024 * 1024; // 50MB

export function BookUploadCard({ category }: { category: string }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const upload = useUploadBook();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');

  if (!isAdmin) return null;

  const pick = (f: File | null) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      toast({
        title: 'Unsupported file',
        description: 'Upload a PDF or EPUB.',
        variant: 'destructive',
      });
      return;
    }
    if (f.size > MAX_BYTES) {
      toast({
        title: 'File too large',
        description: `${(f.size / 1024 / 1024).toFixed(1)}MB — the limit is 50MB.`,
        variant: 'destructive',
      });
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.(pdf|epub)$/i, ''));
  };

  const submit = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync({
        file,
        category,
        title: title.trim() || file.name,
        author: author.trim() || undefined,
        year: year.trim() ? Number(year) : undefined,
      });
      toast({ title: 'Book added' });
      setFile(null);
      setTitle('');
      setAuthor('');
      setYear('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="mb-8 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Add a book to this category
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          ref={fileRef}
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {file && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor="book-title">Title</Label>
              <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="book-author">Author</Label>
              <Input
                id="book-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="book-year">Year</Label>
              <Input
                id="book-year"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="Optional"
              />
            </div>
          </div>
        )}
        <Button onClick={submit} disabled={!file || upload.isPending} size="sm">
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          Upload book
        </Button>
      </CardContent>
    </Card>
  );
}
