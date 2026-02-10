import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DonationRecord {
  id: string;
  sender: { id: string; username: string; avatar_url: string | null };
  recipient: { id: string; username: string; avatar_url: string | null };
  amount: string;
  token_symbol: string;
  message: string | null;
  tx_hash: string;
  light_score_earned: number | null;
  created_at: string;
  status: string;
  card_theme?: string | null;
  card_background?: string | null;
  card_sound?: string | null;
}

export function useDonationHistory(type: 'sent' | 'received') {
  return useQuery({
    queryKey: ['donation-history', type],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const userId = session.user.id;

      // Query donations with sender and recipient profiles
      const { data, error } = await supabase
        .from('donations')
        .select(`
          id,
          amount,
          token_symbol,
          message,
          tx_hash,
          light_score_earned,
          created_at,
          status,
          card_theme,
          card_background,
          card_sound,
          sender:profiles!donations_sender_id_fkey(id, username, avatar_url),
          recipient:profiles!donations_recipient_id_fkey(id, username, avatar_url)
        `)
        .eq(type === 'sent' ? 'sender_id' : 'recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform data to expected format
      return (data || []).map((d: any) => ({
        id: d.id,
        sender: d.sender,
        recipient: d.recipient,
        amount: d.amount,
        token_symbol: d.token_symbol,
        message: d.message,
        tx_hash: d.tx_hash,
        light_score_earned: d.light_score_earned,
        created_at: d.created_at,
        status: d.status,
        card_theme: d.card_theme,
        card_background: d.card_background,
        card_sound: d.card_sound,
      })) as DonationRecord[];
    },
    staleTime: 30000,
  });
}

// Hook to get total stats
export function useDonationStats() {
  return useQuery({
    queryKey: ['donation-stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const userId = session.user.id;

      // Get sent donations
      const { data: sentData } = await supabase
        .from('donations')
        .select('amount, token_symbol')
        .eq('sender_id', userId);

      // Get received donations
      const { data: receivedData } = await supabase
        .from('donations')
        .select('amount, token_symbol')
        .eq('recipient_id', userId);

      // Group by token
      const sentByToken: Record<string, number> = {};
      const receivedByToken: Record<string, number> = {};

      sentData?.forEach(d => {
        const amount = parseFloat(d.amount) || 0;
        sentByToken[d.token_symbol] = (sentByToken[d.token_symbol] || 0) + amount;
      });

      receivedData?.forEach(d => {
        const amount = parseFloat(d.amount) || 0;
        receivedByToken[d.token_symbol] = (receivedByToken[d.token_symbol] || 0) + amount;
      });

      return {
        sent: sentByToken,
        received: receivedByToken,
        totalSentCount: sentData?.length || 0,
        totalReceivedCount: receivedData?.length || 0,
      };
    },
    staleTime: 30000,
  });
}
