import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, HandCoins } from 'lucide-react';
import { UnifiedGiftSendDialog } from './UnifiedGiftSendDialog';
import { cn } from '@/lib/utils';

interface DonationButtonProps {
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName?: string | null;
  recipientWalletAddress?: string | null;
  recipientAvatarUrl?: string | null;
  postId?: string;
  variant?: 'default' | 'profile' | 'post' | 'icon';
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

  if (variant === 'icon' || variant === 'post') {
    return (
      <>
        <button
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 min-h-[48px] rounded-lg transition-colors hover:bg-secondary text-muted-foreground active:bg-secondary/80',
            className
          )}
        >
          <HandCoins className="w-5 h-5 text-gold" />
          <span className="font-semibold text-xs sm:text-sm">Tặng</span>
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
          Tặng Quà
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
        Tặng Quà
      </Button>
      {dialog}
    </>
  );
};
