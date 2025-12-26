import { memo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, Upload, Clock, Zap } from 'lucide-react';
import { formatBytes, formatDuration } from '@/utils/streamUpload';

export type VideoUploadState = 
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error';

interface VideoUploadProgressProps {
  state: VideoUploadState;
  progress: number;
  fileName?: string;
  errorMessage?: string;
  // Enhanced progress info
  bytesUploaded?: number;
  bytesTotal?: number;
  uploadSpeed?: number;
  eta?: number;
}

/**
 * Enhanced video upload progress indicator
 * Shows upload progress, speed, ETA, and file size
 */
export const VideoUploadProgress = memo(({
  state,
  progress,
  fileName,
  errorMessage,
  bytesUploaded = 0,
  bytesTotal = 0,
  uploadSpeed = 0,
  eta = 0,
}: VideoUploadProgressProps) => {
  if (state === 'idle') return null;

  return (
    <div className="p-4 bg-secondary/50 rounded-lg border border-border/50">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {state === 'uploading' && (
            <div className="relative">
              <Upload className="w-5 h-5 text-primary animate-pulse" />
            </div>
          )}
          {state === 'processing' && (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
          {state === 'ready' && (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
          {state === 'error' && (
            <XCircle className="w-5 h-5 text-destructive" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate max-w-[200px]">
              {fileName || 'Video'}
            </span>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0 font-mono">
              {state === 'uploading' && `${progress}%`}
              {state === 'processing' && 'Đang xử lý...'}
              {state === 'ready' && 'Hoàn thành!'}
              {state === 'error' && 'Lỗi'}
            </span>
          </div>

          {/* Progress bar */}
          {(state === 'uploading' || state === 'processing') && (
            <Progress 
              value={state === 'processing' ? 100 : progress} 
              className="h-2 mb-2"
            />
          )}

          {/* Upload details (only show when uploading) */}
          {state === 'uploading' && bytesTotal > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {/* File size progress */}
              <span className="font-mono">
                {formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)}
              </span>
              
              {/* Upload speed */}
              {uploadSpeed > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {formatBytes(uploadSpeed)}/s
                </span>
              )}
              
              {/* ETA */}
              {eta > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{formatDuration(eta)}
                </span>
              )}
            </div>
          )}

          {/* Processing message */}
          {state === 'processing' && (
            <p className="text-xs text-muted-foreground">
              Cloudflare đang xử lý video của bạn...
            </p>
          )}

          {/* Success message */}
          {state === 'ready' && (
            <p className="text-xs text-green-600">
              Video đã sẵn sàng để phát!
            </p>
          )}

          {/* Error message */}
          {state === 'error' && errorMessage && (
            <p className="text-xs text-destructive mt-1">{errorMessage}</p>
          )}
        </div>
      </div>

      {/* Warning for large uploads */}
      {state === 'uploading' && bytesTotal > 100 * 1024 * 1024 && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-700 dark:text-yellow-400">
          ⚠️ Video lớn - vui lòng không đóng tab trong khi upload
        </div>
      )}
    </div>
  );
});

VideoUploadProgress.displayName = 'VideoUploadProgress';

export default VideoUploadProgress;
