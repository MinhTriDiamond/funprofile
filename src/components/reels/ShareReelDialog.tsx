import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useReels } from '@/hooks/useReels';
import { Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShareReelDialogProps {
  reelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareReelDialog = ({ reelId, open, onOpenChange }: ShareReelDialogProps) => {
  const { t } = useLanguage();
  const { shareReel } = useReels();
  const reelUrl = `${window.location.origin}/reels/${reelId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(reelUrl);
    toast.success(t('linkCopied'));
  };

  const handleShare = () => {
    shareReel.mutate({ reelId, sharedTo: 'feed' });
    onOpenChange(false);
    toast.success(t('shareReelText'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" /> {t('shareReel')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button onClick={handleCopyLink} variant="outline" className="w-full justify-start gap-2">
            <Copy className="w-4 h-4" /> {t('copyLink')}
          </Button>
          <Button onClick={handleShare} className="w-full justify-start gap-2">
            <Share2 className="w-4 h-4" /> {t('shareToProfile')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
