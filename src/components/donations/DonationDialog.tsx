import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TokenSelector, SUPPORTED_TOKENS, TokenOption } from './TokenSelector';
import { QuickGiftPicker, MESSAGE_TEMPLATES, MessageTemplate } from './QuickGiftPicker';
import { DonationSuccessCard, DonationCardData } from './DonationSuccessCard';
import { useDonation } from '@/hooks/useDonation';
import { useAccount, useConnect, useBalance } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Loader2, Wallet, Gift, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { formatEther } from 'viem';
import { supabase } from '@/integrations/supabase/client';

interface DonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientUsername: string;
  recipientWalletAddress?: string | null;
  recipientAvatarUrl?: string | null;
  postId?: string;
}

export const DonationDialog = ({
  isOpen,
  onClose,
  recipientId,
  recipientUsername,
  recipientWalletAddress,
  recipientAvatarUrl,
  postId,
}: DonationDialogProps) => {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  
  const [selectedToken, setSelectedToken] = useState<TokenOption>(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successCardData, setSuccessCardData] = useState<DonationCardData | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Get wallet balance
  const { data: balance } = useBalance({
    address,
    token: selectedToken.address as `0x${string}` | undefined,
  });

  const { donate, isProcessing } = useDonation({
    onSuccess: (data) => {
      setSuccessCardData(data);
      setShowSuccessCard(true);
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSelectedTemplate(null);
      setCustomMessage('');
      setSelectedToken(SUPPORTED_TOKENS[0]);
    }
  }, [isOpen]);

  const handleConnectWallet = () => {
    connect({ connector: injected() });
  };

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    if (template.id !== 'custom') {
      setCustomMessage(template.message);
    } else {
      setCustomMessage('');
    }
  };

  const handleSelectQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleDonate = async () => {
    if (!recipientWalletAddress) {
      toast.error('Người nhận chưa thiết lập ví');
      return;
    }

    const result = await donate({
      recipientId,
      recipientUsername,
      recipientWalletAddress,
      recipientAvatarUrl,
      amount,
      tokenSymbol: selectedToken.symbol,
      tokenAddress: selectedToken.address,
      tokenDecimals: selectedToken.decimals,
      message: customMessage,
      messageTemplate: selectedTemplate?.id,
      postId,
    });

    if (result) {
      // Keep dialog open for success card
    }
  };

  const handleCloseSuccessCard = () => {
    setShowSuccessCard(false);
    setSuccessCardData(null);
    onClose();
  };

  const isValidAmount = parseFloat(amount) >= 10;
  const hasEnoughBalance = balance && parseFloat(amount) <= parseFloat(formatEther(balance.value));

  return (
    <>
      <Dialog open={isOpen && !showSuccessCard} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-gold" />
              Tặng quà cho @{recipientUsername}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Check if recipient has wallet */}
            {!recipientWalletAddress && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Người nhận chưa thiết lập ví</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Người này cần kết nối ví Web3 trước khi có thể nhận quà.
                  </p>
                </div>
                
                {/* Hướng Dẫn Nhận Quà Button */}
                <Button
                  onClick={async () => {
                    setIsSendingReminder(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        toast.error('Bạn cần đăng nhập để gửi hướng dẫn');
                        return;
                      }
                      
                      const { data, error } = await supabase.functions.invoke('notify-gift-ready', {
                        body: {
                          recipientId,
                          notificationType: 'no_wallet',
                        },
                      });
                      
                      if (error) throw error;
                      
                      toast.success(`Đã gửi hướng dẫn nhận quà cho @${recipientUsername}!`);
                      onClose();
                    } catch (error) {
                      console.error('Error sending reminder:', error);
                      toast.error('Không thể gửi hướng dẫn. Vui lòng thử lại.');
                    } finally {
                      setIsSendingReminder(false);
                    }
                  }}
                  disabled={isSendingReminder}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {isSendingReminder ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Hướng Dẫn Nhận Quà
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Connect wallet prompt */}
            {!isConnected && recipientWalletAddress && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Wallet className="w-5 h-5" />
                    <span className="font-medium">Kết nối ví để tặng</span>
                  </div>
                  <Button
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Kết nối'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {recipientWalletAddress && (
              <>
                {/* Token Selection */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Chọn token:
                  </label>
                  <TokenSelector
                    selectedToken={selectedToken}
                    onSelect={setSelectedToken}
                  />
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Số lượng:
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      min="10"
                      className="text-lg font-semibold pr-20"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{selectedToken.symbol}</span>
                      {balance && (
                        <button
                          type="button"
                          onClick={() => setAmount(formatEther(balance.value))}
                          className="text-xs text-primary hover:underline"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>
                  {balance && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Số dư: {parseFloat(formatEther(balance.value)).toLocaleString()} {selectedToken.symbol}
                    </p>
                  )}
                  {amount && parseFloat(amount) < 10 && (
                    <p className="text-xs text-destructive mt-1">
                      Số lượng tối thiểu là 10 token
                    </p>
                  )}
                </div>

                {/* Quick Picks */}
                <QuickGiftPicker
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={handleSelectTemplate}
                  onSelectAmount={handleSelectQuickAmount}
                  currentAmount={amount}
                />

                {/* Custom Message */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Lời nhắn:
                  </label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => {
                      setCustomMessage(e.target.value);
                      if (selectedTemplate?.id !== 'custom') {
                        setSelectedTemplate(MESSAGE_TEMPLATES.find(t => t.id === 'custom') || null);
                      }
                    }}
                    placeholder="Nhập lời nhắn của bạn..."
                    rows={2}
                  />
                </div>

                {/* Recipient Preview */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <span className="text-sm text-muted-foreground">Gửi đến:</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={recipientAvatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {recipientUsername[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-mono text-sm">
                      {recipientWalletAddress.slice(0, 8)}...{recipientWalletAddress.slice(-6)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Hủy
              </Button>
              <Button
                onClick={handleDonate}
                disabled={
                  !isConnected ||
                  !recipientWalletAddress ||
                  !isValidAmount ||
                  !hasEnoughBalance ||
                  isProcessing
                }
                className="flex-1 bg-gradient-to-r from-gold to-amber-500 hover:from-gold/90 hover:to-amber-500/90 text-primary-foreground"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Gửi Tặng {amount && `${parseFloat(amount).toLocaleString()} ${selectedToken.symbol}`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Card */}
      {successCardData && (
        <DonationSuccessCard
          isOpen={showSuccessCard}
          onClose={handleCloseSuccessCard}
          data={successCardData}
        />
      )}
    </>
  );
};
