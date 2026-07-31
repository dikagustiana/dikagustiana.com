-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Published essays are publicly readable" ON essays;

-- Create a new policy that allows all essays to be read publicly
-- (content visibility can be controlled at the application level)
CREATE POLICY "Essays are publicly readable"
  ON essays
  FOR SELECT
  USING (true);
