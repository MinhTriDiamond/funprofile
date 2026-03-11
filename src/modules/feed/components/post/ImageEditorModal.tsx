/**
 * ImageEditorModal — Lazy-loads Filerobot image editor with crop, rotate, text, alt text
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { Crop, RotateCw, Tag, Type, Captions, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DraftAttachment } from '../../types';

interface ImageEditorModalProps {
  attachment: DraftAttachment | null;
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    file: File;
    previewUrl: string;
    width?: number;
    height?: number;
    altText: string;
    transformMeta?: Record<string, unknown> | null;
  }) => void;
}

type EditorMenuItem = 'crop' | 'rotate' | 'tag' | 'text' | 'alt' | 'filters';

const MENU_ITEMS: Array<{
  id: EditorMenuItem;
  label: string;
  icon: typeof Crop;
  disabled?: boolean;
}> = [
  { id: 'crop', label: 'Cắt', icon: Crop },
  { id: 'rotate', label: 'Xoay', icon: RotateCw },
  { id: 'tag', label: 'Gắn thẻ', icon: Tag, disabled: true },
  { id: 'text', label: 'Chữ', icon: Type },
  { id: 'alt', label: 'Alt Text', icon: Captions },
  { id: 'filters', label: 'Bộ lọc', icon: Sparkles, disabled: true },
];

function dataUrlToFile(dataUrl: string, originalName: string): File {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = /data:(.*?);base64/.exec(meta || '');
  const mimeType = mimeMatch?.[1] || 'image/png';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const ext = mimeType.split('/')[1] || 'png';
  const safeName = originalName.replace(/\.[^/.]+$/, '') || 'edited-image';
  return new File([bytes], `${safeName}.${ext}`, { type: mimeType });
}

function getEditedImageBase64(editedImageObject: any): string | null {
  return (
    editedImageObject?.imageBase64 ||
    editedImageObject?.fullName ||
    editedImageObject?.fullResImageBase64 ||
    editedImageObject?.canvas?.toDataURL?.('image/png') ||
    null
  );
}

export function ImageEditorModal({
  attachment,
  open,
  onClose,
  onSave,
}: ImageEditorModalProps) {
  const [selectedMenu, setSelectedMenu] = useState<EditorMenuItem>('crop');
  const [altText, setAltText] = useState('');
  const [editorModule, setEditorModule] = useState<{
    Editor: any;
    TABS: Record<string, any>;
    TOOLS: Record<string, any>;
  } | null>(null);

  useEffect(() => {
    setAltText(attachment?.altText || '');
    setSelectedMenu('crop');
  }, [attachment]);

  // Lazy load Filerobot editor
  useEffect(() => {
    if (!open || editorModule) return;

    let cancelled = false;
    import('react-filerobot-image-editor').then((mod) => {
      if (cancelled) return;
      setEditorModule({
        Editor: mod.default,
        TABS: (mod as any).TABS || {},
        TOOLS: (mod as any).TOOLS || {},
      });
    }).catch((err) => {
      console.error('Failed to load image editor:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [open, editorModule]);

  if (!attachment) return null;

  const previewSrc = attachment.previewUrl || attachment.fileUrl;

  const handleEditorSave = (editedImageObject: any) => {
    const base64 = getEditedImageBase64(editedImageObject);
    if (!base64) return;

    const file = dataUrlToFile(base64, attachment.file?.name || 'edited');
    const previewUrl = URL.createObjectURL(file);

    onSave({
      file,
      previewUrl,
      width: editedImageObject?.width,
      height: editedImageObject?.height,
      altText,
      transformMeta: {
        editedAt: new Date().toISOString(),
        tool: 'filerobot',
      },
    });
  };

  const handleAltTextSave = () => {
    if (!attachment.file) return;
    // Just update alt text without re-encoding the image
    onSave({
      file: attachment.file,
      previewUrl: attachment.previewUrl || '',
      width: attachment.width,
      height: attachment.height,
      altText,
      transformMeta: attachment.transformMeta,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-center text-lg font-bold">
            Chỉnh sửa ảnh
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left menu */}
          <div className="w-28 border-r border-border py-3 flex flex-col gap-1 shrink-0">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedMenu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => setSelectedMenu(item.id)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 text-xs transition-colors rounded-lg mx-1 ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted'
                  } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Main area */}
          <div className="flex-1 overflow-auto p-4">
            {selectedMenu === 'alt' ? (
              <div className="space-y-4">
                <div>
                  {previewSrc && (
                    <img
                      src={previewSrc}
                      alt="Preview"
                      className="max-h-[300px] mx-auto rounded-lg object-contain"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Alt Text (mô tả ảnh cho người khiếm thị)
                  </label>
                  <Input
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Mô tả nội dung trong ảnh..."
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {altText.length}/500
                  </p>
                </div>
                <Button onClick={handleAltTextSave} className="w-full">
                  Lưu Alt Text
                </Button>
              </div>
            ) : editorModule && previewSrc ? (
              <div className="h-[500px]">
                <editorModule.Editor
                  source={previewSrc}
                  onSave={handleEditorSave}
                  annotationsCommon={{ fill: '#ff0000' }}
                  Text={{ text: 'Text' }}
                  Rotate={{ componentType: 'slider', angle: 0 }}
                  tabsIds={[
                    editorModule.TABS?.ADJUST,
                    editorModule.TABS?.ANNOTATE,
                  ].filter(Boolean)}
                  defaultTabId={editorModule.TABS?.ADJUST}
                  defaultToolId={editorModule.TOOLS?.CROP}
                  savingPixelRatio={2}
                  previewPixelRatio={window.devicePixelRatio}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Đang tải trình chỉnh sửa...
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
