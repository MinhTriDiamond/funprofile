import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MINT_REQUEST_STATUS } from '@/config/pplp';

export interface MintRequestResult {
  id: string;
  amount: number;
  wallet: string;
  actions_count: number;
  status: string;
  eip712_data?: {
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: string;
    };
    recipient: string;
    amount: string;
    actionHash: string;
    nonce: string;
    deadline: number;
  };
}

export interface MintResult {
  success: boolean;
  mint_request: MintRequestResult;
}

export const useMintFun = () => {
  const [isMinting, setIsMinting] = useState(false);
  const [lastMint, setLastMint] = useState<MintRequestResult | null>(null);

  const mintPendingActions = async (actionIds: string[]): Promise<MintRequestResult | null> => {
    if (actionIds.length === 0) {
      toast.error('Không có action nào để mint');
      return null;
    }

    try {
      setIsMinting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập để mint FUN Money');
        return null;
      }

      const response = await supabase.functions.invoke('pplp-mint-fun', {
        body: { action_ids: actionIds },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        const result: MintRequestResult = {
          id: response.data.mint_request.id,
          amount: response.data.mint_request.amount,
          wallet: response.data.mint_request.wallet,
          actions_count: response.data.mint_request.actions_count,
          status: response.data.mint_request.status,
          eip712_data: response.data.mint_request.eip712_data,
        };
        
        setLastMint(result);
        
        // Show success message based on status
        if (result.status === MINT_REQUEST_STATUS.PENDING_SIG) {
          toast.success(
            `🌟 Yêu cầu mint ${result.amount} FUN đã được tạo! Đang chờ Admin ký và gửi lên blockchain.`,
            { duration: 5000 }
          );
        } else {
          toast.success(`🌟 Đã mint ${result.amount} FUN Money thành công!`);
        }
        
        return result;
      } else {
        throw new Error(response.data?.error || 'Mint failed');
      }
    } catch (err) {
      console.error('[useMintFun] Error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      
      if (message.includes('Daily mint cap')) {
        toast.error('Đã đạt giới hạn mint hàng ngày. Quay lại vào ngày mai nhé! 🌙');
      } else if (message.includes('No wallet')) {
        toast.error('Vui lòng thiết lập ví trước khi mint');
      } else if (message.includes('No eligible actions')) {
        toast.error('Không có action nào đủ điều kiện mint');
      } else {
        toast.error(`Mint thất bại: ${message}`);
      }
      return null;
    } finally {
      setIsMinting(false);
    }
  };

  // Check status of a mint request
  const checkMintStatus = async (mintRequestId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('pplp_mint_requests')
        .select('status, tx_hash')
        .eq('id', mintRequestId)
        .single();

      if (error) throw error;
      return data?.status || null;
    } catch (err) {
      console.error('[useMintFun] checkMintStatus error:', err);
      return null;
    }
  };

  return {
    mintPendingActions,
    checkMintStatus,
    isMinting,
    lastMint,
  };
};
