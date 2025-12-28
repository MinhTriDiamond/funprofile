import { useState, useEffect, useCallback, useRef } from 'react';
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Video, X, Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

// Note: We use custom Progress component instead of Uppy's built-in CSS

interface VideoUploaderUppyProps {
  onUploadComplete: (result: { uid: string; url: string }) => void;
  onUploadError?: (error: Error) => void;
  onUploadStart?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  selectedFile?: File | null;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  uploadSpeed: number;
  videoUid?: string;
  error?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const TUS_PROXY_ENDPOINT = `${SUPABASE_URL}/functions/v1/stream-video?action=tus-proxy`;

// 150MB chunk size as recommended by Cloudflare
const CHUNK_SIZE = 150 * 1024 * 1024;

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

  // Initialize Uppy instance
  useEffect(() => {
    const initUppy = async () => {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        console.error('[VideoUploaderUppy] No auth token');
        return;
      }

      const uppy = new Uppy({
        id: 'video-uploader',
        autoProceed: false,
        allowMultipleUploadBatches: false,
        restrictions: {
          maxFileSize: 1024 * 1024 * 1024, // 1GB max
          maxNumberOfFiles: 1,
          allowedFileTypes: ['video/*'],
        },
        debug: true,
      });

      // Configure TUS plugin with proxy endpoint
      uppy.use(Tus, {
        endpoint: TUS_PROXY_ENDPOINT,
        chunkSize: CHUNK_SIZE,
        retryDelays: [0, 1000, 3000, 5000],
        removeFingerprintOnSuccess: true,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        // Don't try to resume - URLs expire quickly
        storeFingerprintForResuming: false,
        // Cloudflare-specific metadata
        onBeforeRequest: async (req) => {
          // Refresh token before each request
          const currentSession = await supabase.auth.getSession();
          const token = currentSession.data.session?.access_token;
          if (token) {
            req.setHeader('Authorization', `Bearer ${token}`);
          }
          console.log('[VideoUploaderUppy] TUS request to:', req.getURL());
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

      // Event handlers
      uppy.on('upload', () => {
        console.log('[VideoUploaderUppy] Upload started');
        onUploadStart?.();
        setUploadState(prev => ({
          ...prev,
          status: 'uploading',
          progress: 0,
        }));
      });

      uppy.on('progress', (progress) => {
        const now = Date.now();
        const timeDiff = (now - lastTimeRef.current) / 1000;
        const bytesDiff = (uppy.getState().totalProgress / 100) * (uploadState.bytesTotal || 0) - lastBytesRef.current;
        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

        lastBytesRef.current = (progress / 100) * (uploadState.bytesTotal || 0);
        lastTimeRef.current = now;

        setUploadState(prev => ({
          ...prev,
          progress,
          uploadSpeed: speed > 0 ? speed : prev.uploadSpeed,
        }));
      });

      uppy.on('upload-progress', (file, progress) => {
        if (file && progress) {
          setUploadState(prev => ({
            ...prev,
            bytesUploaded: progress.bytesUploaded || 0,
            bytesTotal: progress.bytesTotal || 0,
          }));
        }
      });

      uppy.on('upload-success', async (file, response) => {
        console.log('[VideoUploaderUppy] Upload success:', response);
        
        // Get UID from state or try to extract from upload URL
        let videoUid = uploadState.videoUid;
        
        if (!videoUid && response.uploadURL) {
          // Extract UID from URL like: https://upload.videodelivery.net/tus/abc123...
          const match = response.uploadURL.match(/\/([a-f0-9]{32})/);
          if (match) {
            videoUid = match[1];
          }
        }

        if (!videoUid) {
          console.error('[VideoUploaderUppy] Could not determine video UID');
          setUploadState(prev => ({
            ...prev,
            status: 'error',
            error: 'Could not get video ID',
          }));
          onUploadError?.(new Error('Could not get video ID'));
          return;
        }

        setUploadState(prev => ({
          ...prev,
          status: 'processing',
          progress: 100,
          videoUid,
        }));

        // Update video settings to disable signed URLs
        try {
          await supabase.functions.invoke('stream-video', {
            body: {
              action: 'update-video-settings',
              uid: videoUid,
              requireSignedURLs: false,
              allowedOrigins: ['*'],
            },
          });
          console.log('[VideoUploaderUppy] Video settings updated');
        } catch (err) {
          console.warn('[VideoUploaderUppy] Failed to update settings:', err);
        }

        // Success!
        const streamUrl = `https://iframe.videodelivery.net/${videoUid}`;
        setUploadState(prev => ({
          ...prev,
          status: 'ready',
        }));
        
        toast.success('Video uploaded successfully!');
        onUploadComplete({ uid: videoUid, url: streamUrl });
      });

      uppy.on('upload-error', (file, error, response) => {
        console.error('[VideoUploaderUppy] Upload error:', error, response);
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: error?.message || 'Upload failed',
        }));
        onUploadError?.(error || new Error('Upload failed'));
        toast.error(`Upload failed: ${error?.message || 'Please try again'}`);
      });

      uppy.on('error', (error) => {
        console.error('[VideoUploaderUppy] Uppy error:', error);
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: error?.message || 'Unknown error',
        }));
      });

      uppyRef.current = uppy;
    };

    initUppy();

    return () => {
      if (uppyRef.current) {
        uppyRef.current.cancelAll();
        uppyRef.current = null;
      }
    };
  }, []);

  // Handle file selection from parent
  useEffect(() => {
    if (selectedFile && uppyRef.current) {
      // Clear any existing files
      uppyRef.current.cancelAll();
      
      // Add the new file
      try {
        uppyRef.current.addFile({
          name: selectedFile.name,
          type: selectedFile.type,
          data: selectedFile,
          source: 'Local',
        });
        
        setUploadState(prev => ({
          ...prev,
          bytesTotal: selectedFile.size,
        }));

        // Start upload immediately
        uppyRef.current.upload();
      } catch (err) {
        console.error('[VideoUploaderUppy] Error adding file:', err);
      }
    }
  }, [selectedFile]);

  const handleCancel = useCallback(() => {
    if (uppyRef.current) {
      uppyRef.current.cancelAll();
    }
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

  // Don't render anything if idle and no file
  if (uploadState.status === 'idle' && !selectedFile) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm">Video Upload</span>
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

      {/* Progress display */}
      {uploadState.status === 'uploading' && (
        <div className="space-y-2">
          <Progress value={uploadState.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatBytes(uploadState.bytesUploaded)} / {formatBytes(uploadState.bytesTotal)}
            </span>
            <span>{Math.round(uploadState.progress)}%</span>
          </div>
          {uploadState.uploadSpeed > 0 && (
            <div className="text-xs text-muted-foreground">
              Speed: {formatSpeed(uploadState.uploadSpeed)}
            </div>
          )}
        </div>
      )}

      {/* Processing state */}
      {uploadState.status === 'processing' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing video...</span>
        </div>
      )}

      {/* Success state */}
      {uploadState.status === 'ready' && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>Video ready!</span>
        </div>
      )}

      {/* Error state */}
      {uploadState.status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{uploadState.error || 'Upload failed'}</span>
        </div>
      )}
    </div>
  );
};
