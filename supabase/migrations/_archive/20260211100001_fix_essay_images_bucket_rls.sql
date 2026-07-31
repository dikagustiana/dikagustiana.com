-- Ensure essay-images bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('essay-images', 'essay-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies (ignore errors if names differ)
DROP POLICY IF EXISTS "Essay images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload essay images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update essay images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete essay images" ON storage.objects;
DROP POLICY IF EXISTS "essay_images_select" ON storage.objects;
DROP POLICY IF EXISTS "essay_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "essay_images_update" ON storage.objects;
DROP POLICY IF EXISTS "essay_images_delete" ON storage.objects;

-- Recreate with direct subqueries (avoids issues with custom function calls in storage policies)
CREATE POLICY "essay_images_select" ON storage.objects
FOR SELECT USING (bucket_id = 'essay-images');

CREATE POLICY "essay_images_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'essay-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "essay_images_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'essay-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "essay_images_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'essay-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
