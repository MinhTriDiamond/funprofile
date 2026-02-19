import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SCAN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'last-incoming-scan';

export function useIncomingTransferDetector() {
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;

    const lastScan = localStorage.getItem(STORAGE_KEY);
    if (lastScan && Date.now() - parseInt(lastScan) < SCAN_INTERVAL_MS) {
      return;
    }

    hasRun.current = true;

    const detect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke('detect-incoming-transfers', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        localStorage.setItem(STORAGE_KEY, Date.now().toString());

        if (error) {
          console.warn('Incoming transfer detection failed:', error);
          return;
        }

        if (data?.newTransfers > 0) {
          toast.success(`Phát hiện ${data.newTransfers} giao dịch mới từ ví bên ngoài!`, {
            duration: 5000,
          });
          queryClient.invalidateQueries({ queryKey: ['donation-history'] });
          queryClient.invalidateQueries({ queryKey: ['donation-stats'] });
          queryClient.invalidateQueries({ queryKey: ['token-balances'] });
        }
      } catch (err) {
        console.warn('Incoming transfer detector error:', err);
      }
    };

    detect();
  }, [queryClient]);
}
