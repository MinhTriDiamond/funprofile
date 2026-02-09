import { useState, useMemo } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { bsc } from 'wagmi/chains';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useSendToken } from '@/hooks/useSendToken';
import { WALLET_TOKENS, BNB_GAS_BUFFER, type WalletToken } from '@/lib/tokens';
import { SendConfirmModal } from './SendConfirmModal';

interface SendTabProps {
  onSuccess?: () => void;
}

export const SendTab = ({ onSuccess }: SendTabProps) => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { tokens: balances } = useTokenBalances();
  const { sendToken, isPending } = useSendToken();

  const [selectedToken, setSelectedToken] = useState<WalletToken>(WALLET_TOKENS[0]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Get balance for selected token
  const tokenBalance = useMemo(() => {
    const found = balances.find(b => b.symbol === selectedToken.symbol);
    return found?.balance || 0;
  }, [balances, selectedToken]);

  const bnbBalance = useMemo(() => {
    return balances.find(b => b.symbol === 'BNB')?.balance || 0;
  }, [balances]);

  // USD value
  const usdValue = useMemo(() => {
    const found = balances.find(b => b.symbol === selectedToken.symbol);
    const price = found?.price || 0;
    const amt = parseFloat(amount) || 0;
    return amt * price;
  }, [balances, selectedToken, amount]);

  const isWrongNetwork = chainId !== bsc.id;

  const handleMax = () => {
    if (selectedToken.symbol === 'BNB') {
      const max = Math.max(0, tokenBalance - BNB_GAS_BUFFER);
      setAmount(max > 0 ? max.toString() : '0');
    } else {
      setAmount(tokenBalance > 0 ? tokenBalance.toString() : '0');
    }
  };

  const handleSendClick = () => {
    if (!recipient || !amount) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Số lượng không hợp lệ');
      return;
    }
    if (parsedAmount > tokenBalance) {
      toast.error('Số dư không đủ');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    const result = await sendToken({
      token: selectedToken,
      recipient,
      amount,
    });
    if (result) {
      setRecipient('');
      setAmount('');
      setShowConfirm(false);
      onSuccess?.();
    } else {
      setShowConfirm(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const isLargeAmount = parsedAmount > tokenBalance * 0.8 && parsedAmount > 0;
  const needsGasWarning = selectedToken.symbol !== 'BNB' && bnbBalance < 0.002 && parsedAmount > 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gửi Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wrong network warning */}
          {isWrongNetwork && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive flex-1">Vui lòng chuyển sang BNB Smart Chain</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => switchChain({ chainId: bsc.id })}
              >
                Switch
              </Button>
            </div>
          )}

          {/* Token Selector */}
          <div className="space-y-2">
            <Label>Chọn token</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {WALLET_TOKENS.map((token) => (
                <button
                  key={token.symbol}
                  type="button"
                  onClick={() => setSelectedToken(token)}
                  className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                    selectedToken.symbol === token.symbol
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <img src={token.logo} alt={token.symbol} className="w-7 h-7 rounded-full" />
                  <span className="text-xs font-medium mt-1">{token.symbol}</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Số dư: {tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedToken.symbol}
            </p>
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Địa chỉ nhận</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Số lượng ({selectedToken.symbol})</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleMax} className="shrink-0">
                MAX
              </Button>
            </div>
            {usdValue > 0 && (
              <p className="text-xs text-muted-foreground">≈ ${usdValue.toFixed(2)} USD</p>
            )}
          </div>

          {/* Warnings */}
          {isLargeAmount && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">Bạn đang gửi hơn 80% số dư token.</p>
            </div>
          )}

          {needsGasWarning && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">
                BNB còn {bnbBalance.toFixed(4)}. Cần tối thiểu 0.002 BNB để trả phí gas.
              </p>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendClick}
            disabled={!isConnected || isPending || isWrongNetwork || !recipient || !amount}
            className="w-full"
          >
            {isPending ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </CardContent>
      </Card>

      <SendConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSend}
        token={selectedToken}
        amount={amount}
        recipient={recipient}
        bnbBalance={bnbBalance}
        isLoading={isPending}
      />
    </>
  );
};
