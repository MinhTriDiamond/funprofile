 import { useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export interface MintResult {
   success: boolean;
   amount: number;
   wallet: string;
   actions_count: number;
   mint_data?: {
     to: string;
     amount: string;
     nonce: number;
     deadline: number;
     contract: string;
     chainId: number;
   };
 }
 
 export const useMintFun = () => {
   const [isMinting, setIsMinting] = useState(false);
   const [lastMint, setLastMint] = useState<MintResult | null>(null);
 
   const mintPendingActions = async (actionIds: string[]): Promise<MintResult | null> => {
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
         const result: MintResult = {
           success: true,
           amount: response.data.mint.amount,
           wallet: response.data.mint.wallet,
           actions_count: response.data.mint.actions_count,
           mint_data: response.data.mint.mint_data,
         };
         
         setLastMint(result);
         toast.success(`🌟 Đã mint ${result.amount} FUN Money thành công!`);
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
       } else {
         toast.error(`Mint thất bại: ${message}`);
       }
       return null;
     } finally {
       setIsMinting(false);
     }
   };
 
   return {
     mintPendingActions,
     isMinting,
     lastMint,
   };
 };