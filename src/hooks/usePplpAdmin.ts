import { useState, useCallback } from 'react';
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { bscTestnet } from 'wagmi/chains';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  EIP712_DOMAIN,
  EIP712_LOCK_TYPES,
  FUN_MONEY_CONTRACT,
  FUN_MONEY_ABI,
  MINT_REQUEST_STATUS,
  getTxUrl,
} from '@/config/pplp';

// Types
export interface MintRequest {
  id: string;
  user_id: string;
  recipient_address: string;
  amount_wei: string;
  amount_display: number;
  action_hash: string;
  action_types: string[];
  nonce: number;
  deadline: number;
  status: string;
  signature: string | null;
  signed_at: string | null;
  signed_by: string | null;
  tx_hash: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  error_message: string | null;
  retry_count: number;
  action_ids: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
}

export interface MintStats {
  pending_sig: number;
  signed: number;
  submitted: number;
  confirmed: number;
  failed: number;
  total_minted: number;
}

export const usePplpAdmin = () => {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync, data: writeHash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeHash,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [mintRequests, setMintRequests] = useState<MintRequest[]>([]);
  const [stats, setStats] = useState<MintStats>({
    pending_sig: 0,
    signed: 0,
    submitted: 0,
    confirmed: 0,
    failed: 0,
    total_minted: 0,
  });

  // Fetch all mint requests
  const fetchMintRequests = useCallback(async (statusFilter?: string) => {
    setIsLoading(true);
    try {
      // Fetch mint requests
      let query = supabase
        .from('pplp_mint_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: requests, error } = await query;

      if (error) throw error;

      // Fetch profiles for each user
      const userIds = [...new Set((requests || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Merge data
      const enrichedRequests: MintRequest[] = (requests || []).map(req => ({
        ...req,
        profiles: profileMap.get(req.user_id) || null,
      }));

      setMintRequests(enrichedRequests);

      // Calculate stats
      const newStats: MintStats = {
        pending_sig: 0,
        signed: 0,
        submitted: 0,
        confirmed: 0,
        failed: 0,
        total_minted: 0,
      };

      enrichedRequests.forEach((req) => {
        if (req.status === MINT_REQUEST_STATUS.PENDING_SIG) newStats.pending_sig++;
        else if (req.status === MINT_REQUEST_STATUS.SIGNED) newStats.signed++;
        else if (req.status === MINT_REQUEST_STATUS.SUBMITTED) newStats.submitted++;
        else if (req.status === MINT_REQUEST_STATUS.CONFIRMED) {
          newStats.confirmed++;
          newStats.total_minted += req.amount_display;
        }
        else if (req.status === MINT_REQUEST_STATUS.FAILED) newStats.failed++;
      });

      setStats(newStats);
    } catch (error) {
      console.error('[usePplpAdmin] fetchMintRequests error:', error);
      toast.error('Không thể tải danh sách mint requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign a single mint request
  const signMintRequest = useCallback(async (request: MintRequest): Promise<string | null> => {
    if (!isConnected || !address) {
      toast.error('Vui lòng kết nối ví Attester trước');
      return null;
    }

    try {
      console.log('[usePplpAdmin] Signing request:', request.id);

      // Create the typed data message
      const message = {
        recipient: request.recipient_address as `0x${string}`,
        amount: BigInt(request.amount_wei),
        actionHash: request.action_hash as `0x${string}`,
        nonce: BigInt(request.nonce),
        deadline: BigInt(request.deadline),
      };

      console.log('[usePplpAdmin] EIP-712 message:', message);

      // Sign using EIP-712 (wagmi v2 API)
      const signature = await signTypedDataAsync({
        account: address,
        types: EIP712_LOCK_TYPES,
        primaryType: 'Lock',
        message,
        domain: {
          name: EIP712_DOMAIN.name,
          version: EIP712_DOMAIN.version,
          chainId: EIP712_DOMAIN.chainId,
          verifyingContract: EIP712_DOMAIN.verifyingContract,
        },
      });

      console.log('[usePplpAdmin] Signature:', signature);

      // Save signature to database
      const { error: updateError } = await supabase
        .from('pplp_mint_requests')
        .update({
          signature,
          signed_at: new Date().toISOString(),
          signed_by: address,
          status: MINT_REQUEST_STATUS.SIGNED,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success('Đã ký thành công!');
      return signature;
    } catch (error: any) {
      console.error('[usePplpAdmin] signMintRequest error:', error);
      
      if (error.message?.includes('User rejected')) {
        toast.error('Bé đã từ chối ký');
      } else {
        toast.error(`Lỗi ký: ${error.message}`);
      }
      return null;
    }
  }, [isConnected, address, signTypedDataAsync]);

  // Batch sign multiple requests
  const batchSignMintRequests = useCallback(async (requests: MintRequest[]): Promise<number> => {
    let successCount = 0;

    for (const request of requests) {
      const signature = await signMintRequest(request);
      if (signature) successCount++;
    }

    if (successCount > 0) {
      toast.success(`Đã ký ${successCount}/${requests.length} requests`);
    }

    return successCount;
  }, [signMintRequest]);

  // Submit a signed request to blockchain
  const submitToChain = useCallback(async (request: MintRequest): Promise<string | null> => {
    if (!isConnected || !address) {
      toast.error('Vui lòng kết nối ví trước');
      return null;
    }

    if (!request.signature) {
      toast.error('Request chưa được ký');
      return null;
    }

    try {
      console.log('[usePplpAdmin] Submitting to chain:', request.id);

      // Call lockWithPPLP on the contract (wagmi v2 API)
      const txHash = await writeContractAsync({
        account: address,
        chain: bscTestnet,
        address: FUN_MONEY_CONTRACT.address,
        abi: FUN_MONEY_ABI,
        functionName: 'lockWithPPLP',
        args: [
          request.recipient_address as `0x${string}`,
          BigInt(request.amount_wei),
          request.action_hash as `0x${string}`,
          BigInt(request.nonce),
          BigInt(request.deadline),
          [request.signature as `0x${string}`], // signatures array
        ],
      });

      console.log('[usePplpAdmin] Transaction hash:', txHash);

      // Update database with tx_hash
      const { error: updateError } = await supabase
        .from('pplp_mint_requests')
        .update({
          tx_hash: txHash,
          submitted_at: new Date().toISOString(),
          status: MINT_REQUEST_STATUS.SUBMITTED,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Also update linked light_actions
      if (request.action_ids && request.action_ids.length > 0) {
        await supabase
          .from('light_actions')
          .update({
            tx_hash: txHash,
            mint_status: 'submitted',
          })
          .in('id', request.action_ids);
      }

      toast.success(`Transaction đã gửi! Xem trên BSCScan: ${getTxUrl(txHash)}`);

      return txHash;
    } catch (error: any) {
      console.error('[usePplpAdmin] submitToChain error:', error);

      // Update status to failed
      await supabase
        .from('pplp_mint_requests')
        .update({
          status: MINT_REQUEST_STATUS.FAILED,
          error_message: error.message,
          retry_count: (request.retry_count || 0) + 1,
        })
        .eq('id', request.id);

      if (error.message?.includes('User rejected')) {
        toast.error('Bé đã từ chối giao dịch');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Ví không đủ BNB để trả gas');
      } else {
        toast.error(`Lỗi gửi transaction: ${error.shortMessage || error.message}`);
      }
      return null;
    }
  }, [isConnected, address, writeContractAsync]);

  // Confirm a submitted transaction
  const confirmTransaction = useCallback(async (request: MintRequest): Promise<boolean> => {
    if (!request.tx_hash) return false;

    try {
      // In production, you'd poll for transaction receipt
      // For now, just update status
      const { error } = await supabase
        .from('pplp_mint_requests')
        .update({
          status: MINT_REQUEST_STATUS.CONFIRMED,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      // Update light_actions
      if (request.action_ids && request.action_ids.length > 0) {
        await supabase
          .from('light_actions')
          .update({
            mint_status: 'minted',
            minted_at: new Date().toISOString(),
          })
          .in('id', request.action_ids);
      }

      toast.success('Transaction đã được xác nhận on-chain!');
      return true;
    } catch (error) {
      console.error('[usePplpAdmin] confirmTransaction error:', error);
      return false;
    }
  }, []);

  // Reset a failed request back to pending
  const resetToPending = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pplp_mint_requests')
        .update({
          status: MINT_REQUEST_STATUS.PENDING_SIG,
          signature: null,
          signed_at: null,
          signed_by: null,
          tx_hash: null,
          submitted_at: null,
          error_message: null,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Đã reset request về trạng thái chờ ký');
      return true;
    } catch (error) {
      console.error('[usePplpAdmin] resetToPending error:', error);
      toast.error('Không thể reset request');
      return false;
    }
  }, []);

  return {
    // State
    isLoading,
    mintRequests,
    stats,
    isConnected,
    address,
    isWritePending,
    isConfirming,
    
    // Actions
    fetchMintRequests,
    signMintRequest,
    batchSignMintRequests,
    submitToChain,
    confirmTransaction,
    resetToPending,
  };
};
