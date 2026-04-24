-- Make leaf-images bucket private (policy already exists for authenticated access)
UPDATE storage.buckets SET public = false WHERE id = 'leaf-images';

-- Remove public SELECT policy if it exists
DROP POLICY IF EXISTS "Public can view leaf images" ON storage.objects;