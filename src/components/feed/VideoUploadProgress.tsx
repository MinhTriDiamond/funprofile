import { memo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, Upload } from 'lucide-react';

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
}

/**
 * Video upload progress indicator
 * Shows upload progress and processing status
 */
export const VideoUploadProgress = memo(({
  state,
  progress,
  fileName,
  errorMessage,
}: VideoUploadProgressProps) => {
  if (state === 'idle') return null;

  return (
    <div className="p-3 bg-secondary/50 rounded-lg">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {state === 'uploading' && (
            <Upload className="w-5 h-5 text-primary animate-pulse" />
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
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">
              {fileName || 'Video'}
            </span>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              {state === 'uploading' && `${progress}%`}
              {state === 'processing' && 'Đang xử lý...'}
              {state === 'ready' && 'Sẵn sàng'}
              {state === 'error' && 'Lỗi'}
            </span>
          </div>

          {/* Progress bar */}
          {(state === 'uploading' || state === 'processing') && (
            <Progress 
              value={state === 'processing' ? 100 : progress} 
              className="h-1.5"
            />
          )}

          {/* Error message */}
          {state === 'error' && errorMessage && (
            <p className="text-xs text-destructive mt-1">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
});

VideoUploadProgress.displayName = 'VideoUploadProgress';

export default VideoUploadProgress;
