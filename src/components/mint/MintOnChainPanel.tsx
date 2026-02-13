import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FunBalanceCard } from '@/components/wallet/FunBalanceCard';
import { ActivateDialog } from '@/components/wallet/ActivateDialog';
import { ClaimFunDialog } from '@/components/wallet/ClaimFunDialog';
import { useFunBalance } from '@/hooks/useFunBalance';
import { supabase } from '@/integrations/supabase/client';
import { Coins, ArrowRight } from 'lucide-react';

export const MintOnChainPanel = () => {
  const { address } = useAccount();
  const { locked, activated, refetch } = useFunBalance();
  const [showActivate, setShowActivate] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [publicWallet, setPublicWallet] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    const fetchWallet = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('public_wallet_address')
        .eq('id', user.id)
        .single();
      if (data?.public_wallet_address) {
        setPublicWallet(data.public_wallet_address as `0x${string}`);
      }
    };
    fetchWallet();
  }, []);

  const walletAddress = address || publicWallet;

  return (
    <div className="space-y-4">
      <FunBalanceCard
        walletAddress={walletAddress}
        onActivate={() => setShowActivate(true)}
        onClaim={() => setShowClaim(true)}
      />

      {/* How it works */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Cách thức hoạt động
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Hoạt động trên nền tảng (đăng bài, bình luận, tặng quà...)' },
              { step: '2', text: 'Angel AI đánh giá theo 5 cột trụ Ánh Sáng' },
              { step: '3', text: 'Admin ký duyệt EIP-712 → Token được LOCKED trên hợp đồng' },
              { step: '4', text: 'Bạn ACTIVATE token (Locked → Activated)' },
              { step: '5', text: 'Bạn CLAIM token về ví cá nhân (Activated → Flowing)' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {step}
                </div>
                <p className="text-sm text-muted-foreground pt-1">{text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ActivateDialog
        open={showActivate}
        onOpenChange={setShowActivate}
        onSuccess={refetch}
        lockedBalance={locked}
      />
      <ClaimFunDialog
        open={showClaim}
        onOpenChange={setShowClaim}
        onSuccess={refetch}
        activatedBalance={activated}
      />
    </div>
  );
};
