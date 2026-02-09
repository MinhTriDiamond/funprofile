import { lazy, Suspense, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PullToRefreshContainer } from '@/components/common/PullToRefreshContainer';

// Lazy load ALL Web3 dependencies via wrapper - this ensures wagmi/rainbowkit/viem
// are only downloaded when user actually visits the Wallet page
const WalletProviders = lazy(() => import('@/components/wallet/WalletProviders'));

// Loading fallback
const WalletLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground">Đang tải ví...</p>
    </div>
  </div>
);

const Wallet = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['fun-balance'] });
    await queryClient.invalidateQueries({ queryKey: ['donation-history'] });
    await queryClient.invalidateQueries({ queryKey: ['light-reputation'] });
  }, [queryClient]);

  return (
    <div className="min-h-screen overflow-hidden pb-20 lg:pb-0">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        <PullToRefreshContainer onRefresh={handlePullRefresh}>
          {/* Full width center container */}
          <div className="w-full px-4 sm:px-6 lg:px-[2cm] py-6">
            <div className="max-w-6xl mx-auto">
              {/* Web3 providers lazy-loaded to prevent loading on non-wallet pages */}
              <Suspense fallback={<WalletLoader />}>
                <WalletProviders />
              </Suspense>
            </div>
          </div>
        </PullToRefreshContainer>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default Wallet;
