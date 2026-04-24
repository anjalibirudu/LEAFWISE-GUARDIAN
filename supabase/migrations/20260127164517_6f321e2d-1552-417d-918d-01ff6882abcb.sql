-- Drop the existing restrictive SELECT policy and replace with one that explicitly requires authentication
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a new SELECT policy that explicitly requires authentication AND ownership
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);