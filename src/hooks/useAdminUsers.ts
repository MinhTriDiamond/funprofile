import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";

export interface AdminUserData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  pending_reward: number;
  approved_reward: number;
  wallet_address: string | null;
  reward_status: string;
  created_at: string;
  bio?: string | null;
  posts_count?: number;
  comments_count?: number;
  reactions_count?: number;
}

const fetchAdminUsers = async (): Promise<AdminUserData[]> => {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!profiles) return [];

  const { data: rewardsData } = await supabase.rpc("get_user_rewards", { limit_count: 500 });
  const rewardsMap = new Map(rewardsData?.map((r: any) => [r.id, r]) || []);

  return profiles.map((profile) => {
    const rewardInfo = rewardsMap.get(profile.id) as any;
    return {
      ...profile,
      pending_reward: profile.pending_reward || 0,
      approved_reward: profile.approved_reward || 0,
      wallet_address: profile.wallet_address || null,
      reward_status: profile.reward_status || "pending",
      posts_count: rewardInfo?.posts_count || 0,
      comments_count: rewardInfo?.comments_count || 0,
      reactions_count: rewardInfo?.reactions_count || 0,
    };
  });
};

export const ADMIN_USERS_KEY = ["admin-users"];

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: fetchAdminUsers,
    staleTime: 2 * 60 * 1000,
  });
};

export const invalidateAdminData = () => {
  queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
};
