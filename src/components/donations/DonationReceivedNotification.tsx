import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DonationReceivedCard, DonationReceivedData } from './DonationReceivedCard';

export const DonationReceivedNotification = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [receivedDonation, setReceivedDonation] = useState<DonationReceivedData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to donations
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`donation-received-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'donations',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const donation = payload.new as {
            id: string;
            amount: string;
            token_symbol: string;
            sender_id: string;
            message?: string | null;
            tx_hash: string;
            created_at: string;
          };

          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', donation.sender_id)
            .single();

          const senderUsername = senderProfile?.username || 
                                 senderProfile?.full_name || 
                                 `User ${donation.sender_id.slice(0, 6)}`;

          setReceivedDonation({
            id: donation.id,
            amount: donation.amount,
            tokenSymbol: donation.token_symbol,
            senderUsername,
            senderAvatarUrl: senderProfile?.avatar_url,
            senderId: donation.sender_id,
            message: donation.message,
            txHash: donation.tx_hash,
            createdAt: donation.created_at,
          });
          setIsOpen(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleClose = () => {
    setIsOpen(false);
    setReceivedDonation(null);
  };

  if (!receivedDonation) return null;

  return (
    <DonationReceivedCard
      isOpen={isOpen}
      onClose={handleClose}
      data={receivedDonation}
    />
  );
};
