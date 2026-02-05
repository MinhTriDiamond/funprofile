 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { TIERS, PILLARS } from '@/config/pplp';
 
 export interface LightScoreData {
   user_id: string;
   total_light_score: number;
   tier: number;
   tier_name: string;
   daily_cap: number;
   today_minted: number;
   total_minted: number;
   actions_count: number;
   pending_count: number;
   pending_amount: number;
   pillars: {
     service: number;
     truth: number;
     healing: number;
     value: number;
     unity: number;
   };
   averages: {
     quality: number;
     impact: number;
     integrity: number;
     unity: number;
   };
   recent_actions: Array<{
     id: string;
     action_type: string;
     light_score: number;
     mint_status: string;
     mint_amount: number;
     content_preview: string | null;
     created_at: string;
   }>;
   last_action_at: string | null;
   last_mint_at: string | null;
   epoch?: {
     epoch_date: string;
     total_minted: number;
     total_cap: number;
   };
 }
 
 export const useLightScore = () => {
   const [data, setData] = useState<LightScoreData | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   const fetchLightScore = useCallback(async () => {
     try {
       setIsLoading(true);
       setError(null);
 
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         setError('Not authenticated');
         return;
       }
 
       const response = await supabase.functions.invoke('pplp-get-score', {
         headers: {
           Authorization: `Bearer ${session.access_token}`,
         },
       });
 
       if (response.error) {
         throw new Error(response.error.message);
       }
 
       if (response.data?.success) {
         setData(response.data.data);
       } else {
         throw new Error(response.data?.error || 'Failed to fetch light score');
       }
     } catch (err) {
       console.error('[useLightScore] Error:', err);
       setError(err instanceof Error ? err.message : 'Unknown error');
     } finally {
       setIsLoading(false);
     }
   }, []);
 
   useEffect(() => {
     fetchLightScore();
   }, [fetchLightScore]);
 
   // Helper to get tier info
   const getTierInfo = () => {
     if (!data) return TIERS[0];
     return TIERS[data.tier as keyof typeof TIERS] || TIERS[0];
   };
 
   // Helper to get progress to next tier
   const getNextTierProgress = () => {
     if (!data) return { progress: 0, nextTier: TIERS[1], remaining: 1000 };
     
     const currentTier = data.tier;
     const currentScore = data.total_light_score;
     
     if (currentTier >= 3) {
       return { progress: 100, nextTier: TIERS[3], remaining: 0 };
     }
     
     const nextTier = TIERS[(currentTier + 1) as keyof typeof TIERS];
     const currentTierMin = TIERS[currentTier as keyof typeof TIERS].minScore;
     const nextTierMin = nextTier.minScore;
     
     const progress = ((currentScore - currentTierMin) / (nextTierMin - currentTierMin)) * 100;
     const remaining = nextTierMin - currentScore;
     
     return { 
       progress: Math.min(100, Math.max(0, progress)), 
       nextTier, 
       remaining: Math.max(0, remaining) 
     };
   };
 
   return {
     data,
     isLoading,
     error,
     refetch: fetchLightScore,
     getTierInfo,
     getNextTierProgress,
     TIERS,
     PILLARS,
   };
 };