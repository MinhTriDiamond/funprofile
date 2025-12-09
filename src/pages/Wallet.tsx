import { lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/web3";
import "@rainbow-me/rainbowkit/styles.css";

// Lazy load the wallet container - only loaded when user visits Wallet page
const WalletCenterContainer = lazy(() => import('@/components/wallet/WalletCenterContainer'));

// Loading fallback for wallet content
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

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <FacebookNavbar />
      <main className="pt-14">
        {/* Full width center container */}
        <div className="w-full px-4 py-6">
          <div className="max-w-3xl lg:max-w-4xl mx-auto">
            {/* Web3 providers only loaded here, not globally */}
            <WagmiProvider config={config}>
              <RainbowKitProvider>
                <Suspense fallback={<WalletLoader />}>
                  <WalletCenterContainer />
                </Suspense>
              </RainbowKitProvider>
            </WagmiProvider>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Wallet;
