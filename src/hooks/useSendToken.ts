import { useState, useCallback } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { usePublicClient } from 'wagmi';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { encodeERC20Transfer } from '@/lib/erc20';
import { getBscScanTxUrl } from '@/lib/bscScanHelpers';
import { validateEvmAddress } from '@/utils/walletValidation';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import type { WalletToken } from '@/lib/tokens';

export type TxStep = 'idle' | 'signing' | 'broadcasted' | 'confirming' | 'finalizing' | 'success' | 'timeout';

interface SendTokenParams {
  token: WalletToken;
  recipient: string;
  amount: string;
}

const DB_TIMEOUT_MS = 8_000;
const RECEIPT_TIMEOUT_MS = 60_000;

/** Bọc promise với timeout — không block UI */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms),
    ),
  ]);
}

export function useSendToken() {
  const { address: providerAddress, isConnected, chainId } = useAccount();
  const { activeAddress, accounts } = useActiveAccount();
  const { sendTransactionAsync, isPending: wagmiPending } = useSendTransaction();
  const publicClient = usePublicClient();

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const resetState = useCallback(() => {
    setTxStep('idle');
    setTxHash(null);
    setIsProcessing(false);
  }, []);

  /** Kiểm tra lại receipt khi timeout */
  const recheckReceipt = useCallback(async () => {
    if (!txHash || !publicClient) return;
    setTxStep('confirming');
    try {
      const receipt = await withTimeout(
        publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}`, confirmations: 1 }),
        RECEIPT_TIMEOUT_MS,
        'RECHECK_RECEIPT',
      );
      if (receipt.status === 'success') {
        setTxStep('success');
        toast.success('Giao dịch đã được xác nhận thành công!');
      } else {
        toast.error('Giao dịch chưa hoàn tất (reverted). Vui lòng thử lại.');
        resetState();
      }
    } catch {
      setTxStep('timeout');
      toast('Chưa nhận được xác nhận. Vui lòng kiểm tra trên BscScan.');
    }
  }, [txHash, publicClient, resetState]);

  const sendToken = async (params: SendTokenParams): Promise<string | null> => {
    const { token, recipient, amount } = params;
    const senderAddress = activeAddress || providerAddress;

    // --- Validation ---
    if (!isConnected || !senderAddress) {
      toast.error('Vui lòng kết nối ví trước');
      return null;
    }
    if (activeAddress && accounts.length > 0 && !accounts.includes(activeAddress.toLowerCase())) {
      toast.error('Tài khoản cần được xác minh lại. Vui lòng kết nối lại.');
      return null;
    }
    if (activeAddress && providerAddress && activeAddress.toLowerCase() !== providerAddress.toLowerCase()) {
      toast.error('Tài khoản trong ví khác với tài khoản đang chọn. Vui lòng đồng bộ trước khi gửi.');
      return null;
    }
    if (!validateEvmAddress(recipient)) return null;
    if (recipient.toLowerCase() === senderAddress.toLowerCase()) {
      toast.error('Vui lòng nhập địa chỉ người nhận khác');
      return null;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Số lượng chưa hợp lệ');
      return null;
    }

    // --- Begin send flow ---
    setIsProcessing(true);
    setTxHash(null);
    let hash: string | null = null;

    try {
      // Step 1: Signing
      console.log('[SEND] SIGN_REQUESTED');
      setTxStep('signing');

      if (!token.address) {
        hash = await sendTransactionAsync({
          account: senderAddress as `0x${string}`,
          to: recipient as `0x${string}`,
          value: parseEther(amount),
        });
      } else {
        const data = encodeERC20Transfer(recipient as `0x${string}`, amount, token.decimals);
        hash = await sendTransactionAsync({
          account: senderAddress as `0x${string}`,
          to: token.address,
          data,
        });
      }

      // Step 2: Broadcasted — return hash IMMEDIATELY, run rest in background
      console.log('[SEND] TX_HASH_RECEIVED:', hash);
      setTxHash(hash);
      setTxStep('broadcasted');

      // Background: receipt polling + DB insert (non-blocking)
      (async () => {
        let receiptOk = false;
        try {
          if (publicClient && hash) {
            console.log('[SEND] WAIT_RECEIPT_START (background)');
            setTxStep('confirming');
            const receipt = await withTimeout(
              publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, confirmations: 1 }),
              RECEIPT_TIMEOUT_MS,
              'WAIT_RECEIPT',
            );
            console.log('[SEND] RECEIPT_RECEIVED:', receipt.status);
            if (receipt.status === 'reverted') {
              toast.error('Giao dịch chưa hoàn tất (reverted).');
              setTxStep('idle');
              return;
            }
            receiptOk = true;
          }
        } catch (receiptErr: any) {
          console.log('[SEND] RECEIPT_TIMEOUT_OR_ERROR:', receiptErr?.message);
        }

        // DB insert
        try {
          console.log('[SEND] DB_LOG_START (background)');
          setTxStep('finalizing');
          const { data: { user } } = await supabase.auth.getUser();
          if (user && hash) {
            await withTimeout(
              Promise.resolve(supabase.from('transactions').insert({
                user_id: user.id,
                tx_hash: hash,
                from_address: senderAddress,
                to_address: recipient,
                amount: amount,
                token_symbol: token.symbol,
                chain_id: chainId || 56,
                status: receiptOk ? 'confirmed' : 'pending',
              })),
              DB_TIMEOUT_MS,
              'DB_INSERT',
            );
            console.log('[SEND] DB_LOG_DONE');
          }
        } catch (dbErr: any) {
          console.log('[SEND] DB_LOG_SKIPPED:', dbErr?.message);
        }

        if (receiptOk) {
          setTxStep('success');
          const scanUrl = getBscScanTxUrl(hash!, token.symbol);
          toast.success('Giao dịch đã được xác nhận thành công!', {
            action: { label: 'BscScan', onClick: () => window.open(scanUrl, '_blank') },
          });
        } else {
          setTxStep('timeout');
          const scanUrl = getBscScanTxUrl(hash!, token.symbol);
          toast('Giao dịch đã được gửi. Chưa nhận xác nhận kịp thời.', {
            action: { label: 'BscScan', onClick: () => window.open(scanUrl, '_blank') },
            duration: 8000,
          });
        }
      })();

      return hash;
    } catch (error: any) {
      console.log('[SEND] ERROR:', error?.message);
      if (error?.message?.includes('rejected') || error?.message?.includes('denied')) {
        toast.error('Bạn đã huỷ giao dịch');
      } else if (error?.message?.includes('insufficient')) {
        toast.error('Cần thêm BNB để trả phí gas');
      } else {
        toast.error(error?.shortMessage || error?.message || 'Mạng đang bận, vui lòng thử lại sau');
      }
      resetState();
      return null;
    } finally {
      console.log('[SEND] FLOW_FINALLY');
      setIsProcessing(false);
    }
  };

  return {
    sendToken,
    txStep,
    txHash,
    isPending: wagmiPending || isProcessing,
    recheckReceipt,
    resetState,
  };
}
