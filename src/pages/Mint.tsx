import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MintHeader } from '@/components/mint/MintHeader';
import { MintGuide } from '@/components/mint/MintGuide';
import { MintOnChainPanel } from '@/components/mint/MintOnChainPanel';
import { LightActionsList } from '@/components/mint/LightActionsList';

const Mint = () => {
  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      <main className="pt-14 pb-20 md:pb-8 px-4 max-w-7xl mx-auto">
        <div className="space-y-6 py-6">
          {/* Header + Warning */}
          <MintHeader />

          {/* Guide */}
          <MintGuide />

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: On-Chain Balance */}
            <MintOnChainPanel />

            {/* Right: Light Actions */}
            <LightActionsList />
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Mint;
