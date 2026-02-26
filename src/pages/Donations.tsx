import { lazy, Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PullToRefreshContainer } from '@/components/common/PullToRefreshContainer';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const SystemDonationHistory = lazy(() => import('@/components/donations/SystemDonationHistory').then(m => ({ default: m.SystemDonationHistory })));

export default function Donations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Allow guest access - donations are public on-chain data
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-donation-history'] });
  }, [queryClient]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // isAuthenticated can be false (guest) or true (logged in) - both render the page

  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        <PullToRefreshContainer onRefresh={handlePullRefresh}>
          <div className="container max-w-5xl mx-auto px-4 py-6">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }>
              <SystemDonationHistory />
            </Suspense>
          </div>
        </PullToRefreshContainer>
      </main>
      <MobileBottomNav />
    </div>
  );
}
