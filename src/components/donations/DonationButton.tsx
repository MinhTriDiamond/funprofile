import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, HandCoins } from 'lucide-react';
import { UnifiedGiftSendDialog } from './UnifiedGiftSendDialog';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface DonationButtonProps {
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName?: string | null;
  recipientWalletAddress?: string | null;
  recipientBtcAddress?: string | null;
  recipientAvatarUrl?: string | null;
  postId?: string;
  variant?: 'default' | 'profile' | 'post' | 'icon' | 'footer';
  className?: string;
}

export const DonationButton = ({
  recipientId,
  recipientUsername,
  recipientDisplayName,
  recipientWalletAddress,
  recipientAvatarUrl,
  postId,
  variant = 'default',
  className,
}: DonationButtonProps) => {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const presetRecipient = {
    id: recipientId,
    username: recipientUsername,
    displayName: recipientDisplayName,
    walletAddress: recipientWalletAddress,
    avatarUrl: recipientAvatarUrl,
  };

  const dialog = (
    <UnifiedGiftSendDialog
      isOpen={isDialogOpen}
      onClose={() => setIsDialogOpen(false)}
      mode="post"
      presetRecipient={presetRecipient}
      postId={postId}
    />
  );

  if (variant === 'footer') {
    return (
      <>
        <button
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80 text-sm font-medium',
            className
          )}
        >
          <HandCoins className="w-[18px] h-[18px] text-gold" />
          <span>{t('gift')}</span>
        </button>
        {dialog}
      </>
    );
  }

  if (variant === 'icon' || variant === 'post') {
    return (
      <>
        <button
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            'p-2.5 rounded-full transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80',
            className
          )}
        >
          <HandCoins className="w-5 h-5 text-gold" />
        </button>
        {dialog}
      </>
    );
  }

  if (variant === 'profile') {
    return (
      <>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            'font-semibold px-4 h-10 bg-gradient-to-r from-gold/90 to-amber-500/90 hover:from-gold hover:to-amber-500 text-primary-foreground border-0 shadow-md hover:shadow-lg transition-all duration-300',
            className
          )}
        >
          <Gift className="w-4 h-4 mr-2" />
          {t('gift')}
        </Button>
        {dialog}
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        variant="outline"
        className={cn(
          'border-gold/50 hover:border-gold hover:bg-gold/10 text-gold',
          className
        )}
      >
        <Gift className="w-4 h-4 mr-2" />
        {t('gift')}
      </Button>
      {dialog}
    </>
  );
};
