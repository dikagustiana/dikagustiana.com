-- Create storage bucket for essay images
INSERT INTO storage.buckets (id, name, public)
VALUES ('essay-images', 'essay-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Anyone can read essay images
CREATE POLICY "Essay images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'essay-images');

-- RLS policy: Only admins can upload images
CREATE POLICY "Admins can upload essay images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'essay-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policy: Admins can update/delete images
CREATE POLICY "Admins can update essay images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'essay-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete essay images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'essay-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);