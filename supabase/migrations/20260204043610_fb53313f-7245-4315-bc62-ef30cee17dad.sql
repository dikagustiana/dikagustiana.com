-- Drop existing policy and recreate with proper role specification
DROP POLICY IF EXISTS "Admins can modify FSLI sections" ON public.fsli_sections;

-- Create policy that explicitly targets authenticated users
CREATE POLICY "Admins can modify FSLI sections"
ON public.fsli_sections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));