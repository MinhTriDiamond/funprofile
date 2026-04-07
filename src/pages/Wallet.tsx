import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PullToRefreshContainer } from '@/components/common/PullToRefreshContainer';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import WalletProviders from '@/components/wallet/WalletProviders';

const Wallet = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['fun-balance'] });
    await queryClient.invalidateQueries({ queryKey: ['donation-history'] });
    await queryClient.invalidateQueries({ queryKey: ['light-reputation'] });
    await queryClient.invalidateQueries({ queryKey: ['token-balances'] });
    await queryClient.invalidateQueries({ queryKey: ['transaction-history'] });
  }, [queryClient]);

  return (
    <div className="min-h-screen overflow-hidden pb-20 lg:pb-0">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        <PullToRefreshContainer onRefresh={handlePullRefresh}>
          <div className="w-full px-4 sm:px-6 lg:px-[2cm] py-6">
            <div className="max-w-6xl mx-auto">
              <WalletProviders />
            </div>
          </div>
        </PullToRefreshContainer>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Wallet;
