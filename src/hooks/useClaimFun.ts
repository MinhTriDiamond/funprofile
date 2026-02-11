import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { bscTestnet } from 'wagmi/chains';
import { toast } from 'sonner';
import { FUN_MONEY_CONTRACT, FUN_MONEY_ABI, toWei, getTxUrl } from '@/config/pplp';

interface UseClaimFunOptions {
  onSuccess?: () => void;
}

export const useClaimFun = (options?: UseClaimFunOptions) => {
  const { address } = useAccount();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isSuccess && txHash) {
      toast.success('Claim FUN thành công!', {
        description: 'FUN đã được chuyển vào ví của bạn.',
        action: {
          label: 'Xem TX',
          onClick: () => window.open(getTxUrl(txHash), '_blank'),
        },
      });
      options?.onSuccess?.();
    }
  }, [isSuccess, txHash]);

  const claimFun = async (amount: number) => {
    if (!address || amount <= 0) return;

    try {
      const amountWei = toWei(amount);

      await writeContractAsync({
        account: address,
        chain: bscTestnet,
        address: FUN_MONEY_CONTRACT.address,
        abi: FUN_MONEY_ABI,
        functionName: 'claim',
        args: [amountWei],
      });
    } catch (error: any) {
      console.error('[useClaimFun] Error:', error);

      if (error.message?.includes('User rejected')) {
        toast.error('Đã hủy giao dịch');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Không đủ BNB để trả gas');
      } else {
        toast.error(error.shortMessage || 'Không thể claim FUN');
      }
    }
  };

  return {
    claimFun,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    isProcessing: isPending || isConfirming,
  };
};
