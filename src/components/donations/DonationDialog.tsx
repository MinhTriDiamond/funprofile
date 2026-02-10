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
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { validateMinSendValue } from '@/lib/minSendValidation';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Loader2, Wallet, Gift, AlertCircle, Send, Copy, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { formatEther, formatUnits } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { EmojiPicker } from '@/components/feed/EmojiPicker';
import { bsc } from 'wagmi/chains';

// ERC20 ABI for balanceOf
const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

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
  const { openConnectModal } = useConnectModal();
  const { tokens: tokenBalanceList } = useTokenBalances();
  
  const [selectedToken, setSelectedToken] = useState<TokenOption>(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successCardData, setSuccessCardData] = useState<DonationCardData | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [senderDisplayName, setSenderDisplayName] = useState('');

  // Get native BNB balance
  const { data: bnbBalance } = useBalance({
    address,
    chainId: bsc.id,
  });

  // Get ERC20 token balance (for FUN, CAMLY)
  const { data: tokenBalance } = useReadContract({
    address: selectedToken.address as `0x${string}` | undefined,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: bsc.id,
  });

  // Calculate formatted balance based on selected token
  const getFormattedBalance = () => {
    if (selectedToken.symbol === 'BNB') {
      return bnbBalance ? parseFloat(bnbBalance.formatted) : 0;
    }
    if (tokenBalance) {
      return parseFloat(formatUnits(tokenBalance as bigint, selectedToken.decimals));
    }
    return 0;
  };

  const formattedBalance = getFormattedBalance();
  const hasBalance = formattedBalance > 0;

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
      setSenderDisplayName('');
    }
  }, [isOpen]);

  const handleConnectWallet = () => {
    openConnectModal?.();
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

  const handleMaxAmount = () => {
    if (hasBalance) {
      // Leave a small buffer for gas if BNB
      if (selectedToken.symbol === 'BNB') {
        const maxBnb = Math.max(0, formattedBalance - 0.001);
        setAmount(maxBnb.toString());
      } else {
        setAmount(formattedBalance.toString());
      }
    }
  };

  const handleCopyAddress = () => {
    if (recipientWalletAddress) {
      navigator.clipboard.writeText(recipientWalletAddress);
      toast.success('Đã copy địa chỉ ví');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setCustomMessage(prev => prev + emoji);
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
      senderDisplayName: senderDisplayName || undefined,
      tokenPriceUSD: selectedTokenPrice,
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

  // Get USD price for the selected token from useTokenBalances
  const selectedTokenPrice = (() => {
    const found = tokenBalanceList.find(t => t.symbol === selectedToken.symbol);
    return found?.price ?? null;
  })();

  const parsedAmountNum = parseFloat(amount) || 0;
  const minSendCheck = parsedAmountNum > 0
    ? validateMinSendValue(parsedAmountNum, selectedTokenPrice)
    : { valid: false } as { valid: boolean; message?: string };
  const estimatedUsd = parsedAmountNum * (selectedTokenPrice || 0);

  const isValidAmount = minSendCheck.valid;
  const hasEnoughBalance = formattedBalance >= parsedAmountNum;

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
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    Kết nối
                  </Button>
                </div>
              </div>
            )}

            {recipientWalletAddress && (
              <>
                {/* Sender Display Name */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Tên hiển thị (tùy chọn):
                  </label>
                  <Input
                    value={senderDisplayName}
                    onChange={(e) => setSenderDisplayName(e.target.value)}
                    placeholder="Nhập tên bạn muốn hiển thị..."
                    className="text-sm"
                  />
                </div>

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
                      className="text-lg font-semibold pr-24"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{selectedToken.symbol}</span>
                      {hasBalance && (
                        <button
                          type="button"
                          onClick={handleMaxAmount}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>
                  {isConnected && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Số dư: {formattedBalance.toLocaleString(undefined, { maximumFractionDigits: selectedToken.decimals })} {selectedToken.symbol}
                    </p>
                  )}
                  {estimatedUsd > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${estimatedUsd.toFixed(4)} USD
                    </p>
                  )}
                  {parsedAmountNum > 0 && !minSendCheck.valid && minSendCheck.message && (
                    <p className="text-xs text-destructive mt-1">
                      {minSendCheck.message}
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

                {/* Custom Message with Emoji Picker */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Lời nhắn:
                  </label>
                  <div className="relative">
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
                      className="pr-12"
                    />
                    <div className="absolute right-2 bottom-2">
                      <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                    </div>
                  </div>
                </div>

                {/* Recipient Preview with Copy Button */}
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
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="Copy địa chỉ ví"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
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
