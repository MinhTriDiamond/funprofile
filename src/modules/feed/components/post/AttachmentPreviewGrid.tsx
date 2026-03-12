/**
 * AttachmentPreviewGrid — Grid preview with edit/remove/reorder
 */
import { useMemo } from 'react';
import { ArrowLeft, ArrowRight, Captions, Loader2, AlertCircle, Pencil, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DraftAttachment } from '../../types';

interface AttachmentPreviewGridProps {
  attachments: DraftAttachment[];
  disabled?: boolean;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

export function AttachmentPreviewGrid({
  attachments,
  disabled,
  onEdit,
  onRemove,
  onMove,
}: AttachmentPreviewGridProps) {
  const sorted = useMemo(
    () => [...attachments].sort((a, b) => a.sortOrder - b.sortOrder),
    [attachments],
  );

  const imageCount = sorted.filter((a) => a.kind === 'image').length;

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((attachment, index) => (
          <div
            key={attachment.id}
            className="relative group aspect-square rounded-lg overflow-hidden bg-muted border border-border"
          >
            {/* Preview */}
            {attachment.kind === 'image' ? (
              <img
                src={attachment.previewUrl || attachment.fileUrl}
                alt={attachment.altText || 'Attachment'}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/80">
                {attachment.previewUrl ? (
                  <img
                    src={attachment.previewUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover opacity-60"
                    draggable={false}
                  />
                ) : null}
                <Play className="absolute h-8 w-8 text-white drop-shadow-lg" />
              </div>
            )}

            {/* Type badge */}
            <span className="absolute top-1 left-1 text-[10px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded">
              {attachment.kind === 'image' ? 'Image' : 'Video'}
            </span>

            {/* Alt text indicator */}
            {attachment.altText ? (
              <span className="absolute top-1 left-14 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Captions className="h-3 w-3" /> Alt
              </span>
            ) : null}

            {/* Loading overlay */}
            {attachment.uploadStatus === 'uploading' ? (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : null}

            {/* Error overlay */}
            {attachment.error ? (
              <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center p-2">
                <div className="text-center">
                  <AlertCircle className="h-4 w-4 text-destructive mx-auto mb-1" />
                  <span className="text-[10px] text-destructive">{attachment.error}</span>
                </div>
              </div>
            ) : null}

            {/* Action buttons — visible on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              {attachment.kind === 'image' ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => onEdit(attachment.id)}
                  disabled={disabled}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              ) : null}

              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-7 w-7"
                onClick={() => onRemove(attachment.id)}
                disabled={disabled}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>

              {index > 0 ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => onMove(attachment.id, -1)}
                  disabled={disabled}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              ) : null}

              {index < sorted.length - 1 ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => onMove(attachment.id, 1)}
                  disabled={disabled}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
        <span>
          {imageCount} ảnh{sorted.some((a) => a.kind === 'video') ? ' · 1 video' : ''}
        </span>
      </div>
    </div>
  );
}
