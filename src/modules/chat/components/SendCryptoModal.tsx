import { UnifiedGiftSendDialog } from '@/components/donations/UnifiedGiftSendDialog';

interface SendCryptoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUserId: string;
  recipientUsername: string;
  recipientWalletAddress: string | null;
  conversationId: string;
  recipientAvatarUrl?: string | null;
  recipientDisplayName?: string | null;
}

export function SendCryptoModal({
  open,
  onOpenChange,
  recipientUserId,
  recipientUsername,
  recipientWalletAddress,
  recipientAvatarUrl,
  recipientDisplayName,
}: SendCryptoModalProps) {
  return (
    <UnifiedGiftSendDialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      mode="wallet"
      presetRecipient={{
        id: recipientUserId,
        username: recipientUsername,
        displayName: recipientDisplayName,
        avatarUrl: recipientAvatarUrl,
        walletAddress: recipientWalletAddress,
      }}
    />
  );
}
