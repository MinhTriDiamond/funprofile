import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, HandCoins } from 'lucide-react';
import { DonationDialog } from './DonationDialog';
import { cn } from '@/lib/utils';

interface DonationButtonProps {
  recipientId: string;
  recipientUsername: string;
  recipientWalletAddress?: string | null;
  recipientAvatarUrl?: string | null;
  postId?: string;
  variant?: 'default' | 'profile' | 'post' | 'icon';
  className?: string;
}

export const DonationButton = ({
  recipientId,
  recipientUsername,
  recipientWalletAddress,
  recipientAvatarUrl,
  postId,
  variant = 'default',
  className,
}: DonationButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (variant === 'icon') {
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
        <DonationDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          recipientId={recipientId}
          recipientUsername={recipientUsername}
          recipientWalletAddress={recipientWalletAddress}
          recipientAvatarUrl={recipientAvatarUrl}
          postId={postId}
        />
      </>
    );
  }

  if (variant === 'post') {
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
        <DonationDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          recipientId={recipientId}
          recipientUsername={recipientUsername}
          recipientWalletAddress={recipientWalletAddress}
          recipientAvatarUrl={recipientAvatarUrl}
          postId={postId}
        />
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
        <DonationDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          recipientId={recipientId}
          recipientUsername={recipientUsername}
          recipientWalletAddress={recipientWalletAddress}
          recipientAvatarUrl={recipientAvatarUrl}
          postId={postId}
        />
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
        <DonationDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          recipientId={recipientId}
          recipientUsername={recipientUsername}
          recipientWalletAddress={recipientWalletAddress}
          recipientAvatarUrl={recipientAvatarUrl}
          postId={postId}
        />
    </>
  );
};
