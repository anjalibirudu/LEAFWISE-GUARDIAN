import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to generate signed URLs for images stored in private buckets.
 * This is necessary because the leaf-images bucket is private for security.
 * 
 * @param imagePath - The file path stored in the database (could be a path or full URL for legacy data)
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Object containing the signed URL and loading state
 */
export function useSignedImageUrl(imagePath: string | null | undefined, expiresIn: number = 3600) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) {
      setLoading(false);
      return;
    }

    const generateSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        // Extract the file path from the URL if it's a full URL (legacy data)
        let filePath = imagePath;
        
        // Check if it's a full Supabase storage URL
        if (imagePath.includes('/storage/v1/object/public/leaf-images/')) {
          filePath = imagePath.split('/storage/v1/object/public/leaf-images/')[1];
        } else if (imagePath.includes('/storage/v1/object/sign/leaf-images/')) {
          filePath = imagePath.split('/storage/v1/object/sign/leaf-images/')[1].split('?')[0];
        }

        // Generate signed URL
        const { data, error: signError } = await supabase.storage
          .from('leaf-images')
          .createSignedUrl(filePath, expiresIn);

        if (signError) {
          console.error('Error generating signed URL:', signError);
          setError(signError.message);
          // Fallback to original path in case it's an external URL
          setSignedUrl(imagePath);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error in useSignedImageUrl:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSignedUrl(imagePath);
      } finally {
        setLoading(false);
      }
    };

    generateSignedUrl();
  }, [imagePath, expiresIn]);

  return { signedUrl, loading, error };
}

/**
 * Utility function to generate a signed URL for an image path.
 * Use this for batch operations or when you need to generate URLs outside of React components.
 */
export async function generateSignedUrl(
  imagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!imagePath) return null;

  try {
    // Extract the file path from the URL if it's a full URL (legacy data)
    let filePath = imagePath;
    
    if (imagePath.includes('/storage/v1/object/public/leaf-images/')) {
      filePath = imagePath.split('/storage/v1/object/public/leaf-images/')[1];
    } else if (imagePath.includes('/storage/v1/object/sign/leaf-images/')) {
      filePath = imagePath.split('/storage/v1/object/sign/leaf-images/')[1].split('?')[0];
    }

    const { data, error } = await supabase.storage
      .from('leaf-images')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error generating signed URL:', error);
      return imagePath; // Fallback
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error in generateSignedUrl:', err);
    return imagePath;
  }
}
