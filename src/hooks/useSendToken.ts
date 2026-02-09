import { useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { encodeERC20Transfer } from '@/lib/erc20';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { validateEvmAddress } from '@/utils/walletValidation';
import type { WalletToken } from '@/lib/tokens';

interface SendTokenParams {
  token: WalletToken;
  recipient: string;
  amount: string;
}

export function useSendToken() {
  const { address, isConnected, chainId } = useAccount();
  const { sendTransactionAsync, isPending } = useSendTransaction();
  const [isProcessing, setIsProcessing] = useState(false);

  const sendToken = async (params: SendTokenParams): Promise<string | null> => {
    const { token, recipient, amount } = params;

    if (!isConnected || !address) {
      toast.error('Vui lòng kết nối ví trước');
      return null;
    }

    if (!validateEvmAddress(recipient)) return null;

    if (recipient.toLowerCase() === address.toLowerCase()) {
      toast.error('Không thể gửi cho chính mình');
      return null;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Số lượng không hợp lệ');
      return null;
    }

    setIsProcessing(true);
    let txHash: string | null = null;

    try {
      if (!token.address) {
        // Native BNB transfer
        txHash = await sendTransactionAsync({
          to: recipient as `0x${string}`,
          value: parseEther(amount),
        });
      } else {
        // ERC20 token transfer
        const data = encodeERC20Transfer(
          recipient as `0x${string}`,
          amount,
          token.decimals,
        );
        txHash = await sendTransactionAsync({
          to: token.address,
          data,
        });
      }

      // Save to transactions table
      const { data: { user } } = await supabase.auth.getUser();
      if (user && txHash) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          tx_hash: txHash,
          from_address: address,
          to_address: recipient,
          amount: amount,
          token_symbol: token.symbol,
          chain_id: chainId || 56,
          status: 'pending',
        });
      }

      const scanUrl = getBscScanTxUrl(txHash!, token.symbol);
      toast.success('Giao dịch đã được gửi!', {
        action: {
          label: 'BscScan',
          onClick: () => window.open(scanUrl, '_blank'),
        },
      });

      return txHash;
    } catch (error: any) {
      if (error?.message?.includes('rejected') || error?.message?.includes('denied')) {
        toast.error('Giao dịch đã bị từ chối');
      } else if (error?.message?.includes('insufficient')) {
        toast.error('Không đủ số dư hoặc BNB để trả phí gas');
      } else {
        toast.error(error?.message || 'Không thể gửi giao dịch');
      }
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { sendToken, isPending: isPending || isProcessing };
}
