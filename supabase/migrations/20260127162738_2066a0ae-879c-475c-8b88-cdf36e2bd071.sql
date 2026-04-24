-- Add storage policies for leaf-images bucket to ensure only authorized users can access images

-- Users can view their own uploaded images
CREATE POLICY "Users can view own images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'leaf-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload images to their own folder
CREATE POLICY "Users can upload own images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'leaf-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'leaf-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Experts can view images needing review (via prediction status)
CREATE POLICY "Experts can view review images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'leaf-images' 
  AND public.has_role(auth.uid(), 'expert')
);

-- Admins can view all images
CREATE POLICY "Admins can view all images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'leaf-images' 
  AND public.has_role(auth.uid(), 'admin')
);