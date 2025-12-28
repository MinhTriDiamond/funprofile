import { useState, useEffect, useCallback, useRef } from 'react';
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Video, X, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface VideoUploaderUppyProps {
  onUploadComplete: (result: { uid: string; url: string }) => void;
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Use our edge function as TUS endpoint (it proxies to Cloudflare)
const TUS_ENDPOINT = `${SUPABASE_URL}/functions/v1/stream-video`;

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
  
  const uppyRef = useRef<Uppy | null>(null);
  const lastBytesRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const isUploadingRef = useRef(false);

  // Cleanup Uppy on unmount
  useEffect(() => {
    return () => {
      if (uppyRef.current) {
        uppyRef.current.cancelAll();
        uppyRef.current = null;
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

        // Get auth token
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;
        
        if (!accessToken) {
          throw new Error('Bạn cần đăng nhập để tải video');
        }

        console.log('[VideoUploaderUppy] Starting upload, file size:', selectedFile.size);

        // Create Uppy instance - use our edge function as endpoint
        // The edge function will proxy to Cloudflare and return Location header
        const uppy = new Uppy({
          id: 'video-uploader',
          autoProceed: true,
          allowMultipleUploadBatches: false,
          restrictions: {
            maxFileSize: 1024 * 1024 * 1024, // 1GB max
            maxNumberOfFiles: 1,
            allowedFileTypes: ['video/*'],
          },
          debug: import.meta.env.DEV,
        });

        // Configure TUS - point to our edge function which handles the proxy
        uppy.use(Tus, {
          endpoint: TUS_ENDPOINT,
          chunkSize: CHUNK_SIZE,
          retryDelays: [0, 1000, 3000, 5000, 10000],
          removeFingerprintOnSuccess: true,
          storeFingerprintForResuming: false,
          // These headers are sent with the initial POST to our edge function
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          // Ensure Tus-Resumable header is sent with ALL requests (including PATCH to Cloudflare)
          onBeforeRequest: async (req) => {
            req.setHeader('Tus-Resumable', '1.0.0');
            
            // For requests to our edge function, include auth
            const url = req.getURL();
            if (url.includes('functions/v1/stream-video')) {
              const currentSession = await supabase.auth.getSession();
              const token = currentSession.data.session?.access_token;
              if (token) {
                req.setHeader('Authorization', `Bearer ${token}`);
              }
            }
            
            console.log('[VideoUploaderUppy] TUS request:', req.getMethod(), url);
          },
          onAfterResponse: (req, res) => {
            console.log('[VideoUploaderUppy] TUS response:', res.getStatus(), {
              location: res.getHeader('Location'),
              streamMediaId: res.getHeader('stream-media-id'),
            });
            
            // Extract video UID from response
            const streamMediaId = res.getHeader('stream-media-id');
            if (streamMediaId) {
              setUploadState(prev => ({ ...prev, videoUid: streamMediaId }));
            }
          },
        });

        setUploadState(prev => ({
          ...prev,
          status: 'uploading',
        }));

        // Event handlers
        uppy.on('progress', (progress) => {
          const now = Date.now();
          const timeDiff = (now - lastTimeRef.current) / 1000;
          const currentBytes = (progress / 100) * selectedFile.size;
          const bytesDiff = currentBytes - lastBytesRef.current;
          const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

          lastBytesRef.current = currentBytes;
          lastTimeRef.current = now;

          setUploadState(prev => ({
            ...prev,
            progress,
            bytesUploaded: currentBytes,
            uploadSpeed: speed > 0 ? speed : prev.uploadSpeed,
          }));
        });

        uppy.on('upload-progress', (file, progress) => {
          if (file && progress) {
            setUploadState(prev => ({
              ...prev,
              bytesUploaded: progress.bytesUploaded || 0,
              bytesTotal: progress.bytesTotal || selectedFile.size,
            }));
          }
        });

        uppy.on('upload-success', async (file, response) => {
          console.log('[VideoUploaderUppy] Upload success!', response);
          
          // Get UID from state or try to extract from upload URL
          let videoUid = uploadState.videoUid;
          
          if (!videoUid && response.uploadURL) {
            // Try to extract UID from URL like: https://upload.videodelivery.net/tus/abc123...
            const match = response.uploadURL.match(/\/tus\/([a-f0-9]{32})/);
            if (match) {
              videoUid = match[1];
            }
          }

          if (!videoUid) {
            // If still no UID, check the current state again
            videoUid = (document.querySelector('[data-video-uid]') as HTMLElement)?.dataset.videoUid;
          }

          setUploadState(prev => ({
            ...prev,
            status: 'processing',
            progress: 100,
            videoUid: videoUid || prev.videoUid,
          }));

          // Use the UID from state if available
          const finalUid = videoUid || uploadState.videoUid;

          if (finalUid) {
            // Update video settings
            try {
              await supabase.functions.invoke('stream-video', {
                body: {
                  action: 'update-video-settings',
                  uid: finalUid,
                  requireSignedURLs: false,
                  allowedOrigins: ['*'],
                },
              });
              console.log('[VideoUploaderUppy] Video settings updated');
            } catch (err) {
              console.warn('[VideoUploaderUppy] Failed to update settings:', err);
            }

            // Success!
            const streamUrl = `https://iframe.videodelivery.net/${finalUid}`;
            
            setUploadState(prev => ({
              ...prev,
              status: 'ready',
            }));

            isUploadingRef.current = false;
            toast.success('Video đã tải lên thành công!');
            onUploadComplete({ uid: finalUid, url: streamUrl });
          } else {
            console.warn('[VideoUploaderUppy] Upload completed but no UID found');
            // Still mark as ready - video is uploaded
            setUploadState(prev => ({
              ...prev,
              status: 'ready',
            }));
            isUploadingRef.current = false;
            toast.success('Video đã tải lên!');
            
            // Try to get URL from response
            if (response.uploadURL) {
              onUploadComplete({ uid: 'unknown', url: response.uploadURL });
            }
          }
        });

        uppy.on('upload-error', (file, error) => {
          console.error('[VideoUploaderUppy] Upload error:', error);
          isUploadingRef.current = false;
          
          setUploadState(prev => ({
            ...prev,
            status: 'error',
            error: error?.message || 'Tải lên thất bại',
          }));
          
          onUploadError?.(error || new Error('Upload failed'));
          toast.error(`Tải lên thất bại: ${error?.message || 'Vui lòng thử lại'}`);
        });

        uppy.on('error', (error) => {
          console.error('[VideoUploaderUppy] Uppy error:', error);
          isUploadingRef.current = false;
        });

        uppyRef.current = uppy;

        // Add file and start upload
        uppy.addFile({
          name: selectedFile.name,
          type: selectedFile.type,
          data: selectedFile,
          source: 'Local',
        });

      } catch (error) {
        console.error('[VideoUploaderUppy] Error:', error);
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
    if (uppyRef.current) {
      uppyRef.current.cancelAll();
      uppyRef.current = null;
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

  // Calculate ETA
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

      {/* Processing state */}
      {uploadState.status === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang xử lý video...</span>
          </div>
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-600 dark:text-blue-400">
            🎬 Bé chờ một chút để có thể xem video nhé!
          </div>
        </div>
      )}

      {/* Success state */}
      {uploadState.status === 'ready' && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Video đã sẵn sàng! 🎉</span>
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
