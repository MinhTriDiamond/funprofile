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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
      }
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
            sender_id: string | null;
            sender_address?: string | null;
            is_external?: boolean;
            message?: string | null;
            tx_hash: string;
            created_at: string;
          };

          // Fetch sender profile (if sender_id exists)
          let senderProfile: any = null;
          if (donation.sender_id) {
            const { data } = await supabase
              .from('profiles')
              .select('full_name, display_name, username, avatar_url')
              .eq('id', donation.sender_id)
              .single();
            senderProfile = data;
          }

          const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
          const senderUsername = senderProfile?.username || 
                                 senderProfile?.full_name || 
                                 (donation.sender_address ? shortenAddr(donation.sender_address) : 'Ví ngoài');
          const senderDisplayName = senderProfile?.display_name || senderProfile?.full_name || senderUsername;

          // Fetch recipient (current user) profile
          const { data: recipientProfile } = await supabase
            .from('profiles')
            .select('full_name, display_name, username, avatar_url')
            .eq('id', userId)
            .single();

          setReceivedDonation({
            id: donation.id,
            amount: donation.amount,
            tokenSymbol: donation.token_symbol,
            senderUsername,
            senderDisplayName,
            senderAvatarUrl: senderProfile?.avatar_url,
            senderId: donation.sender_id || '',
            recipientUsername: recipientProfile?.username || 'Bạn',
            recipientDisplayName: recipientProfile?.display_name || recipientProfile?.full_name,
            recipientAvatarUrl: recipientProfile?.avatar_url,
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
