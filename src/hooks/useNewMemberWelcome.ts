import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useNewMemberWelcome() {
  useEffect(() => {
    const channel = supabase
      .channel('new-member-welcome')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const profile = payload.new as {
            username?: string;
            full_name?: string;
            avatar_url?: string;
          };
          const name = profile.full_name || profile.username || 'Thành viên mới';

          toast(
            `🎉 ${name} đã tham gia Fun.Rich!`,
            {
              description: 'Chào mừng thành viên mới!',
              duration: 60000,
              position: 'bottom-right',
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
