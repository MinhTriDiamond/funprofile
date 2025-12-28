import { useState, useEffect, useCallback, useRef } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Video, X, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface VideoUploaderUppyProps {
  onUploadComplete: (result: { uid: string; url: string; thumbnailUrl: string }) => void;
  onUploadError?: (error: Error) => void;
  onUploadStart?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  selectedFile?: File | null;
}

interface UploadState {
  status: 'idle' | 'preparing' | 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  uploadSpeed: number;
  videoUid?: string;
  error?: string;
}

// 50MB chunk size for stability
const CHUNK_SIZE = 50 * 1024 * 1024;

export const VideoUploaderUppy = ({
  onUploadComplete,
  onUploadError,
  onUploadStart,
  onRemove,
  disabled = false,
  selectedFile,
}: VideoUploaderUppyProps) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    bytesUploaded: 0,
    bytesTotal: 0,
    uploadSpeed: 0,
  });
  
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const lastBytesRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const isUploadingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tusUploadRef.current) {
        tusUploadRef.current.abort();
        tusUploadRef.current = null;
      }
    };
  }, []);

  // Warn user before leaving page during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploadingRef.current) {
        e.preventDefault();
        e.returnValue = 'Video đang được tải lên. Bạn có chắc muốn rời đi?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Start upload when file is selected
  useEffect(() => {
    if (!selectedFile) return;

    const startUpload = async () => {
      try {
        isUploadingRef.current = true;
        
        setUploadState({
          status: 'preparing',
          progress: 0,
          bytesUploaded: 0,
          bytesTotal: selectedFile.size,
          uploadSpeed: 0,
        });

        onUploadStart?.();

        console.log('[VideoUploader] Starting upload, file size:', selectedFile.size);

        // Step 1: Get Direct Upload URL from our backend
        const { data, error } = await supabase.functions.invoke('stream-video', {
          body: {
            action: 'get-tus-upload-url',
            fileSize: selectedFile.size,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
          },
        });

        if (error) {
          console.error('[VideoUploader] Failed to get upload URL:', error);
          throw new Error(error.message || 'Không thể tạo URL tải lên');
        }

        const { uploadUrl, uid } = data;

        if (!uploadUrl || !uid) {
          throw new Error('Không nhận được URL tải lên từ server');
        }

        console.log('[VideoUploader] Got Direct Upload URL:', {
          uploadUrl: uploadUrl.substring(0, 80),
          uid,
        });

        // Save UID to state
        setUploadState(prev => ({
          ...prev,
          videoUid: uid,
          status: 'uploading',
        }));

        // Step 2: Upload directly to Cloudflare using tus-js-client
        // NO AUTH HEADERS NEEDED - this is a Direct Creator Upload URL
        const upload = new tus.Upload(selectedFile, {
          uploadUrl, // Use the pre-signed URL directly
          chunkSize: CHUNK_SIZE,
          retryDelays: [0, 1000, 3000, 5000, 10000],
          removeFingerprintOnSuccess: true,
          // No headers needed for Direct Creator Upload!
          headers: {},
          metadata: {
            filename: selectedFile.name,
            filetype: selectedFile.type,
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const now = Date.now();
            const timeDiff = (now - lastTimeRef.current) / 1000;
            const bytesDiff = bytesUploaded - lastBytesRef.current;
            const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

            lastBytesRef.current = bytesUploaded;
            lastTimeRef.current = now;

            const progress = Math.round((bytesUploaded / bytesTotal) * 100);

            console.log('[VideoUploader] Progress:', progress + '%');

            setUploadState(prev => ({
              ...prev,
              progress,
              bytesUploaded,
              bytesTotal,
              uploadSpeed: speed > 0 ? speed : prev.uploadSpeed,
            }));
          },
          onSuccess: async () => {
            console.log('[VideoUploader] Upload complete! UID:', uid);

            setUploadState(prev => ({
              ...prev,
              status: 'processing',
              progress: 100,
            }));

            // Update video settings to make it public
            try {
              await supabase.functions.invoke('stream-video', {
                body: {
                  action: 'update-video-settings',
                  uid,
                  requireSignedURLs: false,
                  allowedOrigins: ['*'],
                },
              });
              console.log('[VideoUploader] Video settings updated');
            } catch (err) {
              console.warn('[VideoUploader] Failed to update settings:', err);
            }

            // Success!
            const streamUrl = `https://iframe.videodelivery.net/${uid}`;
            const thumbnailUrl = `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=1s`;
            
            setUploadState(prev => ({
              ...prev,
              status: 'ready',
            }));

            isUploadingRef.current = false;
            toast.success('Video đã tải lên thành công!');
            onUploadComplete({ uid, url: streamUrl, thumbnailUrl });
          },
          onError: (error) => {
            console.error('[VideoUploader] TUS upload error:', error);
            isUploadingRef.current = false;

            setUploadState(prev => ({
              ...prev,
              status: 'error',
              error: error?.message || 'Tải lên thất bại',
            }));

            onUploadError?.(error || new Error('Upload failed'));
            toast.error(`Tải lên thất bại: ${error?.message || 'Vui lòng thử lại'}`);
          },
        });

        tusUploadRef.current = upload;

        // Start the upload
        console.log('[VideoUploader] Starting TUS upload to Cloudflare...');
        upload.start();

      } catch (error) {
        console.error('[VideoUploader] Error:', error);
        isUploadingRef.current = false;

        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));

        onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
        toast.error(`Lỗi: ${errorMessage}`);
      }
    };

    startUpload();
  }, [selectedFile, onUploadComplete, onUploadError, onUploadStart]);

  const handleCancel = useCallback(() => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    isUploadingRef.current = false;

    setUploadState({
      status: 'idle',
      progress: 0,
      bytesUploaded: 0,
      bytesTotal: 0,
      uploadSpeed: 0,
    });
    onRemove?.();
  }, [onRemove]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getETA = (): string => {
    if (uploadState.uploadSpeed <= 0) return '--:--';
    const remaining = uploadState.bytesTotal - uploadState.bytesUploaded;
    const seconds = remaining / uploadState.uploadSpeed;
    return formatTime(seconds);
  };

  // Don't render anything if idle and no file
  if (uploadState.status === 'idle' && !selectedFile) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4" data-video-uid={uploadState.videoUid}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm">Tải video lên</span>
        </div>
        
        {uploadState.status !== 'ready' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={disabled}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Preparing state */}
      {uploadState.status === 'preparing' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang chuẩn bị...</span>
        </div>
      )}

      {/* Progress display */}
      {uploadState.status === 'uploading' && (
        <div className="space-y-3">
          <Progress value={uploadState.progress} className="h-3" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatBytes(uploadState.bytesUploaded)} / {formatBytes(uploadState.bytesTotal)}
            </span>
            <span className="font-medium text-primary">{Math.round(uploadState.progress)}%</span>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            {uploadState.uploadSpeed > 0 && (
              <span>Tốc độ: {formatSpeed(uploadState.uploadSpeed)}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Còn lại: {getETA()}
            </span>
          </div>

          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Vui lòng không đóng trình duyệt khi đang tải lên!
          </div>
        </div>
      )}

      {/* Processing state with thumbnail preview */}
      {uploadState.status === 'processing' && uploadState.videoUid && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden">
            <img 
              src={`https://videodelivery.net/${uploadState.videoUid}/thumbnails/thumbnail.jpg?time=1s`}
              alt="Video thumbnail"
              className="w-full h-32 object-cover bg-muted"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
              <span className="text-white text-sm ml-2">Đang xử lý...</span>
            </div>
          </div>
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-600 dark:text-blue-400">
            🎬 Bé chờ một chút để có thể xem video nhé!
          </div>
        </div>
      )}

      {/* Success state with thumbnail preview */}
      {uploadState.status === 'ready' && uploadState.videoUid && (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden">
            <img 
              src={`https://videodelivery.net/${uploadState.videoUid}/thumbnails/thumbnail.jpg?time=1s`}
              alt="Video thumbnail"
              className="w-full h-32 object-cover bg-muted"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded px-2 py-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-white text-xs">Sẵn sàng</span>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {uploadState.status === 'error' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{uploadState.error || 'Tải lên thất bại'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="w-full"
          >
            Thử lại
          </Button>
        </div>
      )}
    </div>
  );
};
