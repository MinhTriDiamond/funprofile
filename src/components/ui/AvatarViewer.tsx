import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarViewerProps {
  imageUrl?: string | null;
  isOpen: boolean;
  onClose: () => void;
  fallbackText?: string;
}

export const AvatarViewer = ({ imageUrl, isOpen, onClose, fallbackText }: AvatarViewerProps) => {
  if (!isOpen) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/90 animate-in fade-in-0" onClick={onClose} />
        <DialogPrimitive.Content
          className="fixed z-[200] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[400px] aspect-square rounded-full overflow-hidden focus:outline-none"
        >
          <button
            className="absolute right-2 top-2 z-10 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary">
              <span className="text-6xl font-bold text-primary-foreground">
                {fallbackText || '?'}
              </span>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
