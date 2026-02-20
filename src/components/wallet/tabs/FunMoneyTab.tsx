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
}: FunMoneyTabProps) {
  return (
    <LightScoreDashboard
      walletAddress={externalAddress}
      onActivate={onActivate}
      onClaim={onClaim}
    />
  );
}
