-- Drop existing SELECT policy that may not explicitly restrict to authenticated users
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a more secure policy that explicitly restricts to authenticated users only
CREATE POLICY "Users can view own profile"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);