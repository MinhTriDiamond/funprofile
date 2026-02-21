import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignTypedData, useChainId, useSwitchChain } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  EIP712_DOMAIN,
  EIP712_PPLP_TYPES,
  GOV_GROUPS,
  GovGroupKey,
  MultisigSignatures,
  GovSignature,
  getGovGroupForAddress,
  getGovMemberName,
  ALL_GOV_ADDRESSES,
  MINT_REQUEST_STATUS,
} from '@/config/pplp';

export interface AttesterMintRequest {
  id: string;
  user_id: string;
  recipient_address: string;
  amount_wei: string;
  amount_display: number;
  evidence_hash: string;
  action_types: string[];
  action_name: string;
  action_hash: string | null;
  nonce: number;
  status: string;
  multisig_signatures: MultisigSignatures | null;
  multisig_required_groups: string[] | null;
  multisig_completed_groups: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined
  profiles?: { username: string; avatar_url: string | null } | null;
}

export interface UseAttesterSigningResult {
  // State
  isAttester: boolean;
  attesterGroup: GovGroupKey | null;
  attesterName: string | null;
  requests: AttesterMintRequest[];
  isLoading: boolean;
  isSigning: boolean;
  // Actions
  signRequest: (requestId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const useAttesterSigning = (connectedAddress?: string): UseAttesterSigningResult => {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const effectiveAddress = connectedAddress || address;

  // Detect if connected wallet is a GOV attester
  const attesterGroup = effectiveAddress ? getGovGroupForAddress(effectiveAddress) : null;
  const attesterName = effectiveAddress ? getGovMemberName(effectiveAddress) : null;
  const isAttester = !!attesterGroup;

  const [requests, setRequests] = useState<AttesterMintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Fetch pending/signing requests
  const fetchRequests = useCallback(async () => {
    if (!isAttester) { setRequests([]); return; }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pplp_mint_requests')
        .select('*')
        .in('status', ['signing', 'signed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      setRequests((data || []).map(r => ({
        ...r,
        multisig_signatures: (r.multisig_signatures as MultisigSignatures) ?? null,
        profiles: profileMap.get(r.user_id) || null,
      })));
    } catch (err) {
      console.error('[useAttesterSigning] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAttester]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!isAttester) return;

    fetchRequests();

    const channel = supabase
      .channel('attester-mint-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pplp_mint_requests',
        },
        () => {
          // Refetch on any change
          fetchRequests();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAttester, fetchRequests]);

  // Sign a request
  const signRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!isConnected || !effectiveAddress || !attesterGroup) {
      toast.error('Vui lòng kết nối ví GOV trước');
      return false;
    }

    const request = requests.find(r => r.id === requestId);
    if (!request) {
      toast.error('Không tìm thấy request');
      return false;
    }

    // Check if group already signed
    const currentSigs: MultisigSignatures = request.multisig_signatures ?? {};
    if (currentSigs[attesterGroup]) {
      toast.warning(`Nhóm ${GOV_GROUPS[attesterGroup].nameVi} đã ký request này rồi!`);
      return false;
    }

    // Ensure BSC Testnet
    if (chainId !== 97) {
      try {
        toast.info('Đang chuyển sang BSC Testnet...');
        await switchChainAsync({ chainId: 97 });
      } catch {
        toast.error('Không thể chuyển sang BSC Testnet');
        return false;
      }
    }

    setIsSigning(true);
    try {
      if (!request.action_hash) {
        toast.error('Request thiếu action_hash');
        return false;
      }

      const message = {
        user: request.recipient_address as `0x${string}`,
        actionHash: request.action_hash as `0x${string}`,
        amount: BigInt(request.amount_wei),
        evidenceHash: request.evidence_hash as `0x${string}`,
        nonce: BigInt(request.nonce),
      };

      const signature = await signTypedDataAsync({
        account: effectiveAddress as `0x${string}`,
        types: EIP712_PPLP_TYPES,
        primaryType: 'PureLoveProof',
        message,
        domain: {
          name: EIP712_DOMAIN.name,
          version: EIP712_DOMAIN.version,
          chainId: EIP712_DOMAIN.chainId,
          verifyingContract: EIP712_DOMAIN.verifyingContract,
        },
      });

      // Update DB
      const newSigs: MultisigSignatures = {
        ...currentSigs,
        [attesterGroup]: {
          signer: effectiveAddress,
          signature,
          signed_at: new Date().toISOString(),
          signer_name: attesterName,
        },
      };

      const completedGroups = Object.keys(newSigs) as GovGroupKey[];
      const isFullySigned = completedGroups.length === 3;

      const { error: updateError } = await supabase
        .from('pplp_mint_requests')
        .update({
          multisig_signatures: newSigs as any,
          multisig_completed_groups: completedGroups,
          signature: isFullySigned ? signature : (request.multisig_signatures?.will?.signature ?? null),
          signed_by: effectiveAddress,
          signed_at: new Date().toISOString(),
          status: isFullySigned ? MINT_REQUEST_STATUS.SIGNED : 'signing',
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      if (isFullySigned) {
        toast.success('🎉 Đủ 3 chữ ký GOV! Request sẵn sàng Submit.');
      } else {
        toast.success(`${GOV_GROUPS[attesterGroup].emoji} Nhóm ${GOV_GROUPS[attesterGroup].nameVi} đã ký! Cần thêm ${3 - completedGroups.length} nhóm.`);
      }

      return true;
    } catch (err: any) {
      if (err.message?.includes('User rejected')) {
        toast.error('Đã từ chối ký');
      } else {
        toast.error(`Lỗi ký: ${err.message}`);
      }
      return false;
    } finally {
      setIsSigning(false);
    }
  }, [isConnected, effectiveAddress, attesterGroup, attesterName, requests, chainId, switchChainAsync, signTypedDataAsync]);

  return {
    isAttester,
    attesterGroup,
    attesterName,
    requests,
    isLoading,
    isSigning,
    signRequest,
    refetch: fetchRequests,
  };
};
