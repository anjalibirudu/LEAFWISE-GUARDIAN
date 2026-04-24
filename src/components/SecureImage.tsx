import { useSignedImageUrl } from '@/hooks/useSignedImageUrl';
import { Skeleton } from '@/components/ui/skeleton';

interface SecureImageProps {
  imagePath: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * A component that displays images from private storage buckets using signed URLs.
 * Automatically handles URL generation and loading states.
 */
export function SecureImage({ imagePath, alt, className = '', fallback }: SecureImageProps) {
  const { signedUrl, loading } = useSignedImageUrl(imagePath);

  if (loading) {
    return fallback || <Skeleton className={className} />;
  }

  if (!signedUrl) {
    return fallback || <div className={`bg-muted ${className}`} />;
  }

  return (
    <img 
      src={signedUrl} 
      alt={alt}
      className={className}
    />
  );
}
