import { useCallback, useState } from 'react';

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  /** Base path where object storage routes are mounted (default: "/api/storage") */
  basePath?: string;
  /** Extra headers to include when requesting the presigned URL (e.g. Authorization) */
  requestHeaders?: Record<string, string>;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads with presigned URLs.
 *
 * Two-step flow:
 * 1. Request a presigned URL from your backend (sends JSON metadata, NOT the file)
 * 2. Upload the file directly to the presigned URL (goes to GCS)
 */
export function useUpload(options: UseUploadOptions = {}) {
  const basePath = options.basePath ?? '/api/storage';
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const requestUploadUrl = useCallback(
    async (file: File): Promise<UploadResponse> => {
      const response = await fetch(`${basePath}/uploads/request-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.requestHeaders ?? {}),
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      return response.json();
    },
    [basePath, options.requestHeaders],
  );

  const uploadToPresignedUrl = useCallback(
    async (file: File, uploadURL: string): Promise<void> => {
      const response = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload file to storage');
      }
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        setProgress(10);
        const uploadResponse = await requestUploadUrl(file);
        setProgress(30);
        await uploadToPresignedUrl(file, uploadResponse.uploadURL);
        setProgress(100);
        options.onSuccess?.(uploadResponse);
        return uploadResponse;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error('Upload failed');
        setError(uploadError);
        options.onError?.(uploadError);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [requestUploadUrl, uploadToPresignedUrl, options],
  );

  return { uploadFile, isUploading, error, progress };
}
