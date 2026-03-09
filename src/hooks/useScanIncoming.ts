import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function useScanIncoming() {
  const [isScanning, setIsScanning] = useState(false);
  const lastScanRef = useRef<number>(0);
  const queryClient = useQueryClient();

  const scan = useCallback(async () => {
    const now = Date.now();
    const elapsed = now - lastScanRef.current;
    if (elapsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
      toast.info(`Vui lòng chờ ${remaining} phút trước khi quét lại`);
      return;
    }

    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('scan-my-incoming');

      if (error) {
        toast.error('Lỗi khi quét giao dịch');
        console.error('scan-my-incoming error:', error);
        return;
      }

      lastScanRef.current = Date.now();
      const result = data as { newTransfers: number; message: string };

      if (result.newTransfers > 0) {
        toast.success(result.message);
        // Refresh donation history
        await queryClient.invalidateQueries({ queryKey: ['donation-history'] });
        await queryClient.invalidateQueries({ queryKey: ['donation-stats'] });
        await queryClient.invalidateQueries({ queryKey: ['admin-donation-history'] });
      } else {
        toast.info(result.message || 'Không có giao dịch mới');
      }
    } catch (err) {
      console.error('scan-my-incoming error:', err);
      toast.error('Lỗi khi quét giao dịch');
    } finally {
      setIsScanning(false);
    }
  }, [queryClient]);

  return { scan, isScanning };
}
