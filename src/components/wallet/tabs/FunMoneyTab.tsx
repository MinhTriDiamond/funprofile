import { FunBalanceCard } from '../FunBalanceCard';
import { ClaimRewardsCard } from '../ClaimRewardsCard';
import { LightScoreDashboard } from '../LightScoreDashboard';

interface FunMoneyTabProps {
  externalAddress?: `0x${string}`;
  onActivate: () => void;
  onClaim: () => void;
  onClaimSuccess: () => void;
}

export function FunMoneyTab({
  externalAddress,
  onActivate,
  onClaim,
  onClaimSuccess,
}: FunMoneyTabProps) {
  return (
    <div className="space-y-4">
      {/* PPLP Light Score Dashboard */}
      <LightScoreDashboard />

      {/* FUN Money Balance Card */}
      {externalAddress && (
        <FunBalanceCard
          walletAddress={externalAddress}
          onActivate={onActivate}
          onClaim={onClaim}
        />
      )}

      {/* Claim FUN Rewards Card */}
      <ClaimRewardsCard onClaimSuccess={onClaimSuccess} />
    </div>
  );
}
